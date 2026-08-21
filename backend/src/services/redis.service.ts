import { Redis } from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const redisClient = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

redisClient.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

export const getRedisConnectionOptions = () => {
  const url = new URL(config.redisUrl);
  return {
    host: url.hostname || 'localhost',
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    username: url.username || undefined,
    maxRetriesPerRequest: null,
  };
};

export async function checkRedisConnection(): Promise<boolean> {
  try {
    const ping = await redisClient.ping();
    return ping === 'PONG';
  } catch (error) {
    logger.warn({ error }, 'Redis connection check failed');
    return false;
  }
}
