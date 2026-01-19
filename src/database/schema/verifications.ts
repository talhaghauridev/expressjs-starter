import { AvailablePlatforms, AvailableVerifications } from '@/constants/auth';
import { timestamps } from '@/utils/schema-helpers';
import { index, pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const verificationTypeEnum = pgEnum(
  'verification_type',
  AvailableVerifications as [string, ...string[]]
);

export const platformEnum = pgEnum('platform', AvailablePlatforms as [string, ...string[]]);

export const verifications = pgTable(
  'verifications',
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    type: verificationTypeEnum('type').notNull(),
    platform: platformEnum('platform').notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    ...timestamps,
  },
  (t) => [
    index('user_type_platform_idx').on(t.userId, t.type, t.platform),
    uniqueIndex('token_idx').on(t.token),
  ]
);

export type Verification = typeof verifications.$inferSelect;
export type InsertVerification = typeof verifications.$inferInsert;
