import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';

// Common log directory names across different projects
const LOG_DIR_CANDIDATES = [
  'logs', 'log', 'output', 'outputs', 'runs', '.logs',
  'pipeline_logs', 'agent_logs', 'run_logs',
];

// Common log file patterns
const LOG_FILE_PATTERNS = [
  /^pipeline_.*\.log$/,
  /^run_.*\.log$/,
  /^agent_.*\.log$/,
  /^\d{4}-?\d{2}-?\d{2}.*\.log$/,
  /^.*pipeline.*\.log$/i,
  /^.*agent.*\.log$/i,
  /\.jsonl$/,
];

interface DiscoveredLog {
  directory: string;
  files: { name: string; size: number; mtime: string }[];
  pattern: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectPath: string = body.path;

    if (!projectPath) {
      return NextResponse.json({ error: 'path required' }, { status: 400 });
    }

    const basePath = resolve(projectPath);
    if (!existsSync(basePath)) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    const discovered: DiscoveredLog[] = [];

    // Check each candidate directory
    for (const dirName of LOG_DIR_CANDIDATES) {
      const dirPath = join(basePath, dirName);
      if (!existsSync(dirPath)) continue;

      try {
        const entries = await readdir(dirPath);
        const logFiles: { name: string; size: number; mtime: string }[] = [];

        for (const entry of entries) {
          const isLog = LOG_FILE_PATTERNS.some(p => p.test(entry));
          if (!isLog) continue;

          try {
            const fileStat = await stat(join(dirPath, entry));
            if (fileStat.isFile() && fileStat.size > 0) {
              logFiles.push({
                name: entry,
                size: fileStat.size,
                mtime: fileStat.mtime.toISOString(),
              });
            }
          } catch { /* skip */ }
        }

        if (logFiles.length > 0) {
          // Sort by most recent first
          logFiles.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());

          // Detect the pattern
          const pattern = logFiles[0].name.match(/^pipeline_/) ? 'pipeline_YYYYMMDD.log'
            : logFiles[0].name.match(/^run_/) ? 'run_*.log'
            : logFiles[0].name.match(/\.jsonl$/) ? '*.jsonl'
            : '*.log';

          discovered.push({
            directory: dirName,
            files: logFiles.slice(0, 5), // Top 5 most recent
            pattern,
          });
        }
      } catch { /* skip inaccessible dirs */ }
    }

    return NextResponse.json({
      discovered,
      defaultPath: discovered.length > 0 ? discovered[0].directory : 'logs',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
