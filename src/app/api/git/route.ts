import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { existsSync } from 'fs';

const execFileAsync = promisify(execFile);

export interface GitFileInfo {
  lastCommitHash: string;
  lastAuthor: string;
  lastModifiedRelative: string;
  lastCommitMessage: string;
}

export async function POST(req: NextRequest) {
  try {
    // CSRF protection: require Origin from localhost
    const origin = req.headers.get('origin');
    if (!origin) {
      return NextResponse.json({ error: 'Origin header required' }, { status: 403 });
    }
    const url = new URL(origin);
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const projectPath: string = body.path;
    const files: { agentId: string; filePath: string }[] = body.files;

    if (!projectPath || !Array.isArray(files)) {
      return NextResponse.json({ error: 'path and files required' }, { status: 400 });
    }

    const basePath = resolve(projectPath);

    // Check if it's a git repo
    if (!existsSync(resolve(basePath, '.git'))) {
      return NextResponse.json({ data: {} });
    }

    // Run git log for all files in parallel (max 10 concurrent)
    const results: Record<string, GitFileInfo> = {};
    const batches: { agentId: string; filePath: string }[][] = [];
    for (let i = 0; i < files.length; i += 10) {
      batches.push(files.slice(i, i + 10));
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map(async ({ agentId, filePath }) => {
          try {
            const fullPath = resolve(basePath, filePath);
            if (!fullPath.startsWith(basePath)) return;

            // Use execFile (no shell) to prevent command injection
            const { stdout } = await execFileAsync(
              'git',
              ['log', '-1', '--format=%H|%an|%ar|%s', '--', filePath],
              { cwd: basePath, encoding: 'utf-8', timeout: 5000 }
            );

            const output = stdout.trim();
            if (!output) return;

            const [hash, author, relativeTime, ...msgParts] = output.split('|');
            results[agentId] = {
              lastCommitHash: hash,
              lastAuthor: author,
              lastModifiedRelative: relativeTime,
              lastCommitMessage: msgParts.join('|'),
            };
          } catch {
            // No git history for this file — skip
          }
        })
      );
    }

    return NextResponse.json({ data: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
