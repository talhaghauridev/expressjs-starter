import { AvailableLocationTypes, LocationType } from '@/constants/auth';
import { db } from '@/database/db';
import { userLocations, type InsertUserLocation, type UserLocation } from '@/database/schema';
import { SelectFields } from '@/types';
import { buildReturning, normalizeSelect } from '@/utils/repository-helpers';
import { Transaction } from '@/utils/transaction';
import { eq } from 'drizzle-orm';

export class UserLocationRepository {
  static async create(
    data: InsertUserLocation,
    select?: SelectFields<UserLocation>,
    tx?: Transaction
  ) {
    const dbClient = tx ?? db;
    const [location] = await dbClient
      .insert(userLocations)
      .values(data)
      .returning(buildReturning(userLocations, select));

    return location as UserLocation;
  }

  static async upsertLastLogin(
    userId: string,
    locationData: Omit<InsertUserLocation, 'userId' | 'type'>,
    select?: SelectFields<UserLocation>,
    tx?: Transaction
  ) {
    const execute = async (trx: Transaction) => {
      const existing = await trx.query.userLocations.findFirst({
        where: {
          userId,
          type: LocationType.LAST_LOGIN,
        },
        columns: {
          userId: true,
          id: true,
        },
      });

      if (existing) {
        const [updated] = await trx
          .update(userLocations)
          .set({
            ...locationData,
            updatedAt: new Date(),
          })
          .where(eq(userLocations.id, existing.id))
          .returning(buildReturning(userLocations, select));

        return updated;
      }

      const [created] = await trx
        .insert(userLocations)
        .values({
          userId,
          type: LocationType.LAST_LOGIN,
          ...locationData,
        })
        .returning(buildReturning(userLocations, select));

      return created;
    };

    if (tx) {
      return await execute(tx);
    }

    return await db.transaction(execute);
  }

  static async findByUserId(userId: string, select?: SelectFields<UserLocation>) {
    return await db.query.userLocations.findMany({
      where: { userId },
      columns: normalizeSelect(select),
    });
  }

  static async findByUserIdAndType(
    userId: string,
    type: (typeof AvailableLocationTypes)[number],
    select?: SelectFields<UserLocation>
  ) {
    return await db.query.userLocations.findFirst({
      where: {
        userId,
        type,
      },
      columns: normalizeSelect(select),
    });
  }

  static async deleteByUserId(userId: string): Promise<void> {
    await db.delete(userLocations).where(eq(userLocations.userId, userId));
  }
}
