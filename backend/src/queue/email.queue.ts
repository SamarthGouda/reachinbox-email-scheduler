import { Queue, JobsOptions } from 'bullmq';
import { getRedisConnectionOptions } from '../services/redis.service.js';
import { logger } from '../utils/logger.js';

export const EMAIL_QUEUE_NAME = 'email-dispatch-queue';

export interface EmailJobData {
  emailId: string;
}

const isMock = process.env.USE_MOCK_REDIS === 'true';

// In-memory fallback job handlers for local zero-config mode
type MockJobHandler = (job: { id: string; data: EmailJobData; attemptsMade: number; opts: { attempts: number } }) => Promise<any>;
let localWorkerHandler: MockJobHandler | null = null;

export function registerLocalMockWorkerHandler(handler: MockJobHandler) {
  localWorkerHandler = handler;
}

export const emailQueue: any = isMock
  ? {
      add: async (name: string, data: EmailJobData, opts?: JobsOptions) => {
        const jobId = opts?.jobId || data.emailId;
        const delay = opts?.delay || 0;
        logger.info({ emailId: data.emailId, jobId, delay }, '[Local Memory Queue] Job enqueued with delay ' + delay + 'ms');

        setTimeout(async () => {
          if (localWorkerHandler) {
            try {
              await localWorkerHandler({ id: jobId, data, attemptsMade: 0, opts: { attempts: 3 } });
            } catch (err: any) {
              logger.error({ err: err.message, jobId }, '[Local Memory Queue] Worker failed job');
            }
          }
        }, Math.max(10, delay));

        return { id: jobId };
      },
      getWaitingCount: async () => 0,
      getDelayedCount: async () => 0,
    }
  : new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400,
          count: 1000,
        },
        removeOnFail: {
          age: 86400 * 7,
        },
      },
    });

if (!isMock && emailQueue.on) {
  emailQueue.on('error', (err: any) => {
    // BullMQ error handled
  });
}

export async function scheduleEmailJob(
  emailId: string,
  scheduledAt: Date
): Promise<string> {
  const now = Date.now();
  const delay = Math.max(0, scheduledAt.getTime() - now);

  const jobOptions: JobsOptions = {
    jobId: emailId,
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
    'Email job enqueued successfully'
  );

  return job.id!;
}
