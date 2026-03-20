import { DaemonRequest, DaemonRequestSchema } from '@syslink/shared';

/**
 * Parse a single newline-delimited JSON line into a DaemonRequest.
 *
 * Returns null if the line is empty, not valid JSON, or fails schema validation.
 * Invalid messages are silently dropped here; the caller is responsible for
 * sending an error response back to the client.
 */
export function parseLine(line: string): DaemonRequest | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(trimmed);
  } catch {
    return null;
  }

  const result = DaemonRequestSchema.safeParse(raw);
  if (!result.success) {
    return null;
  }

  return result.data;
}
