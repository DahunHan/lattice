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
const MAX_FILE_SIZE = 1024 * 1024; // 1MB for .md files
const MAX_PY_FILE_SIZE = 50 * 1024; // 50KB for .py files — agent definitions are small

// Quick fingerprints: if a .py file's first 2KB doesn't contain any of these,
// it's not an agent definition file and we skip reading the rest.
const PY_AGENT_FINGERPRINTS = [
  'from crewai', '@CrewBase', 'from agents', 'from autogen', 'autogen_agentchat',
  'StateGraph', 'add_node', 'AssistantAgent', 'UserProxyAgent', 'GroupChat',
  'Agent(', 'handoffs',
];

// Sensitive paths that should never be scanned
const BLOCKED_PATHS = [
  // Unix system dirs
  '/etc', '/var', '/proc', '/sys', '/root', '/boot', '/dev', '/sbin', '/usr/sbin',
  // Windows system dirs
  'C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)', 'C:\\ProgramData',
];

// Sensitive directory names that should never be traversed into
const BLOCKED_DIR_NAMES = new Set([
  '.ssh', '.aws', '.azure', '.gcloud', '.config', '.gnupg', '.kube',
  '.docker', '.npm', '.cargo', '.rustup', '.pyenv',
  'AppData', '.local', '.cache',
]);

// File extensions to scan for agent definitions
const SCANNABLE_EXTENSIONS = new Set(['.md', '.py', '.yaml', '.yml']);
// Only specific JSON files are relevant (not package.json, tsconfig.json, etc.)
const ALLOWED_JSON_FILES = new Set(['langgraph.json']);

async function findProjectFiles(
  dir: string,
  baseDir: string,
  depth: number,
  results: { name: string; content: string; path: string }[],
  counters: { scanned: number; skipped: number }
): Promise<void> {
  if (depth > MAX_DEPTH || results.length >= MAX_FILES) return;

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  const subdirs: { fullPath: string }[] = [];
  const fileReads: Promise<void>[] = [];

  for (const entry of entries) {
    if (results.length >= MAX_FILES) break;

    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (BLOCKED_DIR_NAMES.has(entry.name)) continue;
      const isAllowedDotDir = entry.name === '.agents' || entry.name === '.claude';
      if (isAllowedDotDir || (!IGNORE_DIRS.has(entry.name) && !entry.name.startsWith('.'))) {
        subdirs.push({ fullPath });
      }
    } else if (SCANNABLE_EXTENSIONS.has(extname(entry.name).toLowerCase()) ||
               ALLOWED_JSON_FILES.has(entry.name.toLowerCase())) {
      fileReads.push(readProjectFile(fullPath, baseDir, entry.name, results, counters));
    }
  }

  // Read files in parallel (batch of up to 10)
  for (let i = 0; i < fileReads.length; i += 10) {
    await Promise.all(fileReads.slice(i, i + 10));
  }

  // Traverse subdirectories
  for (const sub of subdirs) {
    if (results.length >= MAX_FILES) break;
    await findProjectFiles(sub.fullPath, baseDir, depth + 1, results, counters);
  }
}

async function readProjectFile(
  fullPath: string,
  baseDir: string,
  filename: string,
  results: { name: string; content: string; path: string }[],
  counters: { scanned: number; skipped: number }
): Promise<void> {
  try {
    // Symlink protection
    const resolved = await realpath(fullPath);
    if (!resolved.startsWith(baseDir)) { counters.skipped++; return; }

    const fileStats = await stat(fullPath);
    const ext = extname(filename).toLowerCase();
    const isPython = ext === '.py';

    // Size limits: stricter for .py files (agent defs are small)
    const sizeLimit = isPython ? MAX_PY_FILE_SIZE : MAX_FILE_SIZE;
    if (fileStats.size > sizeLimit) { counters.skipped++; return; }

    // For .py files: quick fingerprint check on first 2KB before reading the full file
    if (isPython && fileStats.size > 2048) {
      const fd = await import('fs').then(fs => fs.promises.open(fullPath, 'r'));
      const buf = Buffer.alloc(2048);
      await fd.read(buf, 0, 2048, 0);
      await fd.close();
      const head = buf.toString('utf-8');
      const hasFingerprint = PY_AGENT_FINGERPRINTS.some(fp => head.includes(fp));
      if (!hasFingerprint) { counters.skipped++; return; }
    }

    const content = await readFile(fullPath, 'utf-8');
    counters.scanned++;
    results.push({
      name: filename,
      content,
      path: relative(baseDir, fullPath).replace(/\\/g, '/'),
    });
  } catch {
    counters.skipped++;
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
    const counters = { scanned: 0, skipped: 0 };
    await findProjectFiles(realRoot, realRoot, 0, files, counters);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No parseable files found in directory' }, { status: 404 });
    }

    // Parse project
    const projectData = parseProject(files);

    return NextResponse.json({
      data: projectData,
      filesScanned: counters.scanned,
      filesSkipped: counters.skipped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
