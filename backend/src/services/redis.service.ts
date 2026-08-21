import { Redis } from 'ioredis';
import RedisMock from 'ioredis-mock';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const isMock = process.env.USE_MOCK_REDIS === 'true';

export const redisClient: any = isMock
  ? new (RedisMock as any)()
  : new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
      retryStrategy(times) {
        if (times > 5) {
          logger.warn('Redis is not reachable on ' + config.redisUrl + '. Retrying in 10s...');
          return 10000;
        }
        return Math.min(times * 500, 3000);
      },
    });

if (isMock) {
  logger.info('Using in-memory Redis Engine (Local Zero-Config Mode)');
} else {
  redisClient.on('connect', () => {
    logger.info('Connected to Redis at ' + config.redisUrl);
  });

  redisClient.on('error', (err: any) => {
    logger.warn('Redis not running on ' + config.redisUrl + '. Provide a valid REDIS_URL in .env or use Docker.');
  });
}

export const getRedisConnectionOptions = () => {
  if (isMock) {
    return { host: 'localhost', port: 6379 };
  }
  try {
    const url = new URL(config.redisUrl);
    return {
      host: url.hostname || 'localhost',
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
      username: url.username || undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
};

export async function checkRedisConnection(): Promise<boolean> {
  try {
    const ping = await redisClient.ping();
    return ping === 'PONG';
  } catch (error) {
    return false;
  }
}
