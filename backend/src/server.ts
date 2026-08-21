import { app } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { initDefaultSmtpTransporter } from './services/smtp.service.js';
import { createEmailWorker } from './queue/email.worker.js';
import { prisma } from './services/prisma.service.js';
import { redisClient } from './services/redis.service.js';

let workerInstance: any = null;

async function startServer() {
  try {
    logger.info('Starting ReachInbox Scheduler Backend Server...');

    // Initialize Ethereal SMTP transporter
    await initDefaultSmtpTransporter();

    // Start Worker automatically if not disabled
    if (process.env.START_WORKER !== 'false') {
      workerInstance = createEmailWorker();
      logger.info('Integrated BullMQ Worker initiated');
    }

    const server = app.listen(config.port, () => {
      logger.info(`ReachInbox Scheduler Server running on http://localhost:${config.port}`);
      logger.info(`Health check available at http://localhost:${config.port}/health`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        if (workerInstance) {
          await workerInstance.close();
        }
        await prisma.$disconnect();
        redisClient.disconnect();
        logger.info('Closed all connections. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();
