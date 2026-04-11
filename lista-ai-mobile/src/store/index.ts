import { create } from 'zustand';
import type { SyncState } from './syncSlice';
import type { ListsUIState } from './listsSlice';
import { type LanguageSlice, createLanguageSlice } from './languageSlice';

type StoreState = SyncState & ListsUIState & LanguageSlice;

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

  // LanguageSlice
  ...createLanguageSlice(set),
}));
