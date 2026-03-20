import { z } from 'zod';

/**
 * Schema and type for a request sent from the extension to the daemon.
 * Messages are newline-delimited JSON over stdin.
 */
export const DaemonRequestSchema = z.object({
  /** Unique request identifier (used to correlate responses) */
  id: z.string(),
  /** Action to perform (e.g. "ping") */
  action: z.string(),
  /** Optional action-specific payload */
  payload: z.unknown().optional(),
});

export type DaemonRequest = z.infer<typeof DaemonRequestSchema>;

/**
 * Schema and type for a response sent from the daemon to the extension.
 * Messages are newline-delimited JSON over stdout.
 */
export const DaemonResponseSchema = z.object({
  /** Matches the id from the originating request */
  id: z.string(),
  /** Whether the action succeeded */
  status: z.enum(['ok', 'error']),
  /** Human-readable message (e.g. "pong") */
  message: z.string().optional(),
  /** Optional action-specific response data */
  data: z.unknown().optional(),
});

export type DaemonResponse = z.infer<typeof DaemonResponseSchema>;
