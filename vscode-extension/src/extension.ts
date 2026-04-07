import * as vscode from 'vscode';
import { exec } from 'child_process';

let serverProcess: ReturnType<typeof exec> | null = null;
let panel: vscode.WebviewPanel | null = null;

const DEFAULT_PORT = 3777;

export function activate(context: vscode.ExtensionContext) {
  // Command: Open Dashboard
  const openCmd = vscode.commands.registerCommand('lattice.openDashboard', () => {
    openPanel(context);
  });

  // Command: Scan Current Workspace
  const scanCmd = vscode.commands.registerCommand('lattice.scanWorkspace', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    await startServer(context, workspaceFolder);
    openPanel(context, workspaceFolder);
  });

  context.subscriptions.push(openCmd, scanCmd);
}

async function startServer(context: vscode.ExtensionContext, scanPath?: string) {
  if (serverProcess) return; // Already running

  const latticePath = getLatticePath();
  if (!latticePath) {
    vscode.window.showErrorMessage('Lattice not found. Install with: npm install -g lattice');
    return;
  }

  return new Promise<void>((resolve) => {
    const env = {
      ...process.env,
      PORT: String(DEFAULT_PORT),
      HOSTNAME: '127.0.0.1',
      ...(scanPath ? { LATTICE_SCAN_PATH: scanPath } : {}),
    };

    serverProcess = exec(`npx next start -p ${DEFAULT_PORT} -H 127.0.0.1`, {
      cwd: latticePath,
      env,
    });

    // Give server time to start
    setTimeout(resolve, 3000);

    serverProcess.on('exit', () => {
      serverProcess = null;
    });
  });
}

function openPanel(context: vscode.ExtensionContext, scanPath?: string) {
  if (panel) {
    panel.reveal();
    return;
  }

  panel = vscode.window.createWebviewPanel(
    'lattice',
    'Lattice',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  const url = scanPath
    ? `http://localhost:${DEFAULT_PORT}/graph`
    : `http://localhost:${DEFAULT_PORT}`;

  panel.webview.html = getWebviewContent(url);

  panel.onDidDispose(() => {
    panel = null;
  });
}

function getWebviewContent(url: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #0A0A1B; }
    iframe { width: 100%; height: 100%; border: none; }
    .loading { display: flex; align-items: center; justify-content: center; height: 100%; color: #9999BB; font-family: system-ui; }
    .loading span { animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
  </style>
</head>
<body>
  <div class="loading" id="loading"><span>Connecting to Lattice...</span></div>
  <iframe src="${url}" id="frame" style="display:none" onload="document.getElementById('loading').style.display='none';this.style.display='block'"></iframe>
</body>
</html>`;
}

function getLatticePath(): string | null {
  // Try to find Lattice installation
  const paths = [
    // Global npm install
    require.resolve?.('lattice/package.json')?.replace('/package.json', ''),
    // Local development
    `${process.env.HOME || process.env.USERPROFILE}/.lattice`,
  ].filter(Boolean);

  for (const p of paths) {
    try {
      if (p && require('fs').existsSync(p)) return p;
    } catch { /* skip */ }
  }

  return null;
}

export function deactivate() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (panel) {
    panel.dispose();
    panel = null;
  }
}
