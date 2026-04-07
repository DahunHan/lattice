import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';

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
    const projectPath: string = body.projectPath;
    const filePath: string = body.filePath;
    const newContent: string = body.newContent;

    if (!projectPath || !filePath || typeof newContent !== 'string') {
      return NextResponse.json({ error: 'projectPath, filePath, and newContent required' }, { status: 400 });
    }

    const basePath = resolve(projectPath);
    const fullPath = join(basePath, filePath);

    // Path traversal protection
    if (!fullPath.startsWith(basePath)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read current content for diff
    const oldContent = await readFile(fullPath, 'utf-8');

    // Write new content
    await writeFile(fullPath, newContent, 'utf-8');

    return NextResponse.json({
      success: true,
      path: fullPath,
      oldContent,
      newContent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET: Read a file's current content (for diff preview) — read-only, no CSRF needed */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projectPath = url.searchParams.get('projectPath');
    const filePath = url.searchParams.get('filePath');

    if (!projectPath || !filePath) {
      return NextResponse.json({ error: 'projectPath and filePath required' }, { status: 400 });
    }

    const basePath = resolve(projectPath);
    const fullPath = join(basePath, filePath);

    if (!fullPath.startsWith(basePath)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const content = await readFile(fullPath, 'utf-8');
    return NextResponse.json({ content, path: fullPath });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
