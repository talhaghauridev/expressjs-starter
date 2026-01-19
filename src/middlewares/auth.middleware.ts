import { TokenService } from '@/services/token.service';
import ApiError from '@/utils/api-error';
import { NextFunction, Request, Response } from 'express';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('No token provided'));
    }

    const token = authHeader.split(' ')[1]!;
    const decoded = TokenService.verifyAccessToken(token);

    if (!decoded) {
      return next(ApiError.unauthorized('Invalid or expired token'));
    }

    req.user = decoded;
    next();
  } catch (error: any) {
    return next(ApiError.unauthorized('Authentication failed'));
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }

    next();
  };
};
