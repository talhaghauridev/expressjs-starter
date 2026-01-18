import { VerificationType } from '@/constants/auth';
import { ExpiryTime } from '@/constants/expiry';
import { User } from '@/database/schema';
import { env } from '@/env';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';

type TokenPayload = Pick<User, 'id' | 'name' | 'email' | 'role' | 'provider'>;

const PASSWORD_RESET_SECRET = env.PASSWORD_RESET_TOKEN_SECRET;

export class TokenService {
  static generateAccessToken(payload: TokenPayload) {
    return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
      expiresIn: ExpiryTime.ACCESS_TOKEN as SignOptions['expiresIn'],
    });
  }

  static generateAccessAndRefreshToken(payload: TokenPayload) {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken();
    return { accessToken, refreshToken };
  }

  static generateRefreshToken() {
    return crypto.randomUUID();
  }

  static verifyAccessToken(token: string) {
    try {
      return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }

  static generatePasswordResetToken(userId: string): string {
    const payload = {
      userId,
      type: VerificationType.PASSWORD_RESET,
    };

    return jwt.sign(payload, PASSWORD_RESET_SECRET, {
      expiresIn: ExpiryTime.PASSWORD_RESET_TOKEN,
    });
  }

  static verifyPasswordResetToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, PASSWORD_RESET_SECRET) as any;

      if (decoded.type !== VerificationType.PASSWORD_RESET) {
        return null;
      }

      return { userId: decoded.userId };
    } catch (error) {
      return null;
    }
  }

  static decodeToken(token: string) {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }
}
