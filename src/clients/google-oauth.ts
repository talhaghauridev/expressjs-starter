import { OAuth2Client } from 'google-auth-library';
import { env } from '@/env';

export const googleOAuthClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
