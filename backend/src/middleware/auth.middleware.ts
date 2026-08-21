import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { prisma } from '../services/prisma.service.js';
import { logger } from '../utils/logger.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    avatar?: string | null;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required: No token provided' });
      return;
    }

    const payload = AuthService.verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    logger.warn({ error: error.message }, 'Authentication token verification failed');
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
