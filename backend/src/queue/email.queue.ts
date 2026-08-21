import { Queue, JobsOptions } from 'bullmq';
import { getRedisConnectionOptions } from '../services/redis.service.js';
import { logger } from '../utils/logger.js';

export const EMAIL_QUEUE_NAME = 'email-dispatch-queue';

export interface EmailJobData {
  emailId: string;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: getRedisConnectionOptions(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 10s, 20s
    },
    removeOnComplete: {
      age: 86400, // keep for 24h for audit/history
      count: 1000,
    },
    removeOnFail: {
      age: 86400 * 7, // keep failed for 7 days
    },
  },
});

emailQueue.on('error', (err) => {
  logger.error({ err }, 'BullMQ emailQueue error');
});

/**
 * Enqueues an email for dispatch at a specific timestamp using BullMQ delayed job.
 * Deterministic jobId = emailId for idempotency.
 */
export async function scheduleEmailJob(
  emailId: string,
  scheduledAt: Date
): Promise<string> {
  const now = Date.now();
  const delay = Math.max(0, scheduledAt.getTime() - now);

  const jobOptions: JobsOptions = {
    jobId: emailId, // Deterministic ID prevents duplicate job registration
    delay,
  };

  const job = await emailQueue.add(
    'send-email',
    { emailId },
    jobOptions
  );

  logger.info(
    {
      emailId,
      jobId: job.id,
      delayMs: delay,
      scheduledAt: scheduledAt.toISOString(),
    },
    'BullMQ delayed job added to queue'
  );

  return job.id!;
}
