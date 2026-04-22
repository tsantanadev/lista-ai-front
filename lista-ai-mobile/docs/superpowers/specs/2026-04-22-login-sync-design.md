# Login-Time Remote Sync Design

**Date:** 2026-04-22

## Context

When a user logs in on a new device, the local SQLite database is empty. Nothing currently fetches data from the server after authentication, so the user sees an empty list until they manually trigger sync. This spec defines a login-time seed that pulls all lists and items from the backend and shows a progress modal, ensuring the user's data is present immediately after login.

---

## Trigger Condition

The seed runs **only when the local `lists` table is empty** at the moment login succeeds. This covers:
- Fresh installs
- Login after logout (logout wipes all local tables)

It does **not** run on token refresh or app resume — those paths use `executeSync` as before.

---

## Section 1: `sync/seed.ts`

New file: `src/sync/seed.ts`

```ts
seedFromRemote(onProgress?: (done: number, total: number) => void): Promise<void>
```

**Phases:**
1. `GET /v1/lists` — insert each list into the local DB with `remoteId` set.
2. For each list: `GET /v1/lists/:id/items` — insert each item with `remoteId` and `listId` set.

**Progress reporting:** `total = lists.length`, `done` increments once per list after all of that list's items are also inserted. Item counts per list are not known upfront (each requires a separate API call), so items are not counted individually — a list counts as one unit of work (list row + all its items). This keeps `total` stable from the start and avoids recalculating it mid-run.

**Conflict handling:** Upsert by `remoteId`. If a record with that `remoteId` already exists locally, update it rather than inserting a duplicate. In practice this path is rarely hit (the trigger condition is an empty DB), but it makes the function safe to call idempotently.

**Error handling:** Errors propagate to the caller (auth store). The auth store treats them as non-fatal and proceeds with login regardless.

---

## Section 2: Auth Store Changes

**New state fields on `AuthState`:**
- `isSyncing: boolean` — true while `seedFromRemote` is running after login.
- `syncProgress: { done: number; total: number } | null` — current seed progress, null when not syncing.

**Login flow (applies to `loginLocal` and `loginGoogle`):**

1. API call succeeds, tokens saved, user object constructed (unchanged).
2. Count rows in `lists` table.
3. If count > 0: set `isAuthenticated: true`, done.
4. If count === 0:
   a. Set `isSyncing: true`, `syncProgress: null`.
   b. Call `seedFromRemote` with an `onProgress` callback that updates `syncProgress`.
   c. On completion (success or error): set `isSyncing: false`, `syncProgress: null`, `isAuthenticated: true`.

`isAuthenticated` is set **after** the seed completes so the navigator does not switch screens mid-sync. If the seed fails, login still succeeds — the user lands in the app with an empty list and can sync manually.

---

## Section 3: Login Screen UI

The login screen reads `isSyncing` and `syncProgress` from the auth store.

**While `isSyncing` is true:**
- Render a modal overlay (same visual pattern as the logout sync modal in `PerfilInfo`).
- Show a progress bar driven by `syncProgress.done / syncProgress.total` (or an indeterminate spinner if `syncProgress` is null).
- Display an i18n string: `sync.login.syncing` ("Syncing your lists…" / "Sincronizando suas listas…").
- No cancel button — the operation is short and non-destructive; failure is handled silently.

**On dismissal:** `isSyncing` flips to `false` and `isAuthenticated` becomes `true` simultaneously. The navigator switches to `MainTabs` and the modal disappears. The user never sees the empty list state.

**i18n keys to add** (all locales):
- `sync.login.syncing`

---

## What Is Not Changing

- `executeSync` is unchanged — it continues to handle push + background list refresh for ongoing use.
- `executeSync` does not gain item-fetching capability as part of this change.
- Logout flow is unchanged.
- Registration flow: a newly registered user has no remote data, so the seed will complete immediately (empty response from server). No special case needed.

---

## Files Affected

| File | Change |
|------|--------|
| `src/sync/seed.ts` | New file |
| `src/auth/store.ts` | Add `isSyncing`, `syncProgress` state; call seed in login actions |
| `src/screens/Login/` | Add sync progress modal |
| `src/i18n/` | Add `sync.login.syncing` key to all locale files |
