import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../db';
import { lists } from '../db/schema';
import { isNull, eq } from 'drizzle-orm';
import { enqueue } from '../sync/queue';
import { executeSync } from '../sync/executor';
import { useStore } from '../store';
import { generateLocalId } from '../utils/id';
import { now } from '../utils/date';
import type { List, ListInput } from '../types/list';

function mapRow(row: typeof lists.$inferSelect): List {
  return {
    id: row.id,
    remoteId: row.remoteId ?? null,
    name: row.name,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
  };
}

export function useListsQuery() {
  return useQuery<List[]>({
    queryKey: ['lists'],
    queryFn: async () => {
      const rows = await db
        .select()
        .from(lists)
        .where(isNull(lists.deletedAt));
      return rows.map(mapRow);
    },
    staleTime: Infinity,
  });
}

export function useCreateList() {
  const queryClient = useQueryClient();
  const { isOnline, setLastSyncError } = useStore();

  return useMutation({
    mutationFn: async (input: ListInput) => {
      const localId = generateLocalId();
      const timestamp = now();

      await db.insert(lists).values({
        id: localId,
        remoteId: null,
        name: input.name,
        updatedAt: timestamp,
        deletedAt: null,
      });

      await enqueue({
        entity: 'list',
        operation: 'create',
        payload: JSON.stringify({ localId, name: input.name }),
      });

      if (isOnline) {
        executeSync().catch((err) => {
          setLastSyncError(err instanceof Error ? err.message : String(err));
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();
  const { isOnline, setLastSyncError } = useStore();

  return useMutation({
    mutationFn: async (list: List) => {
      const timestamp = now();

      await db
        .update(lists)
        .set({ deletedAt: timestamp })
        .where(eq(lists.id, list.id));

      await enqueue({
        entity: 'list',
        operation: 'delete',
        payload: JSON.stringify({ localId: list.id, remoteId: list.remoteId }),
      });

      if (isOnline) {
        executeSync().catch((err) => {
          setLastSyncError(err instanceof Error ? err.message : String(err));
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useUpdateList() {
  const queryClient = useQueryClient();
  const { isOnline, setLastSyncError } = useStore();

  return useMutation({
    mutationFn: async ({ list, input }: { list: List; input: ListInput }) => {
      const timestamp = now();

      await db
        .update(lists)
        .set({ name: input.name, updatedAt: timestamp })
        .where(eq(lists.id, list.id));

      await enqueue({
        entity: 'list',
        operation: 'update',
        payload: JSON.stringify({ localId: list.id, remoteId: list.remoteId, name: input.name }),
      });

      if (isOnline) {
        executeSync().catch((err) => {
          setLastSyncError(err instanceof Error ? err.message : String(err));
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}
