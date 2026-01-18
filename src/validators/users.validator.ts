import { ApiMessages } from '@/constants/api-messages';
import { createSchema } from '@/utils/zod-schema-helper';
import { z } from 'zod';

export const updateProfileSchema = createSchema({
  body: {
    name: z
      .string({ error: ApiMessages.VALIDATION.MUST_BE_STRING('Name') })
      .trim()
      .min(2, { error: ApiMessages.VALIDATION.MIN_LENGTH('Name', 2), abort: true })
      .max(100, { error: ApiMessages.VALIDATION.MAX_LENGTH('Name', 100), abort: true }),
  },
});

export const changePasswordSchema = createSchema({
  body: z
    .strictObject({
      currentPassword: z
        .string({ error: ApiMessages.VALIDATION.REQUIRED('CurrentPassword') })
        .trim()
        .min(1, { error: ApiMessages.VALIDATION.REQUIRED('CurrentPassword') }),
      newPassword: z
        .string({ error: ApiMessages.VALIDATION.REQUIRED('NewPassword') })
        .trim()
        .min(8, { error: ApiMessages.VALIDATION.MIN_LENGTH('NewPassword', 8), abort: true })
        .max(100, { error: ApiMessages.VALIDATION.MAX_LENGTH('NewPassword', 100), abort: true }),
      confirmPassword: z
        .string({ error: ApiMessages.VALIDATION.REQUIRED('ConfirmPassword') })
        .trim()
        .min(8, { error: ApiMessages.VALIDATION.MIN_LENGTH('ConfirmPassword', 8), abort: true })
        .max(100, {
          error: ApiMessages.VALIDATION.MAX_LENGTH('ConfirmPassword', 100),
          abort: true,
        }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }),
});

export const deleteAccountSchema = createSchema({
  body: {
    password: z
      .string({ error: ApiMessages.VALIDATION.REQUIRED('Password') })
      .trim()
      .min(1, { error: ApiMessages.VALIDATION.REQUIRED('Password') }),
  },
});

export const deleteSessionSchema = createSchema({
  params: {
    sessionId: z
      .string({ error: ApiMessages.VALIDATION.REQUIRED('SessionId') })
      .trim()
      .min(1, { error: ApiMessages.VALIDATION.REQUIRED('SessionId') }),
  },
});

export const uploadAvatarSchema = createSchema({
  body: {
    previousImageUrl: z.url().optional(),
  },
});
