import { db } from '@/database/db';

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function withTransaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
  return await db.transaction(callback);
}
