require('dotenv').config();

const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
};

module.exports = {
  redisConnection,
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY, 10) || 3,
};
