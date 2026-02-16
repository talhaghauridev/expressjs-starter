import { db } from '@/database/db';
import { sessions, type InsertSession, type Session } from '@/database/schema';
import { SelectFields } from '@/types';
import { buildReturning, normalizeSelect } from '@/utils/repository-helpers';
import { Transaction } from '@/utils/transaction';
import { and, eq, lt, sql } from 'drizzle-orm';

export class SessionRepository {
  static async create(
    data: InsertSession,
    select?: SelectFields<Session>,
    tx?: Transaction
  ): Promise<Session> {
    const dbClient = tx ?? db;
    const [session] = await dbClient
      .insert(sessions)
      .values(data)
      .returning(buildReturning(sessions, select));

    return session as Session;
  }

  static async findByRefreshToken(refreshToken: string, select?: SelectFields<Session>) {
    return await db.query.sessions.findFirst({
      where: { refreshToken },
      columns: normalizeSelect(select),
    });
  }

  static async findByUserId(userId: string, select?: SelectFields<Session>) {
    return await db.query.sessions.findMany({
      where: { userId },
      columns: normalizeSelect(select),
      orderBy: { createdAt: 'desc' },
    });
  }

  static async deleteByRefreshToken(refreshToken: string, tx?: Transaction): Promise<void> {
    const dbClient = tx ?? db;
    await dbClient.delete(sessions).where(eq(sessions.refreshToken, refreshToken));
  }

  static async update(
    sessionId: string,
    data: Partial<typeof sessions.$inferInsert>,
    select?: SelectFields<Session>,
    tx?: Transaction
  ) {
    const dbClient = tx ?? db;
    const [updated] = await dbClient
      .update(sessions)
      .set(data)
      .where(eq(sessions.id, sessionId))
      .returning(buildReturning(sessions, select));

    return updated as Session;
  }

  static async deleteByUserId(userId: string, tx?: Transaction): Promise<void> {
    const dbClient = tx ?? db;
    await dbClient.delete(sessions).where(eq(sessions.userId, userId));
  }

  static async deleteByUserIdExceptCurrent(
    userId: string,
    currentRefreshToken: string,
    tx?: Transaction
  ): Promise<void> {
    const dbClient = tx ?? db;
    await dbClient
      .delete(sessions)
      .where(
        and(eq(sessions.userId, userId), sql`${sessions.refreshToken} != ${currentRefreshToken}`)
      );
  }

  static async deleteById(sessionId: string, tx?: Transaction) {
    const dbClient = tx ?? db;
    await dbClient.delete(sessions).where(eq(sessions.id, sessionId));
  }

  static async deleteAllByUserId(userId: string, tx?: Transaction) {
    const dbClient = tx ?? db;
    await dbClient.delete(sessions).where(eq(sessions.userId, userId));
  }

  static async deleteExpired(): Promise<void> {
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  }
}
