import { createInterface } from 'readline';
import { DaemonResponse, logger } from '@syslink/shared';
import { parseLine } from './parser';
import { dispatch } from './handlers';

/**
 * SysLink Daemon — entry point.
 *
 * Reads newline-delimited JSON requests from stdin,
 * dispatches them to the appropriate handler, and
 * writes newline-delimited JSON responses to stdout.
 *
 * Log output goes to stderr so it does not pollute the JSON stream.
 */
const rl = createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

logger.info('SysLink daemon started, awaiting messages...');

rl.on('line', (line) => {
  const request = parseLine(line);

  if (!request) {
    // Respond with a typed parse error; use 'unknown' as id since the request was unparseable
    const errorResponse: DaemonResponse = {
      id: 'unknown',
      status: 'error',
      message: 'Invalid or malformed request',
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
    return;
  }

  logger.info(`Received action: "${request.action}" (id: ${request.id})`);

  const response = dispatch(request);
  process.stdout.write(JSON.stringify(response) + '\n');
});

rl.on('close', () => {
  logger.info('Stdin closed, daemon shutting down.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, daemon shutting down.');
  process.exit(0);
});
