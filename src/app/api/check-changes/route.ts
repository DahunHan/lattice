import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join, extname, resolve } from 'path';
import { existsSync } from 'fs';
import { createHash } from 'crypto';

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '__pycache__', '.next', 'dist', 'build',
  '.venv', 'venv', 'env', '_workspace', 'coverage', '.turbo',
  'drafts', 'logs', 'output', 'outputs', 'data', 'tmp', 'temp',
]);

const WATCH_EXTENSIONS = new Set(['.md', '.py', '.yaml', '.yml']);
const MAX_DEPTH = 4;

async function collectMtimes(
  dir: string,
  depth: number,
  mtimes: string[]
): Promise<void> {
  if (depth > MAX_DEPTH) return;

  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      const isAllowed = entry.name === '.agents' || entry.name === '.claude';
      if (isAllowed || (!IGNORE_DIRS.has(entry.name) && !entry.name.startsWith('.'))) {
        await collectMtimes(fullPath, depth + 1, mtimes);
      }
    } else if (WATCH_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      try {
        const s = await stat(fullPath);
        mtimes.push(`${entry.name}:${s.mtimeMs}`);
      } catch { /* skip */ }
    }
  }
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

    const mtimes: string[] = [];
    await collectMtimes(basePath, 0, mtimes);

    const hash = createHash('md5').update(mtimes.sort().join('|')).digest('hex');

    return NextResponse.json({ hash, fileCount: mtimes.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
