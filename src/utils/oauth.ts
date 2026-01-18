import passport from '@/config/passport.config';
import { env } from '@/env';

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

export const isValidRedirectUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;

  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const { origin } = new URL(url);
      return getWebOrigins().includes(origin);
    } catch {
      return false;
    }
  }

  if (!url.includes('://')) return false;

  const [scheme, path] = url.split('://');

  if (!scheme || !path) return false;

  return getMobileSchemes().includes(scheme.toLowerCase());
};
