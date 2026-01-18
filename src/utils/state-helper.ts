import crypto from 'crypto';
import { env } from '@/env';

const STATE_SECRET = env.ACCESS_TOKEN_SECRET;

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
