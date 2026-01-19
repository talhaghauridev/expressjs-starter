import { ApiMessages } from '@/constants/api-messages';
import { createSchema } from '@/utils/validation-helpers';
import { z } from 'zod';

export const registerSchema = createSchema({
  body: {
    name: z
      .string({ error: ApiMessages.VALIDATION.REQUIRED('Name') })
      .trim()
      .min(2, { error: ApiMessages.VALIDATION.MIN_LENGTH('Name', 2), abort: true })
      .max(100, { error: ApiMessages.VALIDATION.MAX_LENGTH('Name', 100), abort: true }),
    email: z.email({ error: ApiMessages.VALIDATION.INVALID_EMAIL }),
    password: z
      .string({ error: ApiMessages.VALIDATION.REQUIRED('Password') })
      .trim()
      .min(8, { error: ApiMessages.VALIDATION.MIN_LENGTH('Password', 8), abort: true })
      .max(100, { error: ApiMessages.VALIDATION.MAX_LENGTH('Password', 100), abort: true }),
  },
});

export const loginSchema = createSchema({
  body: {
    email: z.email({ error: ApiMessages.VALIDATION.INVALID_EMAIL }),
    password: z
      .string({ error: ApiMessages.VALIDATION.REQUIRED('Password') })
      .trim()
      .min(8, { error: ApiMessages.VALIDATION.MIN_LENGTH('Password', 8), abort: true })
      .max(100, { error: ApiMessages.VALIDATION.MAX_LENGTH('Password', 100), abort: true }),
  },
});

export const verifyEmailSchema = createSchema({
  query: {
    token: z
      .string({ error: ApiMessages.VALIDATION.MUST_BE_STRING('Token') })
      .trim()
      .min(1, { error: ApiMessages.VALIDATION.REQUIRED('Token') }),
  },
});

export const verifyEmailOTPSchema = createSchema({
  body: {
    email: z.email({ error: ApiMessages.VALIDATION.INVALID_EMAIL }),
    otp: z
      .string({ error: ApiMessages.VALIDATION.REQUIRED('OTP') })
      .trim()
      .length(6, { error: 'OTP must be 6 characters' })
      .regex(/^\d+$/, { error: 'OTP must contain only digits' }),
  },
});

export const resendVerificationSchema = createSchema({
  body: {
    email: z.email({ error: ApiMessages.VALIDATION.INVALID_EMAIL }),
  },
});

export const refreshTokenSchema = createSchema({
  body: {
    refreshToken: z
      .string({ error: ApiMessages.VALIDATION.REQUIRED('Refresh-token') })
      .trim()
      .min(1, ApiMessages.VALIDATION.REQUIRED('Refresh token')),
  },
});

export const logoutSchema = createSchema({
  body: {
    refreshToken: z
      .string({ error: ApiMessages.VALIDATION.REQUIRED('Refresh-token') })
      .trim()
      .min(1, ApiMessages.VALIDATION.REQUIRED('Refresh token')),
  },
});

export const oauthSchema = createSchema({
  query: {
    redirectUrl: z
      .string({ error: ApiMessages.VALIDATION.REQUIRED('RedirectUrl') })
      .trim()
      .optional(),
  },
});

export const forgotPasswordSchema = createSchema({
  body: {
    email: z.email({ error: ApiMessages.VALIDATION.INVALID_EMAIL }),
  },
});

export const resetPasswordSchema = createSchema({
  body: z
    .strictObject({
      token: z
        .string({ error: ApiMessages.VALIDATION.MUST_BE_STRING('Token') })
        .trim()
        .min(1, { error: ApiMessages.VALIDATION.REQUIRED('Token') }),
      password: z
        .string({ error: ApiMessages.VALIDATION.REQUIRED('Password') })
        .trim()
        .min(8, { error: ApiMessages.VALIDATION.MIN_LENGTH('Password', 8), abort: true })
        .max(100, { error: ApiMessages.VALIDATION.MAX_LENGTH('Password', 100), abort: true }),
      confirmPassword: z
        .string({ error: ApiMessages.VALIDATION.REQUIRED('ConfirmPassword') })
        .trim()
        .min(8, { error: ApiMessages.VALIDATION.MIN_LENGTH('ConfirmPassword', 8), abort: true })
        .max(100, {
          error: ApiMessages.VALIDATION.MAX_LENGTH('ConfirmPassword', 100),
          abort: true,
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }),
});

export const verifyResetPasswordOTPSchema = createSchema({
  body: z.strictObject({
    email: z.email({ error: ApiMessages.VALIDATION.INVALID_EMAIL }),
    otp: z
      .string({ error: ApiMessages.VALIDATION.REQUIRED('OTP') })
      .trim()
      .length(6, { error: 'OTP must be 6 characters' })
      .regex(/^\d+$/, { error: 'OTP must contain only digits' }),
  }),
});

export const resetPasswordOTPSchema = createSchema({
  body: z
    .strictObject({
      resetToken: z
        .string({ error: ApiMessages.VALIDATION.MUST_BE_STRING('ResetToken') })
        .trim()
        .min(1, { error: ApiMessages.VALIDATION.REQUIRED('ResetToken') }),
      password: z
        .string({ error: ApiMessages.VALIDATION.REQUIRED('Password') })
        .trim()
        .min(8, { error: ApiMessages.VALIDATION.MIN_LENGTH('Password', 8), abort: true })
        .max(100, { error: ApiMessages.VALIDATION.MAX_LENGTH('Password', 100), abort: true }),
      confirmPassword: z
        .string({ error: ApiMessages.VALIDATION.REQUIRED('ConfirmPassword') })
        .trim()
        .min(8, { error: ApiMessages.VALIDATION.MIN_LENGTH('ConfirmPassword', 8), abort: true })
        .max(100, {
          error: ApiMessages.VALIDATION.MAX_LENGTH('ConfirmPassword', 100),
          abort: true,
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }),
});

export const resendResetPasswordSchema = createSchema({
  body: {
    email: z.email({ error: ApiMessages.VALIDATION.INVALID_EMAIL }),
  },
});
