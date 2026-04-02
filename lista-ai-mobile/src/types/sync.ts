export type SyncEntity = 'list' | 'item';
export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncQueueEntry {
  id: number;
  entity: SyncEntity;
  operation: SyncOperation;
  payload: string; // JSON
  createdAt: number;
  retryCount: number;
  lastError: string | null;
}
