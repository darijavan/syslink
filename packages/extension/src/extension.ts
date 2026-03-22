import * as vscode from 'vscode';
import { DaemonClient } from './daemon-client';

/**
 * Singleton DaemonClient instance.
 * Created on activation and destroyed on deactivation.
 */
let client: DaemonClient | undefined;

/**
 * Called by VS Code when the extension is first activated.
 *
 * Registers two commands:
 *   - aiAgent.startDaemon      — spawns the local daemon process
 *   - aiAgent.sendTestCommand  — sends a "ping" action to the daemon
 */
export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('SysLink');
  output.appendLine('[SysLink] Extension activated.');

  client = new DaemonClient(context.extensionPath, output);

  // ── Command: Start Daemon ────────────────────────────────────────────────
  const startDaemon = vscode.commands.registerCommand('aiAgent.startDaemon', () => {
    if (client!.isRunning()) {
      vscode.window.showInformationMessage('SysLink: Daemon is already running.');
      return;
    }
    client!.start();
    vscode.window.showInformationMessage('SysLink: Daemon started.');
  });

  // ── Command: Send Test Command (ping) ────────────────────────────────────
  const sendTestCommand = vscode.commands.registerCommand('aiAgent.sendTestCommand', () => {
    if (!client!.isRunning()) {
      vscode.window.showWarningMessage(
        'SysLink: Daemon is not running. Run "SysLink: Start Daemon" first.',
      );
      return;
    }
    client!.send('ping');
    vscode.window.showInformationMessage(
      'SysLink: Ping sent. Check the "SysLink" output channel for the response.',
    );
  });

  context.subscriptions.push(output, startDaemon, sendTestCommand);
}

/**
 * Called by VS Code when the extension is deactivated (e.g. window closed or
 * extension disabled). Kills the daemon process to avoid leaving orphan processes.
 */
export function deactivate(): void {
  client?.stop();
  client = undefined;
}
