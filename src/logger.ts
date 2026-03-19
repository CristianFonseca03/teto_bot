import pino from 'pino';
import { mkdirSync } from 'fs';
import { join } from 'path';

const logsDir = join(process.cwd(), 'logs');
mkdirSync(logsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = join(logsDir, `${timestamp}.log`);

const streams: pino.StreamEntry[] = [
  {
    stream: process.env.NODE_ENV !== 'production'
      ? (pino.transport({ target: 'pino-pretty', options: { colorize: true } }) as any)
      : process.stdout,
  },
  {
    stream: pino.destination({ dest: logFile, sync: false }),
  },
];

const logger = pino({ level: 'info' }, pino.multistream(streams));

export default logger;
