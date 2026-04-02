import { db } from '../db';
import { syncQueue } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import type { SyncEntity, SyncOperation } from '../types/sync';
import { now } from '../utils/date';

type EnqueueInput = {
  entity: SyncEntity;
  operation: SyncOperation;
  payload: string;
};

export async function enqueue(entry: EnqueueInput): Promise<void> {
  await db.insert(syncQueue).values({
    entity: entry.entity,
    operation: entry.operation,
    payload: entry.payload,
    createdAt: now(),
    retryCount: 0,
    lastError: null,
  });
}

export async function getPending() {
  return db
    .select()
    .from(syncQueue)
    .orderBy(asc(syncQueue.createdAt));
}

export async function remove(id: number): Promise<void> {
  await db.delete(syncQueue).where(eq(syncQueue.id, id));
}

export async function incrementRetry(id: number, error: string): Promise<void> {
  const [entry] = await db.select().from(syncQueue).where(eq(syncQueue.id, id));
  if (!entry) return;
  await db
    .update(syncQueue)
    .set({ retryCount: entry.retryCount + 1, lastError: error })
    .where(eq(syncQueue.id, id));
}

export async function markFailed(id: number, error: string): Promise<void> {
  // retryCount >= 5 — mark as permanently failed by setting retryCount to -1
  await db
    .update(syncQueue)
    .set({ retryCount: -1, lastError: error })
    .where(eq(syncQueue.id, id));
}
