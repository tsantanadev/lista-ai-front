import { create } from 'zustand';
import type { SyncState } from './syncSlice';
import type { ListsUIState } from './listsSlice';

type StoreState = SyncState & ListsUIState;

export const useStore = create<StoreState>((set) => ({
  // SyncState
  isOnline: true,
  pendingCount: 0,
  lastSyncError: null,
  setOnline: (online) => set({ isOnline: online }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastSyncError: (error) => set({ lastSyncError: error }),

  // ListsUIState
  selectedListId: null,
  setSelectedListId: (id) => set({ selectedListId: id }),
}));
