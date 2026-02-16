import { db } from '@/database/db';
import { verifications, type InsertVerification, type Verification } from '@/database/schema';
import { SelectFields } from '@/types';
import { buildReturning, normalizeSelect } from '@/utils/repository-helpers';
import { Transaction } from '@/utils/transaction';
import { and, eq } from 'drizzle-orm';

export class VerificationRepository {
  static async create(
    data: InsertVerification,
    select?: SelectFields<Verification>,
    tx?: Transaction
  ) {
    const dbClient = tx ?? db;
    const [verification] = await dbClient
      .insert(verifications)
      .values(data)
      .returning(buildReturning(verifications, select));

    return verification as Verification;
  }

  static async createVerification(
    userId: string,
    type: string,
    platform: string,
    token: string,
    expiresAt: Date,
    tx?: Transaction
  ) {
    const dbClient = tx ?? db;

    await dbClient
      .delete(verifications)
      .where(
        and(
          eq(verifications.userId, userId),
          eq(verifications.type, type as any),
          eq(verifications.platform, platform as any)
        )
      );

    const [verification] = await dbClient
      .insert(verifications)
      .values({
        userId,
        type: type as any,
        platform: platform as any,
        token,
        expiresAt,
      })
      .returning();

    return verification;
  }

  static async findByToken(token: string, select?: SelectFields<Verification>) {
    return await db.query.verifications.findFirst({
      where: { token },
      columns: normalizeSelect(select),
    });
  }

  static async findByUserId(userId: string, select?: SelectFields<Verification>) {
    return await db.query.verifications.findMany({
      where: { userId },
      columns: normalizeSelect(select),
    });
  }

  static async findByUserAndType(
    userId: string,
    type: string,
    select?: SelectFields<Verification>
  ) {
    return await db.query.verifications.findFirst({
      where: {
        userId,
        type,
      },
      columns: normalizeSelect(select),
    });
  }

  static async findByUserTypePlatform(
    userId: string,
    type: string,
    platform: string,
    select?: SelectFields<Verification>
  ) {
    return await db.query.verifications.findFirst({
      where: {
        userId,
        type,
        platform,
      },
      columns: normalizeSelect(select),
    });
  }

  static async deleteByToken(token: string, tx?: Transaction): Promise<void> {
    const dbClient = tx ?? db;
    await dbClient.delete(verifications).where(eq(verifications.token, token));
  }

  static async deleteByUserId(userId: string, tx?: Transaction): Promise<void> {
    const dbClient = tx ?? db;
    await dbClient.delete(verifications).where(eq(verifications.userId, userId));
  }

  static async deleteAllByUserId(userId: string, tx?: Transaction) {
    const dbClient = tx ?? db;
    await dbClient.delete(verifications).where(eq(verifications.userId, userId));
  }

  static async deleteByUserAndType(userId: string, type: string, tx?: Transaction): Promise<void> {
    const dbClient = tx ?? db;
    await dbClient
      .delete(verifications)
      .where(and(eq(verifications.userId, userId), eq(verifications.type, type)));
  }
}
