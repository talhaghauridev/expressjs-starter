import { defineRelations } from 'drizzle-orm';
import * as schema from './index';

export const relations = defineRelations(schema, (r) => ({
  sessions: {
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.id,
    }),
  },
  users: {
    sessions: r.many.sessions(),
    verifications: r.many.verifications(),
  },

  verifications: {
    user: r.one.users({
      from: r.verifications.userId,
      to: r.users.id,
    }),
  },
}));
