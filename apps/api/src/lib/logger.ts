import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true } }
    : process.env.LOGTAIL_SOURCE_TOKEN
      ? {
          target: '@logtail/pino',
          options: { sourceToken: process.env.LOGTAIL_SOURCE_TOKEN },
        }
      : undefined,
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  redact: ['req.headers.authorization', 'body.phoneE164', 'body.code'],
});
