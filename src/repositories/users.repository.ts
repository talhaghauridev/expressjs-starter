import { db } from '@/database/db';
import { users, type InsertUser, type User } from '@/database/schema';
import { SelectFields } from '@/types';
import { buildReturning, normalizeSelect } from '@/utils/repository-helpers';
import { Transaction } from '@/utils/transaction';
import { and, eq, sql } from 'drizzle-orm';

export class UserRepository {
  static async create(data: InsertUser, select?: SelectFields<User>, tx?: Transaction) {
    const dbClient = tx ?? db;
    const [user] = await dbClient
      .insert(users)
      .values(data)
      .returning(buildReturning<User>(users, select));
    return user as User;
  }

  static async findById(id: string, select?: SelectFields<User>) {
    return await db.query.users.findFirst({
      where: { id },
      columns: normalizeSelect(select),
    });
  }

  static async findByEmail(email: string, select?: SelectFields<User>) {
    return await db.query.users.findFirst({
      where: { email },
      columns: normalizeSelect(select),
    });
  }

  static async findByIdWithLocations(id: string, select?: SelectFields<User>) {
    return await db.query.users.findFirst({
      where: { id },
      columns: normalizeSelect(select),
      with: {
        locations: true,
      },
    });
  }

  static async update(
    id: string,
    data: Partial<InsertUser>,
    select?: SelectFields<User>,
    tx?: Transaction
  ) {
    const dbClient = tx ?? db;
    const [updated] = await dbClient
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning(buildReturning(users, select));
    return updated as User;
  }

  static async delete(id: string, tx?: Transaction): Promise<void> {
    const dbClient = tx ?? db;
    await dbClient.delete(users).where(eq(users.id, id));
  }

  static async findAll(
    options: { page: number; limit: number; role?: string; search?: string },
    select?: SelectFields<User>
  ) {
    const offset = (options.page - 1) * options.limit;

    let whereClause: any = {};

    if (options.role) {
      whereClause.role = options.role;
    }

    if (options.search) {
      whereClause.OR = [
        { name: { ilike: `%${options.search}%` } },
        { email: { ilike: `%${options.search}%` } },
      ];
    }

    return await db.query.users.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      columns: normalizeSelect(select),
      limit: options.limit,
      offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  static async count(filters?: { role?: string }) {
    const conditions = [];
    if (filters?.role) conditions.push(eq(users.role, filters.role));

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(conditions.length ? and(...conditions) : undefined);

    return Number(result[0]?.count ?? 0);
  }

  static async countByRole() {
    const result = await db
      .select({
        role: users.role,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .groupBy(users.role);

    return result.reduce(
      (acc, row) => {
        acc[row.role] = Number(row.count);
        return acc;
      },
      {} as Record<string, number>
    );
  }
}
