import 'dotenv-flow/config';
import { z } from 'zod';
import { AuthCallbacks } from './constants/auth';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().default(4001),
  DATABASE_URL: z.string().nonempty(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('http'),

  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  ALLOWED_MOBILE_SCHEMES: z.string().default('expo'),

  ACCESS_TOKEN_SECRET: z.string().nonempty(),
  REFRESH_TOKEN_SECRET: z.string().nonempty(),
  PASSWORD_RESET_TOKEN_SECRET: z.string().nonempty(),

  APP_NAME: z.string().nonempty(),
  FRONTEND_URL: z.url().default('http://localhost:3000'),
  BACKEND_URL: z.url().default('http://localhost:4000'),

  GOOGLE_CLIENT_ID: z.string().nonempty(),
  GOOGLE_CLIENT_SECRET: z.string().nonempty(),
  GOOGLE_CALLBACK_URL: z.string().default(AuthCallbacks.GOOGLE),

  FACEBOOK_CLIENT_ID: z.string().nonempty(),
  FACEBOOK_CLIENT_SECRET: z.string().nonempty(),
  FACEBOOK_CALLBACK_URL: z.string().default(AuthCallbacks.FACEBOOK),

  SMTP_SERVICE: z.string().nonempty().default('gmail'),
  SMTP_PASSWORD: z.string().nonempty(),
  SMTP_MAIL: z.string().nonempty(),

  CLOUDINARY_CLOUD_NAME: z.string().nonempty(),
  CLOUDINARY_API_KEY: z.string().nonempty(),
  CLOUDINARY_API_SECRET: z.string().nonempty(),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_URL: z.string().nonempty(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.log('Environment variables validation failed: ', parsedEnv.error.issues);
  throw new Error('There is an error with the environment variables. ');
}

export const env = {
  ...parsedEnv.data,
  isDev: parsedEnv.data.NODE_ENV === 'development',
  isProd: parsedEnv.data.NODE_ENV === 'production',
};

export type ENV = z.infer<typeof envSchema>;

declare global {
  namespace NodeJS {
    // @ts-ignore
    interface ProcessEnv extends ENV {}
  }
}
