import { Request, Response } from 'express';
import { checkDbConnection } from '../services/prisma.service.js';
import { checkRedisConnection } from '../services/redis.service.js';
import { emailQueue } from '../queue/email.queue.js';

export class HealthController {
  public static async check(_req: Request, res: Response): Promise<void> {
    const [dbOk, redisOk] = await Promise.all([
      checkDbConnection(),
      checkRedisConnection(),
    ]);

    let queueWaiting = 0;
    let queueDelayed = 0;
    try {
      if (redisOk) {
        queueWaiting = await emailQueue.getWaitingCount();
        queueDelayed = await emailQueue.getDelayedCount();
      }
    } catch {
      // ignore
    }

    const isHealthy = dbOk && redisOk;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbOk ? 'connected' : 'disconnected',
        redis: redisOk ? 'connected' : 'disconnected',
        queue: {
          waitingJobs: queueWaiting,
          delayedJobs: queueDelayed,
        },
      },
    });
  }
}
