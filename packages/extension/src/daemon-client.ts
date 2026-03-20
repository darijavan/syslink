import * as cp from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { DaemonRequest, DaemonResponse, DaemonResponseSchema } from '@syslink/shared';

/**
 * DaemonClient manages the lifecycle and communication of the daemon subprocess.
 *
 * - Spawn: starts the daemon via `node <daemonPath>`
 * - Send:  writes newline-delimited JSON requests to the daemon's stdin
 * - Recv:  reads newline-delimited JSON responses from the daemon's stdout
 * - Auto-restart on unexpected exit
 * - Clean shutdown on VS Code deactivation
 */
export class DaemonClient {
  private process: cp.ChildProcess | null = null;

  /** Partial stdout data accumulated between newlines */
  private buffer = '';

  /** Monotonically increasing request identifier */
  private messageId = 0;

  /** Set to true by stop() so the exit handler does not trigger an auto-restart */
  private intentionalShutdown = false;

  private readonly output: vscode.OutputChannel;

  /** Absolute path to the compiled daemon entry point */
  private readonly daemonPath: string;

  constructor(extensionPath: string, output: vscode.OutputChannel) {
    this.output = output;
    // The daemon package sits alongside the extension package in the monorepo.
    // extensionPath  →  .../packages/extension
    // daemonPath     →  .../packages/daemon/dist/index.js
    this.daemonPath = path.join(extensionPath, '..', 'daemon', 'dist', 'index.js');
  }

  /** Returns true when the daemon process is alive */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  /** Spawn the daemon and wire up stdio/lifecycle handlers */
  start(): void {
    if (this.isRunning()) {
      this.output.appendLine('[DaemonClient] Daemon is already running.');
      return;
    }

    this.output.appendLine(`[DaemonClient] Starting daemon: ${this.daemonPath}`);

    this.process = cp.spawn('node', [this.daemonPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Accumulate stdout chunks and parse complete lines as they arrive
    this.process.stdout?.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString();
      this.flushBuffer();
    });

    // Forward daemon log output (stderr) to the output channel
    this.process.stderr?.on('data', (chunk: Buffer) => {
      this.output.appendLine(`[Daemon] ${chunk.toString().trim()}`);
    });

    // Auto-restart on unexpected exit; suppressed when stop() sets intentionalShutdown
    this.process.on('exit', (code, signal) => {
      this.process = null;
      if (this.intentionalShutdown) {
        // Clean shutdown requested by stop() — do not restart
        this.intentionalShutdown = false;
        return;
      }
      this.output.appendLine(
        `[DaemonClient] Daemon exited (code=${code}, signal=${signal}). Restarting in 2 s…`,
      );
      setTimeout(() => this.start(), 2000);
    });

    this.process.on('error', (err) => {
      this.output.appendLine(`[DaemonClient] Failed to start daemon: ${err.message}`);
      this.process = null;
    });

    this.output.appendLine('[DaemonClient] Daemon process spawned.');
  }

  /**
   * Send a JSON request to the daemon via stdin.
   * @param action  The action name (e.g. "ping")
   * @param payload Optional action-specific data
   */
  send(action: string, payload?: unknown): void {
    if (!this.isRunning() || !this.process?.stdin) {
      this.output.appendLine('[DaemonClient] Cannot send: daemon is not running.');
      return;
    }

    const request: DaemonRequest = {
      id: String(++this.messageId),
      action,
      payload,
    };

    const line = JSON.stringify(request) + '\n';
    this.process.stdin.write(line);
    this.output.appendLine(`[DaemonClient] → ${line.trim()}`);
  }

  /** Kill the daemon process intentionally (no auto-restart) */
  stop(): void {
    if (!this.process) return;

    // Set the flag before killing so the exit handler sees it immediately,
    // avoiding the race condition where the process exits before removeAllListeners
    this.intentionalShutdown = true;
    this.process.kill();
    this.process = null;
    this.output.appendLine('[DaemonClient] Daemon stopped.');
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Split the accumulated stdout buffer on newlines and parse each complete line
   * as a DaemonResponse, leaving any partial line in the buffer.
   */
  private flushBuffer(): void {
    const lines = this.buffer.split('\n');
    // The last element is either empty or an incomplete line — keep it in buffer
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let raw: unknown;
      try {
        raw = JSON.parse(trimmed);
      } catch {
        this.output.appendLine(`[DaemonClient] Failed to parse response: ${trimmed}`);
        continue;
      }

      const result = DaemonResponseSchema.safeParse(raw);
      if (result.success) {
        this.handleResponse(result.data);
      } else {
        this.output.appendLine(`[DaemonClient] Invalid response schema: ${trimmed}`);
      }
    }
  }

  /** Log a validated daemon response to the output channel */
  private handleResponse(response: DaemonResponse): void {
    const detail = response.message ? `, message="${response.message}"` : '';
    this.output.appendLine(
      `[DaemonClient] ← [id=${response.id}] status=${response.status}${detail}`,
    );
  }
}
