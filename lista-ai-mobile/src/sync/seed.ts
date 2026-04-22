import { db } from '../db';
import { lists, items } from '../db/schema';
import { eq } from 'drizzle-orm';
import { fetchLists } from '../api/lists';
import { fetchItems } from '../api/items';
import { now } from '../utils/date';

export async function seedFromRemote(
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const remoteLists = await fetchLists();
  const total = remoteLists.length;

  for (let i = 0; i < remoteLists.length; i++) {
    const remote = remoteLists[i];

    const [existing] = await db.select().from(lists).where(eq(lists.remoteId, remote.id));
    let localListId: number;

    if (existing) {
      await db.update(lists).set({ name: remote.name }).where(eq(lists.id, existing.id));
      localListId = existing.id;
    } else {
      await db.insert(lists).values({
        remoteId: remote.id,
        name: remote.name,
        updatedAt: now(),
        deletedAt: null,
      });
      const [inserted] = await db.select().from(lists).where(eq(lists.remoteId, remote.id));
      localListId = inserted.id;
    }

    const remoteItems = await fetchItems(remote.id);
    for (const remoteItem of remoteItems) {
      const [existingItem] = await db.select().from(items).where(eq(items.remoteId, remoteItem.id));
      if (existingItem) {
        await db.update(items)
          .set({ description: remoteItem.description, checked: remoteItem.checked })
          .where(eq(items.id, existingItem.id));
      } else {
        await db.insert(items).values({
          remoteId: remoteItem.id,
          listId: localListId,
          description: remoteItem.description,
          checked: remoteItem.checked,
          updatedAt: now(),
          deletedAt: null,
        });
      }
    }

    onProgress?.(i + 1, total);
  }
}
