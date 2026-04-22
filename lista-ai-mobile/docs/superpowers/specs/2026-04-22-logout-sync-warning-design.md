# Logout Sync Warning & Data Clearing

**Date:** 2026-04-22
**Status:** Approved

## Problem

When a user logs out and a different account logs in, the previous user's lists remain visible. Root cause: `logout()` only clears auth tokens — it never wipes the local SQLite tables (`lists`, `items`, `sync_queue`) or the TanStack Query in-memory cache (`staleTime: Infinity`). Additionally, if the user has unsynced changes at logout time, those changes are silently discarded.

## Solution Overview

Two concerns addressed together:

1. **Data isolation** — `logout()` clears all local SQLite data and the query cache so the next user starts fresh.
2. **Sync warning** — if unsynced changes exist, the user is shown a modal with a progress bar and the option to sync before signing out.

---

## Trigger Flow

User taps "Sign Out" in PerfilInfo:

1. Query `sync_queue` for active pending entries (`retryCount >= 0`; permanently-failed entries at `retryCount === -1` are already unrecoverable and excluded from the count).
2. **0 pending** → existing two-button confirm Alert → `logout()`. No change to current behavior.
3. **> 0 pending** → open sync modal.

---

## Sync Modal

Implemented as a React Native `Modal` with local state. Four states:

### Idle
"You have N unsynced changes. Sign out now and they'll be permanently lost."

Actions:
- **Sync & Sign Out** — starts sync
- **Sign out anyway** — skips sync, goes straight to logout
- **Cancel** — dismisses modal, user stays logged in

### Syncing
- Animated progress bar (filling left-to-right)
- Label: "Syncing X of N…"
- All three buttons disabled; sync cannot be interrupted

### Success (0 failures)
- Progress bar at 100%
- Brief 800 ms pause for visual feedback
- `logout()` fires automatically — no extra button

### Partial failure (≥ 1 failure)
"X of N changes could not be synced and will be lost."

Actions:
- **Sign out anyway** — proceeds with logout
- **Cancel** — dismisses modal, user stays logged in

No retry offered — the background executor handles retries during normal app use; this modal is a one-shot attempt.

---

## Technical Changes

### 1. `src/sync/queue.ts`
Add `getActivePendingCount(): Promise<number>` — counts `sync_queue` rows where `retryCount >= 0`.

### 2. `src/sync/executor.ts`
Add optional parameter to `executeSync`:
```ts
executeSync(onProgress?: (done: number, total: number) => void): Promise<void>
```
`onProgress` is called after each entry is processed (success or permanent failure). `total` is the count of active pending entries at the start of the run.

### 3. `src/queryClient.ts` (new file)
Extract the `QueryClient` singleton so both `App.tsx` and `auth/store.ts` can import it:
```ts
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: Infinity } },
});
```

### 4. `App.tsx`
Import `queryClient` from `src/queryClient.ts` instead of defining it inline. No other changes.

### 5. `src/auth/store.ts`
After `clearAuth()` in `logout()`, add:
1. Delete all rows from `items` (FK child first), then `lists`, then `syncQueue`.
2. Call `queryClient.clear()` to purge in-memory cache.

### 6. `src/screens/PerfilInfo/index.tsx`
Replace the two-line `confirmLogout` Alert with:
- A function that checks `getActivePendingCount()` and either shows the existing Alert (0 pending) or opens the sync modal.
- A `Modal` component with local state: `'idle' | 'syncing' | 'done' | 'failed'`, `progress: { done: number; total: number }`.
- Progress bar rendered as a `View` with dynamic `width` percentage.

---

## Data Deletion Order

SQLite FK constraint: `items.list_id` references `lists.id`. Deletion order:
1. `DELETE FROM items`
2. `DELETE FROM lists`
3. `DELETE FROM sync_queue`

---

## Out of Scope

- Retry inside the modal (background executor handles retries)
- Per-item error details (count only)
- Offline detection before sync attempt (executor already fails gracefully when offline)
