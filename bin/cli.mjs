#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import { createServer } from 'net';
import { platform } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const args = process.argv.slice(2);

if (args.some(a => a === '--help' || a === '-h')) {
  console.log(`
  hailmary - See your agents. Understand the flow.

  Usage:
    npx hailmary [path] [options]

  Arguments:
    path          Project folder to scan on startup (optional)

  Options:
    -p, --port    Port to run on (default: 3000)
    -h, --help    Show this help message
    -v, --version Show version

  Examples:
    npx hailmary                    # Start dashboard, upload files manually
    npx hailmary ./my-project       # Start and auto-scan a folder
    npx hailmary -p 4000            # Run on port 4000
  `);
  process.exit(0);
}

if (args.some(a => a === '--version' || a === '-v')) {
  const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
  console.log(`hailmary v${pkg.version}`);
  process.exit(0);
}

// Parse arguments
let scanPath = null;
let port = 3000;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-p' || args[i] === '--port') {
    port = parseInt(args[i + 1], 10) || 3000;
    i++;
  } else if (!args[i].startsWith('-')) {
    scanPath = resolve(args[i]);
  }
}

// Validate scan path if provided
if (scanPath && !existsSync(scanPath)) {
  console.error(`Error: Path does not exist: ${scanPath}`);
  process.exit(1);
}

// Check if port is available
function checkPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

// Wait for server to be ready by polling
async function waitForServer(url, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

function openBrowser(url) {
  try {
    const os = platform();
    if (os === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    } else if (os === 'darwin') {
      spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    } else {
      spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
    }
  } catch {
    // Silently fail — user can open manually
  }
}

async function main() {
  // Check port availability
  const portAvailable = await checkPort(port);
  if (!portAvailable) {
    console.error(`Error: Port ${port} is already in use. Try: npx hailmary -p ${port + 1}`);
    process.exit(1);
  }

  const env = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
  };

  if (scanPath) {
    env.HAILMARY_SCAN_PATH = scanPath;
  }

  // Check if the standalone build exists
  const standaloneServer = join(projectRoot, '.next', 'standalone', 'server.js');
  const hasStandalone = existsSync(standaloneServer);
  const hasNextDir = existsSync(join(projectRoot, '.next'));

  // Build if needed
  if (!hasNextDir) {
    console.log('Building HailMary for first run...');
    const build = spawn('npx', ['next', 'build'], {
      cwd: projectRoot,
      stdio: 'inherit',
      env,
      shell: true,
    });

    await new Promise((resolve, reject) => {
      build.on('close', (code) => {
        if (code !== 0) reject(new Error(`Build failed with code ${code}`));
        else resolve(undefined);
      });
    });
  }

  const scanInfo = scanPath ? ` (scanning ${scanPath})` : '';
  const url = `http://localhost:${port}`;

  console.log(`
  HailMary is running${scanInfo}

    Local:   ${url}
    Network: disabled (localhost only)

  Press Ctrl+C to stop
  `);

  // Use standalone server if available (preferred), otherwise fall back to next start
  let server;
  const standaloneAfterBuild = join(projectRoot, '.next', 'standalone', 'server.js');

  if (existsSync(standaloneAfterBuild)) {
    server = spawn('node', [standaloneAfterBuild], {
      cwd: join(projectRoot, '.next', 'standalone'),
      stdio: 'inherit',
      env,
    });
  } else {
    server = spawn('npx', ['next', 'start', '-p', String(port), '-H', '127.0.0.1'], {
      cwd: projectRoot,
      stdio: 'inherit',
      env,
      shell: true,
    });
  }

  // Wait for server to be ready, then open browser
  const ready = await waitForServer(url);
  if (ready) {
    openBrowser(scanPath ? `${url}/graph` : url);
  }

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\nShutting down...');
    server.kill();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  server.on('close', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
