import { NextRequest, NextResponse } from 'next/server';
import { stat } from 'fs/promises';
import { join, resolve } from 'path';
import type { AgentHealth } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    // CSRF protection: require Origin from localhost
    const origin = req.headers.get('origin');
    if (!origin) {
      return NextResponse.json({ error: 'Origin header required' }, { status: 403 });
    }
    const originUrl = new URL(origin);
    if (originUrl.hostname !== 'localhost' && originUrl.hostname !== '127.0.0.1') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const projectPath: string = body.path;
    const scripts: { agentId: string; scriptPath: string }[] = body.scripts;

    if (!projectPath || !Array.isArray(scripts)) {
      return NextResponse.json({ error: 'path and scripts required' }, { status: 400 });
    }

    const basePath = resolve(projectPath);
    const results: Record<string, AgentHealth> = {};

    for (const { agentId, scriptPath } of scripts) {
      const fullPath = join(basePath, scriptPath);
      // Prevent path traversal
      if (!fullPath.startsWith(basePath)) {
        results[agentId] = { scriptExists: false, scriptLastModified: null, scriptSize: null, staleDays: null };
        continue;
      }

      try {
        const stats = await stat(fullPath);
        const mtime = stats.mtime;
        const staleDays = Math.floor((Date.now() - mtime.getTime()) / (1000 * 60 * 60 * 24));
        results[agentId] = {
          scriptExists: true,
          scriptLastModified: mtime.toISOString(),
          scriptSize: stats.size,
          staleDays,
        };
      } catch {
        results[agentId] = {
          scriptExists: false,
          scriptLastModified: null,
          scriptSize: null,
          staleDays: null,
        };
      }
    }

    return NextResponse.json({ data: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
