# Login-Time Remote Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pull all remote lists and items into the local SQLite DB immediately after login (when DB is empty), with a progress modal on the Login screen.

**Architecture:** A new `seedFromRemote` function in `src/sync/seed.ts` handles the one-time full pull (lists + items). The auth store runs it after a successful login if the local `lists` table is empty, blocking `isAuthenticated` until the seed completes. The Login screen reads `isSyncing` / `syncProgress` from the auth store and shows a modal overlay while syncing.

**Tech Stack:** Drizzle ORM (expo-sqlite), Zustand, React Native `Modal`, react-i18next, Jest

---

> All commands run from `lista-ai-mobile/` unless noted.

---

### Task 1: `seedFromRemote` function

**Files:**
- Create: `src/sync/__tests__/seed.test.ts`
- Create: `src/sync/seed.ts`

- [ ] **Step 1: Write the failing test**

Create `src/sync/__tests__/seed.test.ts`:

```ts
import { seedFromRemote } from '../seed';

var mockSelectWhere: jest.Mock;
var mockUpdateWhere: jest.Mock;
var mockSet: jest.Mock;
var mockFrom: jest.Mock;
var mockValues: jest.Mock;

jest.mock('../../db', () => ({
  db: {
    select: jest.fn(() => ({ from: mockFrom })),
    insert: jest.fn(() => ({ values: mockValues })),
    update: jest.fn(() => ({ set: mockSet })),
  },
}));

jest.mock('../../api/lists', () => ({
  fetchLists: jest.fn(),
}));

jest.mock('../../api/items', () => ({
  fetchItems: jest.fn(),
}));

jest.mock('../../utils/date', () => ({
  now: jest.fn().mockReturnValue(1000),
}));

import { db } from '../../db';
import { fetchLists } from '../../api/lists';
import { fetchItems } from '../../api/items';

beforeEach(() => {
  mockSelectWhere = jest.fn().mockResolvedValue([]);
  mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
  mockSet = jest.fn().mockReturnValue({ where: mockUpdateWhere });
  mockFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });
  mockValues = jest.fn().mockResolvedValue(undefined);
  jest.clearAllMocks();
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  mockFrom.mockReturnValue({ where: mockSelectWhere });
});

describe('seedFromRemote()', () => {
  it('does nothing when server returns no lists', async () => {
    (fetchLists as jest.Mock).mockResolvedValue([]);

    await seedFromRemote();

    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('inserts a new list when not in local DB', async () => {
    (fetchLists as jest.Mock).mockResolvedValue([{ id: 10, name: 'Groceries' }]);
    (fetchItems as jest.Mock).mockResolvedValue([]);
    // 1st where: check if list exists → not found
    // 2nd where: post-insert select to get localListId → found
    mockSelectWhere
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, remoteId: 10 }]);

    await seedFromRemote();

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ remoteId: 10, name: 'Groceries' }),
    );
  });

  it('updates an existing list without inserting', async () => {
    (fetchLists as jest.Mock).mockResolvedValue([{ id: 10, name: 'Groceries Updated' }]);
    (fetchItems as jest.Mock).mockResolvedValue([]);
    mockSelectWhere.mockResolvedValueOnce([{ id: 1, remoteId: 10 }]); // list exists

    await seedFromRemote();

    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith({ name: 'Groceries Updated' });
  });

  it('inserts items belonging to a new list', async () => {
    (fetchLists as jest.Mock).mockResolvedValue([{ id: 10, name: 'Groceries' }]);
    (fetchItems as jest.Mock).mockResolvedValue([
      { id: 20, description: 'Milk', checked: false },
    ]);
    mockSelectWhere
      .mockResolvedValueOnce([])                          // list not found
      .mockResolvedValueOnce([{ id: 1, remoteId: 10 }])  // get localListId
      .mockResolvedValueOnce([]);                         // item not found

    await seedFromRemote();

    expect(db.insert).toHaveBeenCalledTimes(2); // list insert + item insert
    expect(fetchItems).toHaveBeenCalledWith(10);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ remoteId: 20, listId: 1, description: 'Milk', checked: false }),
    );
  });

  it('updates an existing item without inserting', async () => {
    (fetchLists as jest.Mock).mockResolvedValue([{ id: 10, name: 'Groceries' }]);
    (fetchItems as jest.Mock).mockResolvedValue([
      { id: 20, description: 'Milk', checked: true },
    ]);
    mockSelectWhere
      .mockResolvedValueOnce([{ id: 1, remoteId: 10 }]) // list exists
      .mockResolvedValueOnce([{ id: 2, remoteId: 20 }]); // item exists

    await seedFromRemote();

    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledTimes(2); // list update + item update
    expect(mockSet).toHaveBeenCalledWith({ description: 'Milk', checked: true });
  });

  it('reports progress once per list with correct (done, total)', async () => {
    (fetchLists as jest.Mock).mockResolvedValue([
      { id: 10, name: 'Groceries' },
      { id: 11, name: 'Hardware' },
    ]);
    (fetchItems as jest.Mock).mockResolvedValue([]);
    // each list: check existence (not found) + post-insert select (found)
    mockSelectWhere
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, remoteId: 10 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 2, remoteId: 11 }]);

    const onProgress = jest.fn();
    await seedFromRemote(onProgress);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
  });

  it('propagates fetchLists errors to caller', async () => {
    (fetchLists as jest.Mock).mockRejectedValue(new Error('network error'));

    await expect(seedFromRemote()).rejects.toThrow('network error');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/sync/__tests__/seed.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../seed'`

- [ ] **Step 3: Implement `src/sync/seed.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/sync/__tests__/seed.test.ts --no-coverage
```

Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/sync/seed.ts src/sync/__tests__/seed.test.ts
git commit -m "feat: add seedFromRemote function to pull all lists and items from server"
```

---

### Task 2: Auth store — login-time seed

**Files:**
- Modify: `src/auth/__tests__/store.test.ts`
- Modify: `src/auth/store.ts`

- [ ] **Step 1: Add mocks and failing tests to `src/auth/__tests__/store.test.ts`**

At the top of the file, add these new mocks alongside the existing ones (after the existing `jest.mock` blocks, before the `import` statements):

```ts
var mockDbSelect: jest.Mock;
var mockDbFrom: jest.Mock;
var mockDbLimit: jest.Mock;
```

Replace the existing `jest.mock('../../db', ...)` block with:

```ts
jest.mock('../../db', () => ({
  db: {
    delete: (...args: any[]) => mockDbDelete(...args),
    select: (...args: any[]) => mockDbSelect(...args),
  },
}));
```

Add a new mock block after the existing `jest.mock` calls:

```ts
jest.mock('../../sync/seed', () => ({
  seedFromRemote: jest.fn().mockResolvedValue(undefined),
}));
```

Add this import after the existing imports:

```ts
import { seedFromRemote } from '../../sync/seed';
```

Update `beforeEach` to initialize the new mocks and reset the new state fields. Replace the existing `beforeEach` with:

```ts
beforeEach(() => {
  jest.clearAllMocks();
  mockDbDelete = jest.fn().mockResolvedValue(undefined);
  mockDbLimit = jest.fn().mockResolvedValue([]); // empty DB by default
  mockDbFrom = jest.fn().mockReturnValue({ limit: mockDbLimit });
  mockDbSelect = jest.fn().mockReturnValue({ from: mockDbFrom });
  useAuthStore.setState({
    isAuthenticated: false,
    isLoading: true,
    isSyncing: false,
    syncProgress: null,
    user: null,
    accessToken: null,
    refreshToken: null,
    error: null,
  });
});
```

Add this new describe block at the end of the file (before the final closing brace if any):

```ts
// ── loginLocal() seed-on-login ─────────────────────────────────────────────────

describe('loginLocal() seed-on-login', () => {
  it('calls seedFromRemote when lists table is empty after login', async () => {
    (apiLogin as jest.Mock).mockResolvedValue(tokenResponse);
    mockDbLimit.mockResolvedValue([]); // empty DB

    await act(async () => {
      await useAuthStore.getState().loginLocal('a@b.com', 'pass123');
    });

    expect(seedFromRemote).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().isSyncing).toBe(false);
    expect(useAuthStore.getState().syncProgress).toBeNull();
  });

  it('skips seedFromRemote when DB already has lists', async () => {
    (apiLogin as jest.Mock).mockResolvedValue(tokenResponse);
    mockDbLimit.mockResolvedValue([{ id: 1 }]); // DB not empty

    await act(async () => {
      await useAuthStore.getState().loginLocal('a@b.com', 'pass123');
    });

    expect(seedFromRemote).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('still authenticates if seedFromRemote throws', async () => {
    (apiLogin as jest.Mock).mockResolvedValue(tokenResponse);
    mockDbLimit.mockResolvedValue([]);
    (seedFromRemote as jest.Mock).mockRejectedValue(new Error('network'));

    await act(async () => {
      await useAuthStore.getState().loginLocal('a@b.com', 'pass123');
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().isSyncing).toBe(false);
  });

  it('sets isAuthenticated only after seed completes', async () => {
    (apiLogin as jest.Mock).mockResolvedValue(tokenResponse);
    mockDbLimit.mockResolvedValue([]);

    let resolveSeeed!: () => void;
    (seedFromRemote as jest.Mock).mockImplementation(
      () => new Promise<void>((res) => { resolveSeeed = res; }),
    );

    let loginDone = false;
    const loginPromise = act(async () => {
      await useAuthStore.getState().loginLocal('a@b.com', 'pass123');
      loginDone = true;
    });

    // Seed is still in flight — isAuthenticated must still be false
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().isSyncing).toBe(true);

    resolveSeeed();
    await loginPromise;

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(loginDone).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/auth/__tests__/store.test.ts --no-coverage
```

Expected: FAIL — new tests error because `isSyncing` / `syncProgress` don't exist in the store yet, and `seedFromRemote` is not called.

- [ ] **Step 3: Modify `src/auth/store.ts`**

Add this import near the top (after the existing db/schema imports):

```ts
import { seedFromRemote } from '../sync/seed';
```

Add `isSyncing` and `syncProgress` to `AuthState`:

```ts
type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  syncProgress: { done: number; total: number } | null;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
};
```

Add the initial values to the store creation:

```ts
  isAuthenticated: false,
  isLoading: true,
  isSyncing: false,
  syncProgress: null,
  user: null,
  accessToken: null,
  refreshToken: null,
  error: null,
```

Replace `loginLocal` with:

```ts
  loginLocal: async (email, password) => {
    set({ error: null });
    try {
      const tokens = await apiLogin(email, password);
      const payload = decodeJwtPayload(tokens.accessToken);
      const storedUser = await loadAuth();
      const user: AuthUser = {
        id:    String(payload['sub'] ?? ''),
        email: (payload['email'] as string) ?? email,
        name:  storedUser?.user.email === email ? (storedUser.user.name ?? email.split('@')[0]) : email.split('@')[0],
      };
      await saveAuth(tokens, user);
      set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user });

      const rows = await db.select().from(listsTable).limit(1);
      if (rows.length === 0) {
        set({ isSyncing: true, syncProgress: null });
        try {
          await seedFromRemote((done, total) => set({ syncProgress: { done, total } }));
        } catch { /* non-fatal: user lands in app with empty state */ }
        set({ isSyncing: false, syncProgress: null });
      }

      set({ isAuthenticated: true });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? i18n.t('auth.login.invalidCredentials');
      set({ error: msg });
      throw e;
    }
  },
```

Replace `loginGoogle` with:

```ts
  loginGoogle: async (googleIdToken) => {
    set({ error: null });
    try {
      const tokens = await apiGoogleAuth(googleIdToken);
      const { name, email } = extractGoogleUser(googleIdToken);
      const payload = decodeJwtPayload(tokens.accessToken);
      const user: AuthUser = {
        id:    String(payload['sub'] ?? ''),
        email: (payload['email'] as string) ?? email,
        name:  name || email.split('@')[0],
      };
      await saveAuth(tokens, user);
      set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user });

      const rows = await db.select().from(listsTable).limit(1);
      if (rows.length === 0) {
        set({ isSyncing: true, syncProgress: null });
        try {
          await seedFromRemote((done, total) => set({ syncProgress: { done, total } }));
        } catch { /* non-fatal */ }
        set({ isSyncing: false, syncProgress: null });
      }

      set({ isAuthenticated: true });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? i18n.t('auth.login.googleError');
      set({ error: msg });
      throw e;
    }
  },
```

- [ ] **Step 4: Run all store tests to verify they pass**

```bash
npx jest src/auth/__tests__/store.test.ts --no-coverage
```

Expected: PASS — all tests including the new seed-on-login ones.

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
npx jest --no-coverage
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/auth/store.ts src/auth/__tests__/store.test.ts
git commit -m "feat: run seedFromRemote on login when local DB is empty"
```

---

### Task 3: i18n — add login sync string

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/pt-BR.json`
- Modify: `src/i18n/locales/es.json`
- Modify: `src/i18n/locales/fr.json`
- Modify: `src/i18n/locales/de.json`

- [ ] **Step 1: Add `sync.login.syncing` to all locales**

In each file, find the `"sync"` object and add a `"login"` sub-object. The current shape is:

```json
"sync": {
  "error": "...",
  "syncing_one": "...",
  "syncing_other": "..."
}
```

Change it to:

**`en.json`:**
```json
"sync": {
  "error": "Sync error — tap to retry",
  "syncing_one": "Syncing {{count}} item…",
  "syncing_other": "Syncing {{count}} items…",
  "login": {
    "syncing": "Syncing your lists…"
  }
}
```

**`pt-BR.json`:**
```json
"sync": {
  "error": "Erro de sincronização — toque para tentar novamente",
  "syncing_one": "Sincronizando {{count}} item…",
  "syncing_other": "Sincronizando {{count}} itens…",
  "login": {
    "syncing": "Sincronizando suas listas…"
  }
}
```

**`es.json`:**
```json
"sync": {
  "error": "Error de sincronización — toca para reintentar",
  "syncing_one": "Sincronizando {{count}} elemento…",
  "syncing_other": "Sincronizando {{count}} elementos…",
  "login": {
    "syncing": "Sincronizando tus listas…"
  }
}
```

**`fr.json`:**
```json
"sync": {
  "error": "Erreur de synchronisation — appuyez pour réessayer",
  "syncing_one": "Synchronisation de {{count}} élément…",
  "syncing_other": "Synchronisation de {{count}} éléments…",
  "login": {
    "syncing": "Synchronisation de vos listes…"
  }
}
```

**`de.json`:**
```json
"sync": {
  "error": "Synchronisierungsfehler — tippe zum Wiederholen",
  "syncing_one": "Synchronisiere {{count}} Element…",
  "syncing_other": "Synchronisiere {{count}} Elemente…",
  "login": {
    "syncing": "Deine Listen werden synchronisiert…"
  }
}
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/i18n/locales/
git commit -m "feat: add sync.login.syncing i18n key for all locales"
```

---

### Task 4: Login screen — sync progress modal

**Files:**
- Modify: `src/screens/Login/index.tsx`

- [ ] **Step 1: Add `Modal` import**

In the React Native import block at the top of `src/screens/Login/index.tsx`, add `Modal`:

```ts
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
```

- [ ] **Step 2: Read `isSyncing` and `syncProgress` from the auth store**

Replace the existing store destructure line:

```ts
const { loginLocal, loginGoogle, error, clearError } = useAuthStore();
```

With:

```ts
const { loginLocal, loginGoogle, error, clearError, isSyncing, syncProgress } = useAuthStore();
```

- [ ] **Step 3: Add modal styles**

Inside the `StyleSheet.create({...})` call (after the existing styles), add:

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
      gap: 16,
    },
    modalTitle: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
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
```

- [ ] **Step 4: Add modal JSX**

In the return statement, add the `Modal` as the last child of `<SafeAreaView>`, after `</KeyboardAvoidingView>`:

```tsx
    <Modal visible={isSyncing} transparent animationType="fade">
      <View style={s.modalOverlay}>
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>{t('sync.login.syncing')}</Text>
          {syncProgress ? (
            <View style={s.progressTrack}>
              <View
                style={[
                  s.progressFill,
                  {
                    width: `${syncProgress.total > 0
                      ? Math.round((syncProgress.done / syncProgress.total) * 100)
                      : 0}%`,
                  },
                ]}
              />
            </View>
          ) : (
            <ActivityIndicator size="small" color={theme.primary} />
          )}
        </View>
      </View>
    </Modal>
```

The full return should look like:

```tsx
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* ... existing content unchanged ... */}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={isSyncing} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{t('sync.login.syncing')}</Text>
            {syncProgress ? (
              <View style={s.progressTrack}>
                <View
                  style={[
                    s.progressFill,
                    {
                      width: `${syncProgress.total > 0
                        ? Math.round((syncProgress.done / syncProgress.total) * 100)
                        : 0}%`,
                    },
                  ]}
                />
              </View>
            ) : (
              <ActivityIndicator size="small" color={theme.primary} />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
```

- [ ] **Step 5: TypeScript check**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/screens/Login/index.tsx
git commit -m "feat: show sync progress modal on Login screen during post-login seed"
```
