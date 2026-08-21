import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { prisma } from '../services/prisma.service.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class AuthController {
  public static async getGoogleUrl(_req: Request, res: Response, next: NextFunction) {
    try {
      const url = AuthService.getGoogleAuthUrl();
      res.json({ url });
    } catch (error) {
      next(error);
    }
  }

  public static async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const code = req.query.code as string;
      if (!code) {
        res.redirect(`${config.frontendUrl}/login?error=no_code`);
        return;
      }

      const profile = await AuthService.verifyGoogleCode(code);
      const user = await AuthService.findOrCreateGoogleUser(profile);
      const token = AuthService.generateToken(user);

      // Redirect to frontend with token
      res.redirect(`${config.frontendUrl}/auth/callback?token=${token}`);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Google OAuth Callback Failed');
      res.redirect(`${config.frontendUrl}/login?error=${encodeURIComponent(error.message || 'auth_failed')}`);
    }
  }

  public static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          senders: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          senders: user.senders,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async demoLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email = 'oliver.brown@domain.io', name = 'Oliver Brown' } = req.body;
      const user = await AuthService.findOrCreateDemoUser(email, name);
      const token = AuthService.generateToken(user);

      res.json({
        message: 'Logged in successfully (Demo/Dev mode)',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logout(_req: Request, res: Response) {
    res.json({ message: 'Logged out successfully' });
  }
}
