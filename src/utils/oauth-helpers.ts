import passport from '@/config/passport.config';
import { PlatformType } from '@/constants/auth';
import { env } from '@/env';
import crypto from 'crypto';
import { Request } from 'express';
import requestIp from 'request-ip';
import logger from './logger';
const STATE_SECRET = env.ACCESS_TOKEN_SECRET;

export const getGoogleAuthUrl = (encodedState: string): string => {
  const strategy = (passport as any)._strategies['google'] as any;

  if (!strategy) {
    throw new Error('Google strategy not configured');
  }

  const params = new URLSearchParams({
    client_id: strategy._oauth2._clientId,
    redirect_uri: `${env.BACKEND_URL}${strategy._callbackURL}`,
    response_type: 'code',
    scope: 'profile email',
    state: encodedState,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `${strategy._oauth2._authorizeUrl}?${params.toString()}`;
};

export const getFacebookAuthUrl = (encodedState: string): string => {
  const strategy = (passport as any)._strategies['facebook'] as any;

  if (!strategy) {
    throw new Error('Facebook strategy not configured');
  }

  const params = new URLSearchParams({
    client_id: strategy._oauth2._clientId,
    redirect_uri: `${env.BACKEND_URL}${strategy._callbackURL}`,
    response_type: 'code',
    scope: 'email',
    state: encodedState,
  });

  return `${strategy._oauth2._authorizeUrl}?${params.toString()}`;
};

const getWebOrigins = (): string[] => {
  return env.CORS_ALLOWED_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const getMobileSchemes = (): string[] => {
  const schemes = env.ALLOWED_MOBILE_SCHEMES.split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return schemes;
};

export const isValidRedirectUrl = (url: string, platform: string): boolean => {
  if (!url || typeof url !== 'string') return false;

  if (platform === PlatformType.WEB) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }

    try {
      const { origin } = new URL(url);
      return getWebOrigins().includes(origin);
    } catch {
      return false;
    }
  }

  if (platform === PlatformType.MOBILE) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return false;
    }

    if (!url.includes('://')) return false;

    const [scheme, path] = url.split('://');
    if (!scheme || !path) return false;

    return getMobileSchemes().includes(scheme.toLowerCase());
  }

  return false;
};

export const getValidatedRedirectUrl = (
  redirectUrl: string | undefined,
  platform: string,
  req: Request,
  endpoint: string
): string => {
  if (redirectUrl && isValidRedirectUrl(redirectUrl, platform)) {
    return redirectUrl;
  }
  if (redirectUrl) {
    logger.warn('Invalid redirect URL attempt', {
      requestedUrl: redirectUrl,
      clientIp: requestIp.getClientIp(req),
      userAgent: req.headers['user-agent'],
      endpoint,
    });
  }
  return env.FRONTEND_URL;
};

const createSignature = (data: string): string => {
  return crypto.createHmac('sha256', STATE_SECRET).update(data).digest('hex');
};

export const encodeState = (state: any): string => {
  const data = JSON.stringify(state);
  const signature = createSignature(data);
  return Buffer.from(JSON.stringify({ data, signature })).toString('base64');
};

export const decodeState = (encodedState: string): any | null => {
  try {
    const { data, signature } = JSON.parse(Buffer.from(encodedState, 'base64').toString());
    const expectedSignature = createSignature(data);

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    return JSON.parse(data);
  } catch {
    return null;
  }
};
