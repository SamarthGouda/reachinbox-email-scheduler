import dotenv from 'dotenv';
import path from 'path';

// Load .env from current directory or parent directory
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'reachinbox_default_jwt_secret_key_32_chars',
  
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/reachinbox_scheduler?schema=public',
  
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    minEmailDelayMs: parseInt(process.env.MIN_EMAIL_DELAY_MS || '2000', 10),
    maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || '200', 10),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  },

  ethereal: {
    host: process.env.ETHEREAL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.ETHEREAL_PORT || '587', 10),
    user: process.env.ETHEREAL_USER || '',
    password: process.env.ETHEREAL_PASSWORD || '',
    fromName: process.env.ETHEREAL_FROM_NAME || 'ReachInbox Scheduler',
    fromEmail: process.env.ETHEREAL_FROM_EMAIL || 'scheduler@reachinbox.ai',
  }
};
