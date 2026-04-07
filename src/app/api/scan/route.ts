import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, stat, realpath } from 'fs/promises';
import { join, extname, relative, resolve } from 'path';
import { existsSync } from 'fs';
import { parseProject } from '@/lib/parser';

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '__pycache__', '.next', 'dist', 'build',
  '.venv', 'venv', 'env', '.tox', '.mypy_cache', '.pytest_cache',
  '_workspace', 'coverage', '.turbo',
]);

const MAX_DEPTH = 6;
const MAX_FILES = 200;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

// Sensitive paths that should never be scanned
const BLOCKED_PATHS = ['/etc', '/var', '/proc', '/sys', 'C:\\Windows', 'C:\\Program Files'];

// File extensions to scan for agent definitions
const SCANNABLE_EXTENSIONS = new Set(['.md', '.py', '.yaml', '.yml']);
// Only specific JSON files are relevant (not package.json, tsconfig.json, etc.)
const ALLOWED_JSON_FILES = new Set(['langgraph.json']);

async function findProjectFiles(
  dir: string,
  baseDir: string,
  depth: number,
  results: { name: string; content: string; path: string }[]
): Promise<void> {
  if (depth > MAX_DEPTH || results.length >= MAX_FILES) return;

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (results.length >= MAX_FILES) break;

    const fullPath = join(dir, entry.name);

    // Symlink protection: resolve and verify still under baseDir
    try {
      const resolved = await realpath(fullPath);
      if (!resolved.startsWith(baseDir)) continue;
    } catch {
      continue;
    }

    if (entry.isDirectory()) {
      const isAllowedDotDir = entry.name === '.agents' || entry.name === '.claude';
      if (isAllowedDotDir || (!IGNORE_DIRS.has(entry.name) && !entry.name.startsWith('.'))) {
        await findProjectFiles(fullPath, baseDir, depth + 1, results);
      }
    } else if (SCANNABLE_EXTENSIONS.has(extname(entry.name).toLowerCase()) ||
               ALLOWED_JSON_FILES.has(entry.name.toLowerCase())) {
      try {
        const stats = await stat(fullPath);
        if (stats.size > MAX_FILE_SIZE) continue;

        const content = await readFile(fullPath, 'utf-8');
        results.push({
          name: entry.name,
          content,
          path: relative(baseDir, fullPath).replace(/\\/g, '/'),
        });
      } catch {
        // Skip unreadable files
      }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectPath = body.path;

    if (!projectPath || typeof projectPath !== 'string') {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // Resolve to absolute path and normalize
    const resolvedPath = resolve(projectPath);

    // Block sensitive system directories
    for (const blocked of BLOCKED_PATHS) {
      if (resolvedPath.toLowerCase().startsWith(blocked.toLowerCase())) {
        return NextResponse.json({ error: 'Access to system directories is not allowed' }, { status: 403 });
      }
    }

    // Validate path exists
    if (!existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'Path does not exist' }, { status: 404 });
    }

    const stats = await stat(resolvedPath);
    if (!stats.isDirectory()) {
      return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
    }

    // Resolve symlinks at root level too
    const realRoot = await realpath(resolvedPath);

    // Find all project files (md, py, yaml, yml, json)
    const files: { name: string; content: string; path: string }[] = [];
    await findProjectFiles(realRoot, realRoot, 0, files);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No parseable files found in directory' }, { status: 404 });
    }

    // Parse project
    const projectData = parseProject(files);

    return NextResponse.json({
      data: projectData,
      filesScanned: files.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
