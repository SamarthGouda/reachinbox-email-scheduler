import { createEmailWorker } from './queue/email.worker.js';
import { initDefaultSmtpTransporter } from './services/smtp.service.js';
import { prisma } from './services/prisma.service.js';
import { redisClient } from './services/redis.service.js';
import { logger } from './utils/logger.js';

async function startWorker() {
  try {
    logger.info('Starting Standalone BullMQ Email Worker Process...');
    await initDefaultSmtpTransporter();

    const worker = createEmailWorker();

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down standalone worker...`);
      await worker.close();
      await prisma.$disconnect();
      redisClient.disconnect();
      logger.info('Worker closed gracefully.');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error({ error }, 'Failed to start standalone worker');
    process.exit(1);
  }
}

startWorker();
