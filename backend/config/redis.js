// RidePulse — ioredis connection for BullMQ queues (requires REDIS_URL in .env)
const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
});

connection.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

module.exports = connection;
