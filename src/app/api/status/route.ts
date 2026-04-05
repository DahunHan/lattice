import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir, stat, realpath } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import type { PipelineStatus, LiveAgentStatus, LogEntry, RunState } from '@/lib/types';

const LOG_LINE_PATTERN = /^\[([^\]]+)\]\s+\[(\w+)\]\s+(.+?)$/;
const PHASE_PATTERN = /---\s*Phase\s+[\d.]+:\s*(.+?)\s*---/;
const RUNNING_PATTERN = /Running:\s+(\w+\.py)/;
const SUCCESS_PATTERN = /(\w+\.py)\s+completed\s+successfully/;
const FAILED_PATTERN = /(\w+\.py)\s+(?:failed|error)/i;
const PIPELINE_COMPLETE = /Pipeline complete/i;

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

  for (const log of logs) {
    if (!log.agentId) continue;
    const id = log.agentId;

    if (!statuses[id]) {
      statuses[id] = { state: 'idle', startedAt: null, completedAt: null, lastLog: null, durationMs: null };
    }

    const running = log.message.match(RUNNING_PATTERN);
    const success = log.message.match(SUCCESS_PATTERN);
    const failed = log.message.match(FAILED_PATTERN);

    if (running) {
      statuses[id].state = 'running';
      statuses[id].startedAt = log.timestamp;
      statuses[id].completedAt = null;
      statuses[id].lastLog = log.message;
    } else if (success) {
      statuses[id].state = 'success';
      statuses[id].completedAt = log.timestamp;
      statuses[id].lastLog = log.message;
      if (statuses[id].startedAt) {
        statuses[id].durationMs = new Date(log.timestamp).getTime() - new Date(statuses[id].startedAt!).getTime();
      }
    } else if (failed) {
      statuses[id].state = 'failed';
      statuses[id].completedAt = log.timestamp;
      statuses[id].lastLog = log.message;
    }
  }

  return statuses;
}

async function findTodayLog(logsDir: string): Promise<string | null> {
  if (!existsSync(logsDir)) return null;

  try {
    const files = await readdir(logsDir);
    // Find pipeline log files, sort by name descending (most recent date first)
    const pipelineLogs = files
      .filter(f => f.startsWith('pipeline_') && f.endsWith('.log'))
      .sort()
      .reverse();

    if (pipelineLogs.length === 0) return null;
    return join(logsDir, pipelineLogs[0]);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectPath = body.path;

    if (!projectPath || typeof projectPath !== 'string') {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    const resolvedPath = resolve(projectPath);

    // Block sensitive system directories
    const BLOCKED_PATHS = ['/etc', '/var', '/proc', '/sys', 'C:\\Windows', 'C:\\Program Files'];
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
    const logsDir = join(basePath, 'logs');
    const stateFile = join(logsDir, 'pipeline_state.json');

    // Read pipeline state
    let pipelineState: Record<string, unknown> = {};
    if (existsSync(stateFile)) {
      try {
        const content = await readFile(stateFile, 'utf-8');
        pipelineState = JSON.parse(content);
      } catch { /* ignore parse errors */ }
    }

    // Read most recent pipeline log
    const logFile = await findTodayLog(logsDir);
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
