import IORedis from 'ioredis';

export const redis = new IORedis(
  process.env.REDIS_URL ?? 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null, // Required for BullMQ
    lazyConnect: false,
  },
);

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});
