import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { config } from './config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Record<string, unknown>;

const sensitiveKeys = new Set(['token', 'botToken', 'authorization', 'authorizationHeader', 'password']);

function sanitize(fields: LogFields): LogFields {
  const output: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    output[key] = sensitiveKeys.has(key) ? '[redacted]' : value;
  }
  return output;
}

function emit(level: LogLevel, event: string, fields: LogFields = {}): void {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitize(fields),
  });
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

let fileLoggingFailed = false;

async function persistAction(event: string, fields: LogFields): Promise<void> {
  if (fileLoggingFailed) return;
  try {
    const path = config.actionLogPath;
    await mkdir(dirname(path), { recursive: true });
    await appendFile(
      path,
      `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...sanitize(fields) })}\n`,
      'utf8',
    );
  } catch (error) {
    fileLoggingFailed = true;
    emit('warn', 'action_log.file_unavailable', {
      path: config.actionLogPath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const logger = {
  debug(event: string, fields?: LogFields): void {
    emit('debug', event, fields);
  },
  info(event: string, fields?: LogFields): void {
    emit('info', event, fields);
  },
  warn(event: string, fields?: LogFields): void {
    emit('warn', event, fields);
  },
  error(event: string, fields?: LogFields): void {
    emit('error', event, fields);
  },
  /** Logs an auditable action to stdout and to the append-only JSONL file. */
  action(event: string, fields: LogFields = {}): void {
    emit('info', event, fields);
    void persistAction(event, fields);
  },
};
