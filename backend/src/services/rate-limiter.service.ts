import { redisClient } from './redis.service.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  delayUntilNextWindowMs?: number;
}

export class RateLimiterService {
  /**
   * Generates a unique hour window string (e.g., 2026-08-21T18)
   */
  private static getHourWindowKey(timestamp = Date.now()): { keySuffix: string; nextWindowStart: number } {
    const d = new Date(timestamp);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hour = String(d.getUTCHours()).padStart(2, '0');
    
    // Start of the next UTC hour
    const nextHour = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours() + 1, 0, 0, 0));
    
    return {
      keySuffix: `${year}${month}${day}${hour}`,
      nextWindowStart: nextHour.getTime(),
    };
  }

  /**
   * Checks and atomically increments hourly rate limit counter in Redis.
   * If limit is reached, returns allowed: false and the exact millisecond delay until the next hour.
   */
  public static async checkAndConsumeHourlyLimit(
    senderId = 'global',
    hourlyLimit = config.worker.maxEmailsPerHour
  ): Promise<RateLimitCheckResult> {
    const now = Date.now();
    const { keySuffix, nextWindowStart } = this.getHourWindowKey(now);
    const key = `email-rate:${senderId}:${keySuffix}`;

    try {
      // Redis INCR is atomic
      const count = await redisClient.incr(key);
      if (count === 1) {
        // Set TTL to expire after 2 hours (7200 seconds) so old keys clean up automatically
        await redisClient.expire(key, 7200);
      }

      if (count > hourlyLimit) {
        // Decrement back so we don't inflate beyond reasonable count
        await redisClient.decr(key);

        const delayUntilNextWindowMs = Math.max(1000, nextWindowStart - now + 500); // 500ms safety buffer
        logger.warn(
          { senderId, count, hourlyLimit, delayUntilNextWindowMs },
          `Hourly rate limit reached for sender ${senderId}. Moving to next window.`
        );

        return {
          allowed: false,
          currentCount: count - 1,
          limit: hourlyLimit,
          delayUntilNextWindowMs,
        };
      }

      return {
        allowed: true,
        currentCount: count,
        limit: hourlyLimit,
      };
    } catch (error) {
      logger.error({ error, senderId }, 'Redis rate limit check failed, allowing fallback send');
      // If redis check fails, do not block emails permanently
      return {
        allowed: true,
        currentCount: 0,
        limit: hourlyLimit,
      };
    }
  }

  /**
   * Enforces minimum delay between consecutive emails for a given sender/account.
   */
  public static async acquireDelaySlot(
    senderId = 'global',
    minDelayMs = config.worker.minEmailDelayMs
  ): Promise<number> {
    const key = `email-delay:${senderId}`;
    const now = Date.now();

    try {
      // Atomically update last scheduled send timestamp
      const lastSendTimeStr = await redisClient.get(key);
      let targetSendTime = now;

      if (lastSendTimeStr) {
        const lastSendTime = parseInt(lastSendTimeStr, 10);
        if (!isNaN(lastSendTime) && lastSendTime + minDelayMs > now) {
          targetSendTime = lastSendTime + minDelayMs;
        }
      }

      const waitMs = Math.max(0, targetSendTime - now);
      // Set new target time with 1 hour TTL
      await redisClient.set(key, (targetSendTime + minDelayMs).toString(), 'EX', 3600);

      return waitMs;
    } catch (error) {
      logger.error({ error, senderId }, 'Error acquiring delay slot, using 0ms');
      return 0;
    }
  }
}
