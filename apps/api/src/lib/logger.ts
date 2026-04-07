import pino from 'pino';

export const logger =
  process.env.NODE_ENV === 'development'
    ? pino({
        level: process.env.LOG_LEVEL ?? 'info',
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      })
    : pino({ level: process.env.LOG_LEVEL ?? 'info' });
