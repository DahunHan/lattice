import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir, stat, realpath } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import type { PipelineStatus, LiveAgentStatus, LogEntry, RunState } from '@/lib/types';

const LOG_LINE_PATTERN = /^\[([^\]]+)\]\s+\[(\w+)\]\s+(.+?)$/;
const PHASE_PATTERN = /---\s*Phase\s+[\d.]+:\s*(.+?)\s*---/;
const RUNNING_PATTERN = /Running:\s+(\w+\.py)/;
const SUCCESS_PATTERN = /(\w+\.py)\s+completed\s+successfully/;
// Matches: "agent.py failed", "agent.py returned deliberate HALT", "agent.py timed out", etc.
const FAILED_PATTERN = /(\w+\.py)\s+(?:failed|error|returned.*\bhalt\b|timeout|timed out|killed|crashed|aborted|interrupted)/i;
const PIPELINE_COMPLETE = /Pipeline (?:complete|finished|done)/i;
const PIPELINE_HALTED = /Pipeline (?:halted|stopped|aborted)/i;

function scriptToAgentId(script: string): string {
  return script.replace('.py', '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function parseLogLine(line: string): LogEntry | null {
  const match = line.match(LOG_LINE_PATTERN);
  if (!match) return null;

  const [, timestamp, level, message] = match;
  const validLevel = (['INFO', 'SUCCESS', 'WARN', 'ERROR'].includes(level) ? level : 'INFO') as LogEntry['level'];

  let agentId: string | undefined;
  const runMatch = message.match(RUNNING_PATTERN);
  const successMatch = message.match(SUCCESS_PATTERN);
  const failMatch = message.match(FAILED_PATTERN);

  if (runMatch) agentId = scriptToAgentId(runMatch[1]);
  else if (successMatch) agentId = scriptToAgentId(successMatch[1]);
  else if (failMatch) agentId = scriptToAgentId(failMatch[1]);

  return { timestamp, level: validLevel, message, agentId };
}

function buildAgentStatuses(logs: LogEntry[]): Record<string, LiveAgentStatus> {
  const statuses: Record<string, LiveAgentStatus> = {};
  let currentlyRunning: string | null = null;
  let pipelineComplete = false;

  for (const log of logs) {
    // Check for pipeline completion or halt
    if (PIPELINE_COMPLETE.test(log.message) || PIPELINE_HALTED.test(log.message)) {
      pipelineComplete = true;
    }

    if (!log.agentId) continue;
    const id = log.agentId;

    if (!statuses[id]) {
      statuses[id] = { state: 'idle', startedAt: null, completedAt: null, lastLog: null, durationMs: null };
    }

    const running = log.message.match(RUNNING_PATTERN);
    const success = log.message.match(SUCCESS_PATTERN);
    const failed = log.message.match(FAILED_PATTERN);

    if (running) {
      // If another agent was running and never completed, mark it as failed (skipped/blocked)
      if (currentlyRunning && currentlyRunning !== id && statuses[currentlyRunning]?.state === 'running') {
        statuses[currentlyRunning].state = 'failed';
        statuses[currentlyRunning].completedAt = log.timestamp;
        statuses[currentlyRunning].lastLog = 'Interrupted — next agent started before completion';
      }
      statuses[id].state = 'running';
      statuses[id].startedAt = log.timestamp;
      statuses[id].completedAt = null;
      statuses[id].lastLog = log.message;
      currentlyRunning = id;
    } else if (success) {
      statuses[id].state = 'success';
      statuses[id].completedAt = log.timestamp;
      statuses[id].lastLog = log.message;
      if (statuses[id].startedAt) {
        statuses[id].durationMs = new Date(log.timestamp).getTime() - new Date(statuses[id].startedAt!).getTime();
      }
      if (currentlyRunning === id) currentlyRunning = null;
    } else if (failed) {
      statuses[id].state = 'failed';
      statuses[id].completedAt = log.timestamp;
      statuses[id].lastLog = log.message;
      if (currentlyRunning === id) currentlyRunning = null;
    }
  }

  // If pipeline completed but some agents are still "running", mark them as failed
  if (pipelineComplete) {
    for (const [, status] of Object.entries(statuses)) {
      if (status.state === 'running') {
        status.state = 'failed';
        status.lastLog = 'Pipeline completed but agent never finished';
      }
    }
  }

  return statuses;
}

async function findLatestLog(logsDir: string, pattern?: string): Promise<string | null> {
  if (!existsSync(logsDir)) return null;

  try {
    const files = await readdir(logsDir);

    // If a custom pattern is provided, use it; otherwise try common patterns
    let logFiles: string[];

    if (pattern) {
      // Custom pattern: e.g., "run_*.log" or "*.jsonl"
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$', 'i');
      logFiles = files.filter(f => regex.test(f));
    } else {
      // Auto-detect: try common log patterns in order of specificity
      logFiles = files.filter(f => f.startsWith('pipeline_') && f.endsWith('.log'));

      if (logFiles.length === 0) {
        logFiles = files.filter(f => f.startsWith('run_') && f.endsWith('.log'));
      }
      if (logFiles.length === 0) {
        logFiles = files.filter(f => f.endsWith('.log') && !f.startsWith('.'));
      }
      if (logFiles.length === 0) {
        logFiles = files.filter(f => f.endsWith('.jsonl'));
      }
    }

    if (logFiles.length === 0) return null;

    // Sort by name descending (most recent date-stamped file first)
    logFiles.sort().reverse();
    return join(logsDir, logFiles[0]);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // CSRF protection: only allow requests from localhost origins
    const origin = req.headers.get('origin');
    if (origin) {
      const url = new URL(origin);
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await req.json();
    const projectPath = body.path;
    const customLogDir: string | undefined = body.logDir;
    const customLogPattern: string | undefined = body.logPattern;

    if (!projectPath || typeof projectPath !== 'string') {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    const resolvedPath = resolve(projectPath);

    // Block sensitive system directories
    const BLOCKED_PATHS = ['/etc', '/var', '/proc', '/sys', '/root', '/boot',
      'C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)', 'C:\\ProgramData'];
    for (const blocked of BLOCKED_PATHS) {
      if (resolvedPath.toLowerCase().startsWith(blocked.toLowerCase())) {
        return NextResponse.json({ error: 'Access to system directories is not allowed' }, { status: 403 });
      }
    }

    if (!existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'Path does not exist' }, { status: 404 });
    }

    // Use the original path on Windows (resolve can mangle forward-slash paths)
    const basePath = existsSync(projectPath) ? projectPath : resolvedPath;

    // Resolve log directory: custom path > auto-discover > default 'logs'
    const logDirName = customLogDir ?? 'logs';
    const logsDir = join(basePath, logDirName);

    // If log dir doesn't exist, auto-discover — check immediate AND one level deep
    let effectiveLogsDir = logsDir;
    if (!existsSync(logsDir) && !customLogDir) {
      const candidates = ['logs', 'log', 'output', 'runs', '.logs', 'pipeline_logs'];
      let found = false;

      // Check immediate subdirectories first
      for (const candidate of candidates) {
        const candidatePath = join(basePath, candidate);
        if (existsSync(candidatePath)) {
          effectiveLogsDir = candidatePath;
          found = true;
          break;
        }
      }

      // If not found, check one level deeper (e.g., HailMary/logs/ inside HailMary/)
      if (!found) {
        try {
          const subdirs = await readdir(basePath, { withFileTypes: true });
          for (const sub of subdirs) {
            if (!sub.isDirectory() || sub.name.startsWith('.') || sub.name === 'node_modules') continue;
            for (const candidate of candidates) {
              const candidatePath = join(basePath, sub.name, candidate);
              if (existsSync(candidatePath)) {
                effectiveLogsDir = candidatePath;
                found = true;
                break;
              }
            }
            if (found) break;
          }
        } catch { /* ignore */ }
      }
    }

    const stateFile = join(effectiveLogsDir, 'pipeline_state.json');

    // Read pipeline state
    let pipelineState: Record<string, unknown> = {};
    if (existsSync(stateFile)) {
      try {
        const content = await readFile(stateFile, 'utf-8');
        pipelineState = JSON.parse(content);
      } catch { /* ignore parse errors */ }
    }

    // Read most recent pipeline log
    const logFile = await findLatestLog(effectiveLogsDir, customLogPattern);
    const logs: LogEntry[] = [];

    if (logFile) {
      try {
        const content = await readFile(logFile, 'utf-8');
        const lines = content.split(/\r?\n/).filter(l => l.trim());
        for (const line of lines) {
          const parsed = parseLogLine(line);
          if (parsed) logs.push(parsed);
        }
      } catch { /* ignore read errors */ }
    }

    // Build agent statuses from log entries
    const agentStatuses = buildAgentStatuses(logs);

    // Determine pipeline state
    const currentPhase = String(pipelineState.phase ?? 'unknown');
    const isComplete = PIPELINE_COMPLETE.test(logs[logs.length - 1]?.message ?? '');
    const isRunning = !isComplete && logs.length > 0 && Object.values(agentStatuses).some(s => s.state === 'running');

    // Future: mark upcoming agents as 'waiting' based on pipeline sequence

    const status: PipelineStatus = {
      date: String(pipelineState.date ?? new Date().toISOString().slice(0, 10).replace(/-/g, '')),
      currentPhase,
      isRunning,
      startedAt: logs[0]?.timestamp ?? null,
      agents: agentStatuses,
      recentLogs: logs.slice(-30), // Last 30 log entries
    };

    return NextResponse.json({ data: status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
