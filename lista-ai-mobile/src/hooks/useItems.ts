import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../db';
import { items } from '../db/schema';
import { isNull, eq, and } from 'drizzle-orm';
import { enqueue } from '../sync/queue';
import { executeSync } from '../sync/executor';
import { useStore } from '../store';
import { generateLocalId } from '../utils/id';
import { now } from '../utils/date';
import type { Item, ItemInput } from '../types/item';

function mapRow(row: typeof items.$inferSelect): Item {
  return {
    id: row.id,
    remoteId: row.remoteId ?? null,
    listId: row.listId,
    description: row.description,
    checked: row.checked ?? false,
    quantity: row.quantity ?? null,
    price: row.price ?? null,
    uom: row.uom ?? null,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
  };
}

export function useItemsQuery(listId: number) {
  return useQuery<Item[]>({
    queryKey: ['items', listId],
    queryFn: async () => {
      const rows = await db
        .select()
        .from(items)
        .where(and(eq(items.listId, listId), isNull(items.deletedAt)));
      return rows.map(mapRow);
    },
    staleTime: Infinity,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  const { isOnline, setLastSyncError } = useStore();

  return useMutation({
    mutationFn: async ({ listId, input, remoteListId }: { listId: number; input: ItemInput; remoteListId: number | null }) => {
      const localId = generateLocalId();
      const timestamp = now();

      await db.insert(items).values({
        id: localId,
        remoteId: null,
        listId,
        description: input.description,
        checked: input.checked ?? false,
        quantity: input.quantity ?? null,
        price: null,
        uom: input.uom ?? null,
        updatedAt: timestamp,
        deletedAt: null,
      });

      await enqueue({
        entity: 'item',
        operation: 'create',
        payload: JSON.stringify({
          localId,
          localListId: listId,
          remoteListId,
          description: input.description,
        }),
      });

      if (isOnline) {
        executeSync().catch((err) => {
          setLastSyncError(err instanceof Error ? err.message : String(err));
        });
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items', variables.listId] });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  const { isOnline, setLastSyncError } = useStore();

  return useMutation({
    mutationFn: async ({
      item,
      input,
      remoteListId,
    }: {
      item: Item;
      input: Partial<ItemInput>;
      remoteListId: number | null;
    }) => {
      const timestamp = now();
      const updatedDescription = input.description ?? item.description;
      const updatedChecked = input.checked ?? item.checked;

      await db
        .update(items)
        .set({
          description: updatedDescription,
          checked: updatedChecked,
          quantity: input.quantity !== undefined ? (input.quantity ?? null) : item.quantity,
          uom: input.uom !== undefined ? (input.uom ?? null) : item.uom,
          updatedAt: timestamp,
        })
        .where(eq(items.id, item.id));

      await enqueue({
        entity: 'item',
        operation: 'update',
        payload: JSON.stringify({
          localId: item.id,
          localListId: item.listId,
          remoteListId,
          remoteId: item.remoteId,
          description: updatedDescription,
          checked: updatedChecked,
        }),
      });

      if (isOnline) {
        executeSync().catch((err) => {
          setLastSyncError(err instanceof Error ? err.message : String(err));
        });
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items', variables.item.listId] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  const { isOnline, setLastSyncError } = useStore();

  return useMutation({
    mutationFn: async ({
      item,
      remoteListId,
    }: {
      item: Item;
      remoteListId: number | null;
    }) => {
      const timestamp = now();

      await db
        .update(items)
        .set({ deletedAt: timestamp })
        .where(eq(items.id, item.id));

      await enqueue({
        entity: 'item',
        operation: 'delete',
        payload: JSON.stringify({
          localId: item.id,
          localListId: item.listId,
          remoteListId,
          remoteId: item.remoteId,
        }),
      });

      if (isOnline) {
        executeSync().catch((err) => {
          setLastSyncError(err instanceof Error ? err.message : String(err));
        });
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items', variables.item.listId] });
    },
  });
}
