import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma.service.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const oauthClient = new OAuth2Client(
  config.google.clientId,
  config.google.clientSecret,
  config.google.callbackUrl
);

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export class AuthService {
  public static getGoogleAuthUrl(): string {
    if (!config.google.clientId) {
      logger.warn('Google Client ID is not configured. Google OAuth will not function until credentials are provided.');
    }
    return oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      prompt: 'consent',
    });
  }

  public static async verifyGoogleCode(code: string) {
    const { tokens } = await oauthClient.getToken(code);
    oauthClient.setCredentials(tokens);

    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error('Invalid Google payload: email missing');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      avatar: payload.picture,
    };
  }

  public static async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }) {
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.googleId }, { email: profile.email }],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: profile.googleId,
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar,
        },
      });

      // Create default sender for user
      await prisma.sender.create({
        data: {
          userId: user.id,
          email: profile.email,
          displayName: profile.name,
          smtpUser: profile.email,
          smtpPassword: 'default_password',
          isDefault: true,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.googleId,
          avatar: profile.avatar || user.avatar,
        },
      });
    }

    return user;
  }

  public static async findOrCreateDemoUser(email = 'oliver.brown@domain.io', name = 'Oliver Brown') {
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
      });

      await prisma.sender.create({
        data: {
          userId: user.id,
          email: user.email,
          displayName: user.name,
          smtpUser: user.email,
          smtpPassword: 'default_password',
          isDefault: true,
        },
      });
    }

    return user;
  }

  public static generateToken(user: { id: string; email: string; name: string }): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  public static verifyToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  }
}
