import { db } from '../db';
import { lists, items } from '../db/schema';
import { eq, isNull } from 'drizzle-orm';
import { getPending, remove, incrementRetry, markFailed } from './queue';
import { fetchLists, createList, deleteList } from '../api/lists';
import type { SyncOperation } from '../types/sync';
import { createItem, updateItem, deleteItem } from '../api/items';
import { now } from '../utils/date';

export async function executeSync(): Promise<void> {
  const pending = await getPending();

  for (const entry of pending) {
    // Skip permanently failed entries
    if (entry.retryCount === -1) continue;

    try {
      const payload = JSON.parse(entry.payload);

      if (entry.entity === 'list') {
        await syncListOperation(entry.id, entry.operation as SyncOperation, payload);
      } else if (entry.entity === 'item') {
        await syncItemOperation(entry.id, entry.operation as SyncOperation, payload);
      }

      await remove(entry.id);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      if (entry.retryCount >= 4) {
        await markFailed(entry.id, error);
      } else {
        await incrementRetry(entry.id, error);
      }
    }
  }

  // Background refresh: pull server lists, upsert non-dirty local records
  try {
    const remoteLists = await fetchLists();
    for (const remote of remoteLists) {
      const [local] = await db
        .select()
        .from(lists)
        .where(eq(lists.remoteId, remote.id));

      if (local) {
        // Only overwrite if local is not dirty (no pending sync ops for it)
        const localPending = pending.filter(
          (e) =>
            e.entity === 'list' &&
            JSON.parse(e.payload).localId === local.id
        );
        if (localPending.length === 0) {
          await db
            .update(lists)
            .set({ name: remote.name })
            .where(eq(lists.id, local.id));
        }
      } else {
        // New list from server — insert locally
        await db.insert(lists).values({
          remoteId: remote.id,
          name: remote.name,
          updatedAt: now(),
          deletedAt: null,
        });
      }
    }
  } catch {
    // Background refresh failure is non-fatal
  }
}

async function syncListOperation(
  queueId: number,
  operation: 'create' | 'update' | 'delete',
  payload: { localId: number; name?: string; remoteId?: number }
): Promise<void> {
  if (operation === 'create') {
    const remote = await createList(payload.name!);
    await db
      .update(lists)
      .set({ remoteId: remote.id })
      .where(eq(lists.id, payload.localId));
  } else if (operation === 'delete') {
    if (payload.remoteId != null) {
      await deleteList(payload.remoteId);
    }
    // Hard-delete local soft-deleted record
    await db.delete(lists).where(eq(lists.id, payload.localId));
  } else if (operation === 'update') {
    // Backend has no PUT /v1/lists yet — local-only until extended
    // No-op for now; local record is already updated
  }
}

async function syncItemOperation(
  queueId: number,
  operation: 'create' | 'update' | 'delete',
  payload: {
    localId: number;
    localListId: number;
    remoteListId?: number;
    remoteId?: number;
    description?: string;
    checked?: boolean;
  }
): Promise<void> {
  if (operation === 'create') {
    // Re-fetch remoteListId in case the list was synced after this item was enqueued
    const [listRow] = await db.select().from(lists).where(eq(lists.id, payload.localListId));
    const remoteListId = listRow?.remoteId ?? payload.remoteListId ?? null;
    if (remoteListId == null) return; // list not synced yet, skip
    const created = await createItem(remoteListId, { description: payload.description! });
    await db.update(items).set({ remoteId: created.id }).where(eq(items.id, payload.localId));
  } else if (operation === 'update') {
    const [listRowU] = await db.select().from(lists).where(eq(lists.id, payload.localListId));
    const remoteListIdU = listRowU?.remoteId ?? payload.remoteListId ?? null;
    const [itemRowU] = await db.select().from(items).where(eq(items.id, payload.localId));
    const remoteIdU = itemRowU?.remoteId ?? payload.remoteId ?? null;
    if (remoteListIdU == null || remoteIdU == null) return;
    const updated = await updateItem(remoteListIdU, remoteIdU, {
      description: payload.description!,
      checked: payload.checked ?? false,
    });
    await db
      .update(items)
      .set({ remoteId: updated.id, description: updated.description, checked: updated.checked })
      .where(eq(items.id, payload.localId));
  } else if (operation === 'delete') {
    const [listRowD] = await db.select().from(lists).where(eq(lists.id, payload.localListId));
    const remoteListIdD = listRowD?.remoteId ?? payload.remoteListId ?? null;
    const [itemRowD] = await db.select().from(items).where(eq(items.id, payload.localId));
    const remoteIdD = itemRowD?.remoteId ?? payload.remoteId ?? null;
    if (remoteListIdD != null && remoteIdD != null) {
      await deleteItem(remoteListIdD, remoteIdD);
    }
    // Hard-delete local record
    await db.delete(items).where(eq(items.id, payload.localId));
  }
}
