import { ApiMessages } from '@/constants/api-messages';
import { AvailableUserRoles } from '@/constants/auth';
import { createSchema } from '@/utils/validation-helpers';
import { z } from 'zod';

export const listUsersSchema = createSchema({
  query: {
    page: z.coerce
      .number({ error: ApiMessages.VALIDATION.MUST_BE_NUMBER('Page') })
      .int()
      .positive()
      .default(1)
      .optional(),
    limit: z.coerce
      .number({ error: ApiMessages.VALIDATION.MUST_BE_NUMBER('Limit') })
      .int()
      .positive()
      .max(100, { error: ApiMessages.VALIDATION.VALUE_TOO_LARGE('Limit', 100), abort: true })
      .default(10)
      .optional(),
    role: z.enum(AvailableUserRoles as [string, ...string[]]).optional(),
    search: z
      .string()
      .trim()
      .max(100, { error: ApiMessages.VALIDATION.MAX_LENGTH('Search', 100) })
      .optional(),
  },
});

export const getUserByIdSchema = createSchema({
  params: {
    id: z
      .string({ error: ApiMessages.VALIDATION.REQUIRED('User ID') })
      .nonempty({ error: ApiMessages.VALIDATION.REQUIRED('User ID') }),
  },
});

export const updateUserRoleSchema = createSchema({
  params: {
    id: z
      .string({ error: ApiMessages.VALIDATION.REQUIRED('User ID') })
      .nonempty({ error: ApiMessages.VALIDATION.REQUIRED('User ID') }),
  },
  body: {
    role: z.enum(AvailableUserRoles as [string, ...string[]], {
      error: 'Role must be one of: admin, user, moderator',
    }),
  },
});

export const deleteUserSchema = createSchema({
  params: {
    id: z
      .string({ error: ApiMessages.VALIDATION.REQUIRED('User ID') })
      .nonempty({ error: ApiMessages.VALIDATION.REQUIRED('User ID') }),
  },
});
