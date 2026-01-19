import { AvailableLocationTypes } from '@/constants/auth';
import { timestamps } from '@/utils/schema-helpers';
import { index, pgEnum, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';
import { platformEnum } from './verifications';

export const locationTypeEnum = pgEnum(
  'location_type',
  AvailableLocationTypes as [string, ...string[]]
);

export const userLocations = pgTable(
  'user_locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: locationTypeEnum('type').notNull(),

    country: varchar('country', { length: 100 }),
    city: varchar('city', { length: 100 }),
    ip: varchar('ip', { length: 45 }),

    platform: platformEnum('platform').notNull(),
    device: varchar('device', { length: 100 }),
    browser: varchar('browser', { length: 100 }),

    ...timestamps,
  },
  (t) => [index('user_id_type_idx').on(t.userId, t.type)]
);

export type UserLocation = typeof userLocations.$inferSelect;
export type InsertUserLocation = typeof userLocations.$inferInsert;
