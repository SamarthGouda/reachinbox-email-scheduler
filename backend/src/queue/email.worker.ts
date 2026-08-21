import { Worker, Job } from 'bullmq';
import { getRedisConnectionOptions } from '../services/redis.service.js';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from './email.queue.js';
import { prisma } from '../services/prisma.service.js';
import { sendEmail } from '../services/smtp.service.js';
import { RateLimiterService } from '../services/rate-limiter.service.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export function createEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId } = job.data;
      logger.info({ jobId: job.id, emailId, attempt: job.attemptsMade + 1 }, 'Worker processing email job');

      // 1. Load email from Database with Sender and Campaign relations
      const email = await prisma.email.findUnique({
        where: { id: emailId },
        include: {
          sender: true,
          campaign: true,
        },
      });

      if (!email) {
        logger.warn({ emailId }, 'Email record not found in database. Job completed without action.');
        return { success: false, reason: 'NOT_FOUND' };
      }

      // 2. IDEMPOTENCY CHECK: If already sent, skip immediately
      if (email.status === 'SENT') {
        logger.info(
          { emailId, sentAt: email.sentAt },
          'Idempotency guard: Email has already been SENT. Skipping duplicate dispatch.'
        );
        return { success: true, alreadySent: true };
      }

      // 3. Rate limiting check (Redis-backed atomic hourly limit)
      const senderId = email.senderId || email.campaign?.userId || 'default-sender';
      const hourlyLimit = email.campaign?.hourlyLimit || config.worker.maxEmailsPerHour;

      const rateLimitCheck = await RateLimiterService.checkAndConsumeHourlyLimit(senderId, hourlyLimit);
      if (!rateLimitCheck.allowed) {
        const delayMs = rateLimitCheck.delayUntilNextWindowMs || 3600000;
        const newScheduledTime = new Date(Date.now() + delayMs);

        logger.warn(
          { emailId, senderId, delayMs, newScheduledTime: newScheduledTime.toISOString() },
          'Hourly rate limit hit. Rescheduling email into next available window (not dropped).'
        );

        // Update database scheduledAt timestamp
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SCHEDULED',
            scheduledAt: newScheduledTime,
          },
        });

        // Re-enqueue delayed job
        await emailQueue.add(
          'send-email',
          { emailId },
          {
            jobId: `${emailId}-window-${newScheduledTime.getTime()}`,
            delay: delayMs,
          }
        );

        return { success: false, rateLimited: true, rescheduledTo: newScheduledTime };
      }

      // 4. Minimum Delay Check between consecutive emails
      const minDelayMs = email.campaign?.delayMs || config.worker.minEmailDelayMs;
      const waitMs = await RateLimiterService.acquireDelaySlot(senderId, minDelayMs);
      if (waitMs > 0) {
        logger.info({ emailId, waitMs }, `Applying minimum delay of ${waitMs}ms before SMTP dispatch`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }

      // 5. Atomic state update to PROCESSING
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
        },
      });

      try {
        // 6. Send email via Nodemailer / Ethereal SMTP
        const sendResult = await sendEmail({
          to: email.to,
          subject: email.subject,
          body: email.body,
          sender: email.sender,
        });

        // 7. Update status to SENT with timestamp
        const updatedEmail = await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            lastError: null,
          },
        });

        logger.info(
          {
            emailId: updatedEmail.id,
            messageId: sendResult.messageId,
            previewUrl: sendResult.previewUrl || 'N/A',
            to: updatedEmail.to,
          },
          'Email dispatched and marked SENT in database'
        );

        return {
          success: true,
          messageId: sendResult.messageId,
          previewUrl: sendResult.previewUrl,
        };
      } catch (sendError: any) {
        logger.error(
          { emailId, error: sendError.message, stack: sendError.stack },
          'Error dispatching email via SMTP'
        );

        // Check if this was the last attempt
        const currentAttempts = (email.attempts || 0) + 1;
        const maxAttempts = job.opts.attempts || 3;

        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: currentAttempts >= maxAttempts ? 'FAILED' : 'SCHEDULED',
            lastError: sendError.message || 'Unknown SMTP error',
          },
        });

        // Re-throw so BullMQ initiates configured exponential backoff retry
        throw sendError;
      }
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: config.worker.concurrency,
    }
  );

  worker.on('ready', () => {
    logger.info(`BullMQ Worker ready with concurrency = ${config.worker.concurrency}`);
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Job completed successfully');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Job failed');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Worker system error');
  });

  return worker;
}
