import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma.service.js';
import { scheduleEmailJob } from '../queue/email.queue.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const scheduleEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  recipients: z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient is required'),
  startTime: z.string().or(z.date()).optional(),
  delayMs: z.number().int().min(0).optional(),
  hourlyLimit: z.number().int().min(1).optional(),
  senderId: z.string().optional(),
});

export class EmailController {
  public static async schedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const {
        subject,
        body,
        recipients,
        startTime,
        delayMs = config.worker.minEmailDelayMs,
        hourlyLimit = config.worker.maxEmailsPerHour,
        senderId,
      } = req.body;

      // Deduplicate recipient emails
      const uniqueRecipients: string[] = Array.from(new Set(recipients.map((r: string) => r.trim().toLowerCase())));

      if (uniqueRecipients.length === 0) {
        res.status(400).json({ error: 'No valid recipient email addresses provided' });
        return;
      }

      // Calculate base start time
      let baseStartTime = startTime ? new Date(startTime) : new Date();
      if (isNaN(baseStartTime.getTime()) || baseStartTime.getTime() < Date.now()) {
        baseStartTime = new Date();
      }

      // Resolve Sender
      let effectiveSenderId = senderId;
      if (!effectiveSenderId) {
        const defaultSender = await prisma.sender.findFirst({
          where: { userId, isDefault: true },
        });
        if (defaultSender) {
          effectiveSenderId = defaultSender.id;
        }
      }

      // 1. Create Campaign record
      const campaign = await prisma.campaign.create({
        data: {
          userId,
          subject,
          body,
          startTime: baseStartTime,
          delayMs,
          hourlyLimit,
        },
      });

      // 2. Schedule each email
      const scheduledEmails = [];

      for (let i = 0; i < uniqueRecipients.length; i++) {
        const recipient = uniqueRecipients[i];
        // Space each email by delayMs interval
        const emailScheduledAt = new Date(baseStartTime.getTime() + i * delayMs);

        // Save email record in PostgreSQL first
        const emailRecord = await prisma.email.create({
          data: {
            campaignId: campaign.id,
            senderId: effectiveSenderId || null,
            to: recipient,
            subject,
            body,
            scheduledAt: emailScheduledAt,
            status: 'SCHEDULED',
            sequenceNumber: i + 1,
          },
        });

        // Enqueue BullMQ delayed job using deterministic jobId = emailRecord.id
        const bullJobId = await scheduleEmailJob(emailRecord.id, emailScheduledAt);

        // Update email record with BullMQ job ID
        const updatedEmail = await prisma.email.update({
          where: { id: emailRecord.id },
          data: { bullJobId },
        });

        scheduledEmails.push(updatedEmail);
      }

      logger.info(
        {
          userId,
          campaignId: campaign.id,
          recipientCount: uniqueRecipients.length,
          startTime: baseStartTime.toISOString(),
          delayMs,
        },
        'Campaign created and emails scheduled into BullMQ queue successfully'
      );

      res.status(201).json({
        message: `Successfully scheduled ${uniqueRecipients.length} email(s)`,
        campaignId: campaign.id,
        count: uniqueRecipients.length,
        scheduledEmails,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getScheduledEmails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const search = (req.query.search as string) || '';
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const skip = (page - 1) * limit;

      const whereClause: any = {
        campaign: {
          userId,
        },
        status: {
          in: ['SCHEDULED', 'PROCESSING'],
        },
      };

      if (search) {
        whereClause.OR = [
          { to: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { body: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [emails, total] = await Promise.all([
        prisma.email.findMany({
          where: whereClause,
          orderBy: { scheduledAt: 'asc' },
          skip,
          take: limit,
          include: {
            sender: true,
          },
        }),
        prisma.email.count({ where: whereClause }),
      ]);

      res.json({
        emails,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getSentEmails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const search = (req.query.search as string) || '';
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const skip = (page - 1) * limit;

      const whereClause: any = {
        campaign: {
          userId,
        },
        status: 'SENT',
      };

      if (search) {
        whereClause.OR = [
          { to: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { body: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [emails, total] = await Promise.all([
        prisma.email.findMany({
          where: whereClause,
          orderBy: { sentAt: 'desc' },
          skip,
          take: limit,
          include: {
            sender: true,
          },
        }),
        prisma.email.count({ where: whereClause }),
      ]);

      res.json({
        emails,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getEmailStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const [scheduledCount, processingCount, sentCount, failedCount] = await Promise.all([
        prisma.email.count({
          where: { campaign: { userId }, status: 'SCHEDULED' },
        }),
        prisma.email.count({
          where: { campaign: { userId }, status: 'PROCESSING' },
        }),
        prisma.email.count({
          where: { campaign: { userId }, status: 'SENT' },
        }),
        prisma.email.count({
          where: { campaign: { userId }, status: 'FAILED' },
        }),
      ]);

      res.json({
        scheduled: scheduledCount + processingCount,
        sent: sentCount,
        failed: failedCount,
        total: scheduledCount + processingCount + sentCount + failedCount,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getEmailById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const email = await prisma.email.findFirst({
        where: {
          id,
          campaign: { userId },
        },
        include: {
          sender: true,
          campaign: true,
        },
      });

      if (!email) {
        res.status(404).json({ error: 'Email not found' });
        return;
      }

      res.json({ email });
    } catch (error) {
      next(error);
    }
  }
}
