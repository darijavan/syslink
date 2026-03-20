import { DaemonRequest, DaemonResponse } from '@syslink/shared';

/** Handler function type: receives a request and returns a response */
type Handler = (request: DaemonRequest) => DaemonResponse;

/**
 * Registry of action handlers.
 * Add new entries here to support additional daemon actions.
 */
const handlers: Record<string, Handler> = {
  /**
   * ping → responds with { status: "ok", message: "pong" }
   * Used to verify the daemon is alive and the communication channel works.
   */
  ping: (request) => ({
    id: request.id,
    status: 'ok',
    message: 'pong',
  }),
};

/**
 * Dispatch a request to the appropriate handler.
 * Returns an error response if no handler is registered for the action.
 */
export function dispatch(request: DaemonRequest): DaemonResponse {
  const handler = handlers[request.action];
  if (!handler) {
    return {
      id: request.id,
      status: 'error',
      message: `Unknown action: "${request.action}"`,
    };
  }
  return handler(request);
}

/**
 * Register an additional handler at runtime.
 * Useful for extending the daemon with new actions without modifying this file.
 */
export function registerHandler(action: string, handler: Handler): void {
  handlers[action] = handler;
}
