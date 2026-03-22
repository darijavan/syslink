/**
 * Minimal logger utility with ISO timestamps.
 * The daemon writes to stderr so log output does not pollute the JSON stdout stream.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function timestamp(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, ...args: unknown[]): void {
  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
  switch (level) {
    case 'debug': console.debug(prefix, ...args); break;
    case 'info':  console.info(prefix,  ...args); break;
    case 'warn':  console.warn(prefix,  ...args); break;
    case 'error': console.error(prefix, ...args); break;
  }
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info:  (...args: unknown[]) => log('info',  ...args),
  warn:  (...args: unknown[]) => log('warn',  ...args),
  error: (...args: unknown[]) => log('error', ...args),
};
