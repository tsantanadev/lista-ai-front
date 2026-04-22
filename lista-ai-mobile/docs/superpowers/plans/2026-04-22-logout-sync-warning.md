# Logout Sync Warning & Data Clearing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear local SQLite data and TanStack Query cache on logout, and warn users with a sync modal + progress bar when they have unsynced changes.

**Architecture:** Extract the QueryClient to a singleton so `auth/store.ts` can clear it on logout. Extend `sync/queue.ts` with an active-pending count helper and `sync/executor.ts` with a progress callback + result summary. Replace the two-line `confirmLogout` alert in `PerfilInfo` with a state-machine modal that handles idle → syncing → done/failed.

**Tech Stack:** React Native 0.81, Expo SDK 54, Drizzle ORM 0.45, TanStack Query 5, Zustand 5, i18next, Jest + @testing-library/react-native

---

## File Map

| File | Change |
|---|---|
| `src/queryClient.ts` | **Create** — QueryClient singleton |
| `App.tsx` | **Modify** — import queryClient from new singleton file |
| `src/sync/queue.ts` | **Modify** — add `getActivePendingCount()` |
| `src/sync/__tests__/queue.test.ts` | **Modify** — tests for `getActivePendingCount` |
| `src/sync/executor.ts` | **Modify** — add `onProgress` callback + `SyncResult` return type |
| `src/sync/__tests__/executor.test.ts` | **Modify** — tests for progress callback |
| `src/auth/store.ts` | **Modify** — `logout()` clears DB tables + query cache |
| `src/auth/__tests__/store.test.ts` | **Modify** — assert DB clear and cache clear on logout |
| `src/i18n/locales/en.json` | **Modify** — add sync modal strings |
| `src/i18n/locales/pt-BR.json` | **Modify** — add sync modal strings |
| `src/i18n/locales/es.json` | **Modify** — add sync modal strings |
| `src/i18n/locales/fr.json` | **Modify** — add sync modal strings |
| `src/i18n/locales/de.json` | **Modify** — add sync modal strings |
| `src/screens/PerfilInfo/index.tsx` | **Modify** — replace `confirmLogout` with sync modal |

---

## Task 1: Extract QueryClient singleton

**Files:**
- Create: `src/queryClient.ts`
- Modify: `App.tsx`

- [ ] **Step 1: Create `src/queryClient.ts`**

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: Infinity,
    },
  },
});
```

- [ ] **Step 2: Update `App.tsx` to import from the new file**

Replace lines 6 and 17–24 in `App.tsx`:

```ts
// Remove this import:
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Replace with:
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/queryClient';
```

And remove the inline `const queryClient = new QueryClient({ ... })` block (lines 17–24).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd lista-ai-mobile && npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lista-ai-mobile/src/queryClient.ts lista-ai-mobile/App.tsx
git commit -m "refactor: extract QueryClient to singleton module"
```

---

## Task 2: Add `getActivePendingCount()` to queue.ts

**Files:**
- Modify: `src/sync/queue.ts`
- Modify: `src/sync/__tests__/queue.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the bottom of `src/sync/__tests__/queue.test.ts`:

```ts
import { enqueue, getPending, remove, incrementRetry, markFailed, getActivePendingCount } from '../queue';
```

Update the existing import line at line 1 to include `getActivePendingCount`, then add:

```ts
describe('getActivePendingCount()', () => {
  it('returns the number of entries with retryCount >= 0', async () => {
    mockSelectWhere.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const result = await getActivePendingCount();

    expect(result).toBe(2);
    expect(db.select).toHaveBeenCalled();
  });

  it('returns 0 when no active entries exist', async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await getActivePendingCount();

    expect(result).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd lista-ai-mobile && npx jest src/sync/__tests__/queue.test.ts --no-coverage
```

Expected: FAIL — `getActivePendingCount is not a function`.

- [ ] **Step 3: Implement `getActivePendingCount`**

Add to `src/sync/queue.ts` after the existing imports:

```ts
import { eq, asc, gte } from 'drizzle-orm';
```

Replace the existing `import { eq, asc } from 'drizzle-orm';` line with the above, then add this function after `markFailed`:

```ts
export async function getActivePendingCount(): Promise<number> {
  const rows = await db
    .select({ id: syncQueue.id })
    .from(syncQueue)
    .where(gte(syncQueue.retryCount, 0));
  return rows.length;
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd lista-ai-mobile && npx jest src/sync/__tests__/queue.test.ts --no-coverage
```

Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add lista-ai-mobile/src/sync/queue.ts lista-ai-mobile/src/sync/__tests__/queue.test.ts
git commit -m "feat: add getActivePendingCount to sync queue"
```

---

## Task 3: Add progress callback and result to `executeSync`

**Files:**
- Modify: `src/sync/executor.ts`
- Modify: `src/sync/__tests__/executor.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `src/sync/__tests__/executor.test.ts`:

```ts
describe('executeSync() with progress callback', () => {
  it('calls onProgress for each active entry processed', async () => {
    (getPending as jest.Mock).mockResolvedValue([
      makePending({ id: 1, retryCount: 0 }),
      makePending({ id: 2, retryCount: 0 }),
      makePending({ id: 3, retryCount: -1 }), // permanently failed — skipped
    ]);
    (createList as jest.Mock).mockResolvedValue({ id: 99, name: 'Groceries' });

    const onProgress = jest.fn();
    await executeSync(onProgress);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
  });

  it('returns succeeded and failed counts', async () => {
    (getPending as jest.Mock).mockResolvedValue([
      makePending({ id: 1, retryCount: 0 }),
      makePending({ id: 2, retryCount: 0 }),
    ]);
    (createList as jest.Mock)
      .mockResolvedValueOnce({ id: 99, name: 'Groceries' }) // id:1 succeeds
      .mockRejectedValueOnce(new Error('network error'));    // id:2 fails

    const result = await executeSync();

    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('does not call onProgress when there are no active entries', async () => {
    (getPending as jest.Mock).mockResolvedValue([
      makePending({ id: 1, retryCount: -1 }),
    ]);

    const onProgress = jest.fn();
    const result = await executeSync(onProgress);

    expect(onProgress).not.toHaveBeenCalled();
    expect(result).toEqual({ total: 0, succeeded: 0, failed: 0 });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd lista-ai-mobile && npx jest src/sync/__tests__/executor.test.ts --no-coverage
```

Expected: FAIL — new tests fail, existing tests still pass.

- [ ] **Step 3: Update `executeSync` signature and implementation**

Replace the entire `executeSync` function in `src/sync/executor.ts` with:

```ts
type SyncResult = { total: number; succeeded: number; failed: number };

export async function executeSync(
  onProgress?: (done: number, total: number) => void,
): Promise<SyncResult> {
  const pending = await getPending();
  const active = pending.filter((e) => e.retryCount !== -1);
  const total = active.length;
  let done = 0;
  let succeeded = 0;

  for (const entry of pending) {
    if (entry.retryCount === -1) continue;

    try {
      const payload = JSON.parse(entry.payload);

      if (entry.entity === 'list') {
        await syncListOperation(entry.id, entry.operation as SyncOperation, payload);
      } else if (entry.entity === 'item') {
        await syncItemOperation(entry.id, entry.operation as SyncOperation, payload);
      }

      await remove(entry.id);
      succeeded++;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      if (entry.retryCount >= 4) {
        await markFailed(entry.id, error);
      } else {
        await incrementRetry(entry.id, error);
      }
    }

    done++;
    onProgress?.(done, total);
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
        const localPending = pending.filter(
          (e) =>
            e.entity === 'list' &&
            JSON.parse(e.payload).localId === local.id,
        );
        if (localPending.length === 0) {
          await db
            .update(lists)
            .set({ name: remote.name })
            .where(eq(lists.id, local.id));
        }
      } else {
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

  return { total, succeeded, failed: total - succeeded };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd lista-ai-mobile && npx jest src/sync/__tests__/executor.test.ts --no-coverage
```

Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add lista-ai-mobile/src/sync/executor.ts lista-ai-mobile/src/sync/__tests__/executor.test.ts
git commit -m "feat: add progress callback and result summary to executeSync"
```

---

## Task 4: Update `logout()` to clear local DB and query cache

**Files:**
- Modify: `src/auth/store.ts`
- Modify: `src/auth/__tests__/store.test.ts`

- [ ] **Step 1: Write failing tests**

Add the following mocks at the top of `src/auth/__tests__/store.test.ts`, before the existing `jest.mock('../../api/auth', ...)` call:

```ts
var mockDbDelete: jest.Mock;

jest.mock('../../db', () => ({
  db: {
    delete: (...args: any[]) => mockDbDelete(...args),
  },
}));

jest.mock('../../db/schema', () => ({
  items: { _: 'items' },
  lists: { _: 'lists' },
  syncQueue: { _: 'sync_queue' },
}));

jest.mock('../../queryClient', () => ({
  queryClient: { clear: jest.fn() },
}));
```

Add `mockDbDelete = jest.fn().mockResolvedValue(undefined);` to the `beforeEach` block.

Replace the existing `logout()` test with:

```ts
describe('logout()', () => {
  it('clears auth state, calls apiLogout, wipes DB tables, and clears query cache', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      refreshToken: 'ref',
      user: { id: '1', name: 'Alice', email: 'a@b.com' },
    });

    await act(async () => {
      await useAuthStore.getState().logout();
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(apiLogout).toHaveBeenCalledWith('ref');
    // DB tables wiped (items, lists, syncQueue)
    expect(mockDbDelete).toHaveBeenCalledTimes(3);
    // Query cache cleared
    const { queryClient } = require('../../queryClient');
    expect(queryClient.clear).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd lista-ai-mobile && npx jest src/auth/__tests__/store.test.ts --no-coverage
```

Expected: FAIL — `mockDbDelete` not called, `queryClient.clear` not called.

- [ ] **Step 3: Update `auth/store.ts`**

Add imports at the top of `src/auth/store.ts` (after the existing imports):

```ts
import { db } from '../db';
import { items as itemsTable, lists as listsTable, syncQueue as syncQueueTable } from '../db/schema';
import { queryClient } from '../queryClient';
```

Replace the `logout` action:

```ts
logout: async () => {
  const currentRefresh = get().refreshToken;
  try {
    if (currentRefresh) await apiLogout(currentRefresh);
  } catch { /* best effort */ }
  await clearAuth();
  await db.delete(itemsTable);
  await db.delete(listsTable);
  await db.delete(syncQueueTable);
  queryClient.clear();
  set({ isAuthenticated: false, accessToken: null, refreshToken: null, user: null });
},
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd lista-ai-mobile && npx jest src/auth/__tests__/store.test.ts --no-coverage
```

Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add lista-ai-mobile/src/auth/store.ts lista-ai-mobile/src/auth/__tests__/store.test.ts
git commit -m "fix: clear local DB and query cache on logout"
```

---

## Task 5: Add i18n strings for sync modal

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/pt-BR.json`
- Modify: `src/i18n/locales/es.json`
- Modify: `src/i18n/locales/fr.json`
- Modify: `src/i18n/locales/de.json`

- [ ] **Step 1: Add strings to `en.json`**

Inside the `profile.info` object, add after `"errorSaving"`:

```json
"syncWarningTitle": "Unsaved Changes",
"syncWarningMessage": "You have {{count}} unsynced change(s). Sign out now and they will be permanently lost.",
"syncAndSignOut": "Sync & Sign Out",
"signOutAnyway": "Sign out anyway",
"syncingProgress": "Syncing {{done}} of {{total}}…",
"syncFailedMessage": "{{count}} change(s) could not be synced and will be lost."
```

- [ ] **Step 2: Add strings to `pt-BR.json`**

Inside `profile.info`, add after `"errorSaving"`:

```json
"syncWarningTitle": "Alterações não salvas",
"syncWarningMessage": "Você tem {{count}} alteração(ões) não sincronizada(s). Sair agora resultará na perda permanente dessas alterações.",
"syncAndSignOut": "Sincronizar e Sair",
"signOutAnyway": "Sair mesmo assim",
"syncingProgress": "Sincronizando {{done}} de {{total}}…",
"syncFailedMessage": "{{count}} alteração(ões) não pôde(ram) ser sincronizada(s) e será(ão) perdida(s)."
```

- [ ] **Step 3: Add strings to `es.json`**

Inside `profile.info`, add after `"errorSaving"`:

```json
"syncWarningTitle": "Cambios sin guardar",
"syncWarningMessage": "Tienes {{count}} cambio(s) sin sincronizar. Si cierras sesión ahora, se perderán permanentemente.",
"syncAndSignOut": "Sincronizar y Cerrar sesión",
"signOutAnyway": "Cerrar sesión de todos modos",
"syncingProgress": "Sincronizando {{done}} de {{total}}…",
"syncFailedMessage": "{{count}} cambio(s) no pudieron sincronizarse y se perderán."
```

- [ ] **Step 4: Add strings to `fr.json`**

Inside `profile.info`, add after `"errorSaving"`:

```json
"syncWarningTitle": "Modifications non sauvegardées",
"syncWarningMessage": "Vous avez {{count}} modification(s) non synchronisée(s). Déconnectez-vous maintenant et elles seront définitivement perdues.",
"syncAndSignOut": "Synchroniser et se déconnecter",
"signOutAnyway": "Se déconnecter quand même",
"syncingProgress": "Synchronisation {{done}} sur {{total}}…",
"syncFailedMessage": "{{count}} modification(s) n'ont pas pu être synchronisée(s) et seront perdues."
```

- [ ] **Step 5: Add strings to `de.json`**

Inside `profile.info`, add after `"errorSaving"`:

```json
"syncWarningTitle": "Nicht gespeicherte Änderungen",
"syncWarningMessage": "Du hast {{count}} nicht synchronisierte(n) Änderung(en). Wenn du dich jetzt abmeldest, gehen sie dauerhaft verloren.",
"syncAndSignOut": "Synchronisieren und abmelden",
"signOutAnyway": "Trotzdem abmelden",
"syncingProgress": "Synchronisiere {{done}} von {{total}}…",
"syncFailedMessage": "{{count}} Änderung(en) konnte(n) nicht synchronisiert werden und gehen verloren."
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd lista-ai-mobile && npm run typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lista-ai-mobile/src/i18n/locales/
git commit -m "feat: add sync modal i18n strings for all locales"
```

---

## Task 6: Replace `confirmLogout` with sync modal in PerfilInfo

**Files:**
- Modify: `src/screens/PerfilInfo/index.tsx`

- [ ] **Step 1: Add new imports**

At the top of `src/screens/PerfilInfo/index.tsx`, add to the existing React Native import:

```ts
import { Modal } from 'react-native';
```

Add after the existing imports:

```ts
import { getActivePendingCount } from '../../sync/queue';
import { executeSync } from '../../sync/executor';
```

- [ ] **Step 2: Add modal state**

Inside the `PerfilInfo` component, after the existing `useState` declarations, add:

```ts
type SyncPhase = 'idle' | 'syncing' | 'done' | 'failed';
const [syncModalVisible, setSyncModalVisible]   = useState(false);
const [syncPhase, setSyncPhase]                 = useState<SyncPhase>('idle');
const [syncProgress, setSyncProgress]           = useState({ done: 0, total: 0 });
const [syncFailures, setSyncFailures]           = useState(0);
```

- [ ] **Step 3: Add auto-logout effect for 'done' phase**

After the existing `useEffect` that loads `LOCAL_PROFILE_KEY`, add:

```ts
useEffect(() => {
  if (syncPhase === 'done') {
    const timer = setTimeout(() => logout(), 800);
    return () => clearTimeout(timer);
  }
}, [syncPhase]);
```

- [ ] **Step 4: Replace `confirmLogout` function**

Remove the existing `confirmLogout` function and replace with these three functions:

```ts
async function confirmLogout() {
  const pending = await getActivePendingCount();
  if (pending === 0) {
    Alert.alert(
      t('profile.info.signOutTitle'),
      t('profile.info.signOutMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.info.signOutConfirm'), style: 'destructive', onPress: () => logout() },
      ],
    );
  } else {
    setSyncProgress({ done: 0, total: pending });
    setSyncPhase('idle');
    setSyncModalVisible(true);
  }
}

async function handleSyncAndLogout() {
  setSyncPhase('syncing');
  const result = await executeSync((done, total) => {
    setSyncProgress({ done, total });
  });
  if (result.failed > 0) {
    setSyncFailures(result.failed);
    setSyncPhase('failed');
  } else {
    setSyncPhase('done');
  }
}

function handleSignOutAnyway() {
  setSyncModalVisible(false);
  logout();
}
```

- [ ] **Step 5: Add modal styles**

Inside the `StyleSheet.create` object (the `s` variable), add after the `deleteText` entry:

```ts
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.6)',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  paddingHorizontal: 24,
},
modalCard: {
  backgroundColor: theme.surface,
  borderRadius: 16,
  padding: 24,
  width: '100%' as const,
  borderWidth: 1,
  borderColor: theme.border,
  gap: 12,
},
modalTitle: {
  color: theme.textPrimary,
  fontSize: 17,
  fontWeight: '600' as const,
  textAlign: 'center' as const,
},
modalBody: {
  color: theme.neutral,
  fontSize: 14,
  textAlign: 'center' as const,
  lineHeight: 20,
},
progressTrack: {
  height: 4,
  backgroundColor: theme.progressTrack,
  borderRadius: 2,
  overflow: 'hidden' as const,
},
progressFill: {
  height: 4,
  backgroundColor: theme.primary,
  borderRadius: 2,
},
primaryBtn: {
  backgroundColor: theme.primary,
  borderRadius: 10,
  paddingVertical: 13,
  alignItems: 'center' as const,
},
primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
destructiveBtn: {
  backgroundColor: theme.destructive,
  borderRadius: 10,
  paddingVertical: 13,
  alignItems: 'center' as const,
},
destructiveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
ghostBtn: { paddingVertical: 10, alignItems: 'center' as const },
ghostBtnText: { color: theme.neutral, fontSize: 14 },
```

- [ ] **Step 6: Add Modal JSX**

Inside the `return` statement, add the following `<Modal>` block immediately before the closing `</KeyboardAvoidingView>` tag:

```tsx
<Modal
  visible={syncModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => syncPhase !== 'syncing' && setSyncModalVisible(false)}
>
  <View style={s.modalOverlay}>
    <View style={s.modalCard}>
      <Text style={s.modalTitle}>{t('profile.info.syncWarningTitle')}</Text>

      {syncPhase === 'idle' && (
        <>
          <Text style={s.modalBody}>
            {t('profile.info.syncWarningMessage', { count: syncProgress.total })}
          </Text>
          <TouchableOpacity style={s.primaryBtn} onPress={handleSyncAndLogout} activeOpacity={0.8}>
            <Text style={s.primaryBtnText}>{t('profile.info.syncAndSignOut')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ghostBtn} onPress={handleSignOutAnyway} activeOpacity={0.8}>
            <Text style={s.ghostBtnText}>{t('profile.info.signOutAnyway')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ghostBtn} onPress={() => setSyncModalVisible(false)} activeOpacity={0.8}>
            <Text style={s.ghostBtnText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </>
      )}

      {syncPhase === 'syncing' && (
        <>
          <Text style={s.modalBody}>
            {t('profile.info.syncingProgress', { done: syncProgress.done, total: syncProgress.total })}
          </Text>
          <View style={s.progressTrack}>
            <View
              style={[
                s.progressFill,
                { width: `${syncProgress.total > 0 ? Math.round((syncProgress.done / syncProgress.total) * 100) : 0}%` },
              ]}
            />
          </View>
        </>
      )}

      {syncPhase === 'done' && (
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: '100%' }]} />
        </View>
      )}

      {syncPhase === 'failed' && (
        <>
          <Text style={s.modalBody}>
            {t('profile.info.syncFailedMessage', { count: syncFailures })}
          </Text>
          <TouchableOpacity style={s.destructiveBtn} onPress={handleSignOutAnyway} activeOpacity={0.8}>
            <Text style={s.destructiveBtnText}>{t('profile.info.signOutAnyway')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ghostBtn} onPress={() => setSyncModalVisible(false)} activeOpacity={0.8}>
            <Text style={s.ghostBtnText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  </View>
</Modal>
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd lista-ai-mobile && npm run typecheck
```

Expected: no errors.

- [ ] **Step 8: Run full test suite**

```bash
cd lista-ai-mobile && npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add lista-ai-mobile/src/screens/PerfilInfo/index.tsx
git commit -m "feat: add sync-before-logout modal with progress bar to PerfilInfo"
```
