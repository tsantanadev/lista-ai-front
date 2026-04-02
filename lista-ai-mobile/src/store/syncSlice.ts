export interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  lastSyncError: string | null;
  setOnline: (online: boolean) => void;
  setPendingCount: (count: number) => void;
  setLastSyncError: (error: string | null) => void;
}
