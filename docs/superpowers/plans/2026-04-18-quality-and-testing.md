# Quality & Testing — lista-ai-mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add unit, component, and Maestro E2E tests; fix two code-quality issues in executor.ts; and add a GitHub Actions CI pipeline.

**Architecture:** Jest + jest-expo runs all unit and component tests in Node (no simulator). Native modules are mocked globally in `jest.setup.ts` and per-file as needed. Drizzle's builder chain is mocked using `var` hoisting so mock references resolve at call time. Maestro YAML flows run locally against a simulator. GitHub Actions runs typecheck, lint, and jest in parallel on every push/PR to `main`.

**Tech Stack:** jest-expo 54, @testing-library/react-native 13, @testing-library/jest-native 5, @types/jest 29, Maestro (E2E, local only)

**Working directory for all `npm` commands:** `lista-ai-mobile/`

---

## File Map

**New files:**
- `lista-ai-mobile/jest.setup.ts` — global mocks (react-i18next, ThemeContext, safe-area, SecureStore, lucide, expo-web-browser, expo-auth-session)
- `lista-ai-mobile/src/utils/__tests__/date.test.ts`
- `lista-ai-mobile/src/utils/__tests__/id.test.ts`
- `lista-ai-mobile/src/sync/__tests__/conflict.test.ts`
- `lista-ai-mobile/src/sync/__tests__/queue.test.ts`
- `lista-ai-mobile/src/sync/__tests__/executor.test.ts`
- `lista-ai-mobile/src/auth/__tests__/store.test.ts`
- `lista-ai-mobile/src/components/__tests__/ItemRow.test.tsx`
- `lista-ai-mobile/src/components/__tests__/ListCard.test.tsx`
- `lista-ai-mobile/src/screens/Login/__tests__/Login.test.tsx`
- `lista-ai-mobile/src/screens/Register/__tests__/Register.test.tsx`
- `lista-ai-mobile/src/screens/ListsHome/__tests__/ListsHome.test.tsx`
- `lista-ai-mobile/src/screens/AddEditList/__tests__/AddEditList.test.tsx`
- `lista-ai-front/.github/workflows/ci.yml`
- `lista-ai-front/e2e/auth.yaml`
- `lista-ai-front/e2e/shopping.yaml`

**Modified files:**
- `lista-ai-mobile/package.json` — add test dependencies and jest config
- `lista-ai-mobile/src/sync/executor.ts` — remove unused import, fix `any` cast

---

## Task 1: Install test dependencies and configure Jest

**Files:**
- Modify: `lista-ai-mobile/package.json`

- [ ] **Step 1: Install test dependencies**

Run from `lista-ai-mobile/`:
```bash
npm install --save-dev \
  jest-expo@54 \
  @testing-library/react-native@13 \
  @testing-library/jest-native@5 \
  @types/jest@29
```

Expected: packages added to `devDependencies`, no peer-dep errors.

- [ ] **Step 2: Add jest config and test script to package.json**

In `lista-ai-mobile/package.json`, add under the top-level keys:
```json
"scripts": {
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web",
  "db:generate": "drizzle-kit generate",
  "db:studio": "drizzle-kit studio",
  "typecheck": "tsc --noEmit",
  "lint": "eslint src --ext .ts,.tsx",
  "test": "jest"
},
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterFramework": ["<rootDir>/jest.setup.ts"],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native)"
  ]
}
```

- [ ] **Step 3: Create a trivial smoke test to verify Jest runs**

Create `lista-ai-mobile/src/utils/__tests__/smoke.test.ts`:
```typescript
it('jest is configured', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 4: Run the smoke test**

```bash
npm test -- --testPathPattern=smoke --watchAll=false
```

Expected output:
```
PASS src/utils/__tests__/smoke.test.ts
  ✓ jest is configured
```

If you see `setupFilesAfterFramework` not recognised, the correct Jest key may be `setupFilesAfterEach` — check `jest --showConfig | grep setup` and adjust accordingly.

- [ ] **Step 5: Delete the smoke test**

```bash
rm lista-ai-mobile/src/utils/__tests__/smoke.test.ts
```

- [ ] **Step 6: Commit**

```bash
cd lista-ai-mobile && git add package.json package-lock.json
git commit -m "chore: install jest-expo, RNTL and configure jest"
```

---

## Task 2: Create global mock setup file

**Files:**
- Create: `lista-ai-mobile/jest.setup.ts`

- [ ] **Step 1: Create jest.setup.ts**

```typescript
// lista-ai-mobile/jest.setup.ts
import '@testing-library/jest-native/extend-expect';

// ── react-i18next ─────────────────────────────────────────────────────────────
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

// ── ThemeContext ───────────────────────────────────────────────────────────────
const mockTheme = {
  background: '#111210',
  surface: '#1A1C1A',
  surfaceElevated: '#161A18',
  border: '#0F2E28',
  borderSubtle: '#1A2420',
  progressTrack: '#222420',
  primary: '#1D9E75',
  accent: '#EF9F27',
  neutral: '#888780',
  textPrimary: '#EEF2F0',
  destructive: '#EF4444',
  dragHandle: '#333333',
  placeholder: '#888780',
};

jest.mock('./src/theme/ThemeContext', () => ({
  useTheme: () => ({ theme: mockTheme }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── react-native-safe-area-context ────────────────────────────────────────────
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      React.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

// ── expo-secure-store (in-memory, reset per test via jest.clearAllMocks) ──────
const secureStoreMap: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key: string, value: string) => {
    secureStoreMap[key] = value;
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key: string) =>
    Promise.resolve(secureStoreMap[key] ?? null),
  ),
  deleteItemAsync: jest.fn((key: string) => {
    delete secureStoreMap[key];
    return Promise.resolve();
  }),
}));

// ── lucide-react-native (icons render as plain Views in tests) ────────────────
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target: object, name: string) =>
        ({ testID, ...rest }: any) =>
          React.createElement(View, { testID: testID ?? name, ...rest }),
    },
  );
});

// ── expo-web-browser ──────────────────────────────────────────────────────────
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

// ── expo-auth-session/providers/google ────────────────────────────────────────
jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => [null, null, jest.fn()],
}));

// ── @react-native-community/netinfo ──────────────────────────────────────────
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true }),
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));
```

- [ ] **Step 2: Run jest to verify setup loads without errors**

```bash
npm test -- --watchAll=false --passWithNoTests
```

Expected: `No tests found` or 0 test suites — no import or mock errors.

- [ ] **Step 3: Commit**

```bash
git add jest.setup.ts
git commit -m "chore: add global jest mock setup"
```

---

## Task 3: Fix code quality issues in executor.ts

**Files:**
- Modify: `lista-ai-mobile/src/sync/executor.ts`

> **Note:** Form validation in `AddEditList` and `AddEditItem` is already implemented (`disabled={!name.trim()}` and early return guards). No changes needed there.

- [ ] **Step 1: Remove the unused import and fix the `any` cast**

Open `lista-ai-mobile/src/sync/executor.ts`. Make two changes:

1. Line 4 — remove `shouldOverwrite` from the import:
```typescript
// Before:
import { shouldOverwrite } from './conflict';
// After: delete this line entirely
```

2. Line 21 — replace `as any` with the correct type:
```typescript
// Before:
await syncListOperation(entry.id, entry.operation as any, payload);
// After:
await syncListOperation(entry.id, entry.operation as SyncOperation, payload);
```

Also add the missing import at the top (if not already present):
```typescript
import type { SyncOperation } from '../types/sync';
```

3. Do the same for line 23 (item operation):
```typescript
// Before:
await syncItemOperation(entry.id, entry.operation as any, payload);
// After:
await syncItemOperation(entry.id, entry.operation as SyncOperation, payload);
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
npm run typecheck
```

Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/sync/executor.ts
git commit -m "fix: remove unused shouldOverwrite import and type any cast in executor"
```

---

## Task 4: Unit tests — utils

**Files:**
- Create: `lista-ai-mobile/src/utils/__tests__/date.test.ts`
- Create: `lista-ai-mobile/src/utils/__tests__/id.test.ts`

- [ ] **Step 1: Write date tests**

```typescript
// src/utils/__tests__/date.test.ts
import { now } from '../date';

describe('now()', () => {
  it('returns a number', () => {
    expect(typeof now()).toBe('number');
  });

  it('is close to Date.now()', () => {
    const before = Date.now();
    const result = now();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });

  it('increases monotonically across successive calls', () => {
    const first = now();
    const second = now();
    expect(second).toBeGreaterThanOrEqual(first);
  });
});
```

- [ ] **Step 2: Run date tests**

```bash
npm test -- --testPathPattern=utils/__tests__/date --watchAll=false
```

Expected: `3 passed`.

- [ ] **Step 3: Write id tests**

```typescript
// src/utils/__tests__/id.test.ts
import { generateLocalId } from '../id';

describe('generateLocalId()', () => {
  it('returns a negative integer', () => {
    const id = generateLocalId();
    expect(id).toBeLessThan(0);
    expect(Number.isInteger(id)).toBe(true);
  });

  it('successive calls return distinct values', async () => {
    const ids = new Set<number>();
    for (let i = 0; i < 5; i++) {
      // Small delay ensures Date.now() differs
      await new Promise((r) => setTimeout(r, 2));
      ids.add(generateLocalId());
    }
    expect(ids.size).toBe(5);
  });
});
```

- [ ] **Step 4: Run id tests**

```bash
npm test -- --testPathPattern=utils/__tests__/id --watchAll=false
```

Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/utils/__tests__/
git commit -m "test: unit tests for date and id utils"
```

---

## Task 5: Unit tests — sync/conflict

**Files:**
- Create: `lista-ai-mobile/src/sync/__tests__/conflict.test.ts`

- [ ] **Step 1: Write conflict tests**

```typescript
// src/sync/__tests__/conflict.test.ts
import { shouldOverwrite } from '../conflict';

describe('shouldOverwrite()', () => {
  it('returns true when remote is newer than local', () => {
    expect(shouldOverwrite(1000, 2000)).toBe(true);
  });

  it('returns false when local is newer than remote', () => {
    expect(shouldOverwrite(2000, 1000)).toBe(false);
  });

  it('returns false when timestamps are equal', () => {
    expect(shouldOverwrite(1000, 1000)).toBe(false);
  });

  it('returns false when remoteUpdatedAt is undefined', () => {
    expect(shouldOverwrite(1000, undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run conflict tests**

```bash
npm test -- --testPathPattern=sync/__tests__/conflict --watchAll=false
```

Expected: `4 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/sync/__tests__/conflict.test.ts
git commit -m "test: unit tests for sync conflict resolution"
```

---

## Task 6: Unit tests — sync/queue

**Files:**
- Create: `lista-ai-mobile/src/sync/__tests__/queue.test.ts`

The Drizzle `db` builder chain is mocked using `var` declarations (hoisted) so mock references are captured by the factory closure and resolve to their assigned values at call time.

- [ ] **Step 1: Write queue tests**

```typescript
// src/sync/__tests__/queue.test.ts
import { enqueue, getPending, remove, incrementRetry, markFailed } from '../queue';

// var declarations are hoisted — they exist as undefined when jest.mock factory runs,
// but the factory closures capture them by reference and see the assigned values at call time.
var mockOrderBy: jest.Mock;
var mockSelectWhere: jest.Mock;
var mockUpdateWhere: jest.Mock;
var mockDeleteWhere: jest.Mock;
var mockSet: jest.Mock;
var mockFrom: jest.Mock;
var mockValues: jest.Mock;

jest.mock('../../db', () => ({
  db: {
    select: jest.fn(() => ({ from: mockFrom })),
    insert: jest.fn(() => ({ values: mockValues })),
    update: jest.fn(() => ({ set: mockSet })),
    delete: jest.fn(() => ({ where: mockDeleteWhere })),
  },
}));

import { db } from '../../db';
import { now } from '../../utils/date';

jest.mock('../../utils/date', () => ({ now: jest.fn(() => 1000) }));

beforeEach(() => {
  mockSelectWhere = jest.fn().mockResolvedValue([]);
  mockOrderBy = jest.fn().mockResolvedValue([]);
  mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
  mockDeleteWhere = jest.fn().mockResolvedValue(undefined);
  mockSet = jest.fn().mockReturnValue({ where: mockUpdateWhere });
  mockFrom = jest.fn().mockReturnValue({ where: mockSelectWhere, orderBy: mockOrderBy });
  mockValues = jest.fn().mockResolvedValue(undefined);
  jest.clearAllMocks();
  // Re-apply return values after clearAllMocks
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  mockFrom.mockReturnValue({ where: mockSelectWhere, orderBy: mockOrderBy });
});

describe('enqueue()', () => {
  it('calls db.insert with the correct entity, operation and payload', async () => {
    await enqueue({ entity: 'list', operation: 'create', payload: '{}' });

    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'list',
        operation: 'create',
        payload: '{}',
        retryCount: 0,
        lastError: null,
      }),
    );
  });
});

describe('getPending()', () => {
  it('returns rows ordered by createdAt', async () => {
    const rows = [
      { id: 1, entity: 'list', operation: 'create', payload: '{}', createdAt: 100, retryCount: 0, lastError: null },
    ];
    mockOrderBy.mockResolvedValue(rows);

    const result = await getPending();

    expect(result).toEqual(rows);
    expect(db.select).toHaveBeenCalled();
  });

  it('returns empty array when queue is empty', async () => {
    mockOrderBy.mockResolvedValue([]);
    const result = await getPending();
    expect(result).toEqual([]);
  });
});

describe('remove()', () => {
  it('calls db.delete with the given id', async () => {
    await remove(42);

    expect(db.delete).toHaveBeenCalled();
    expect(mockDeleteWhere).toHaveBeenCalled();
  });
});

describe('incrementRetry()', () => {
  it('increments retryCount and sets lastError', async () => {
    const entry = { id: 7, retryCount: 1, lastError: null };
    mockSelectWhere.mockResolvedValue([entry]);

    await incrementRetry(7, 'network error');

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ retryCount: 2, lastError: 'network error' }),
    );
  });

  it('does nothing when entry is not found', async () => {
    mockSelectWhere.mockResolvedValue([]);
    await incrementRetry(99, 'err');
    expect(mockSet).not.toHaveBeenCalled();
  });
});

describe('markFailed()', () => {
  it('sets retryCount to -1', async () => {
    await markFailed(3, 'fatal error');

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ retryCount: -1, lastError: 'fatal error' }),
    );
  });
});
```

- [ ] **Step 2: Run queue tests**

```bash
npm test -- --testPathPattern=sync/__tests__/queue --watchAll=false
```

Expected: `6 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/sync/__tests__/queue.test.ts
git commit -m "test: unit tests for sync queue operations"
```

---

## Task 7: Unit tests — sync/executor

**Files:**
- Create: `lista-ai-mobile/src/sync/__tests__/executor.test.ts`

- [ ] **Step 1: Write executor tests**

```typescript
// src/sync/__tests__/executor.test.ts
import { executeSync } from '../executor';

var mockOrderBy: jest.Mock;
var mockSelectWhere: jest.Mock;
var mockUpdateWhere: jest.Mock;
var mockDeleteWhere: jest.Mock;
var mockSet: jest.Mock;
var mockFrom: jest.Mock;
var mockValues: jest.Mock;

jest.mock('../../db', () => ({
  db: {
    select: jest.fn(() => ({ from: mockFrom })),
    insert: jest.fn(() => ({ values: mockValues })),
    update: jest.fn(() => ({ set: mockSet })),
    delete: jest.fn(() => ({ where: mockDeleteWhere })),
  },
}));

jest.mock('../queue', () => ({
  getPending: jest.fn(),
  remove: jest.fn().mockResolvedValue(undefined),
  incrementRetry: jest.fn().mockResolvedValue(undefined),
  markFailed: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../api/lists', () => ({
  fetchLists: jest.fn().mockResolvedValue([]),
  createList: jest.fn(),
  deleteList: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../api/items', () => ({
  createItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn().mockResolvedValue(undefined),
}));

import { db } from '../../db';
import { getPending, remove, incrementRetry, markFailed } from '../queue';
import { createList, fetchLists } from '../../api/lists';
import { createItem, updateItem } from '../../api/items';

const makePending = (overrides = {}): any => ({
  id: 1,
  entity: 'list',
  operation: 'create',
  payload: JSON.stringify({ localId: -1, name: 'Groceries' }),
  retryCount: 0,
  lastError: null,
  ...overrides,
});

beforeEach(() => {
  mockSelectWhere = jest.fn().mockResolvedValue([]);
  mockOrderBy = jest.fn().mockResolvedValue([]);
  mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
  mockDeleteWhere = jest.fn().mockResolvedValue(undefined);
  mockSet = jest.fn().mockReturnValue({ where: mockUpdateWhere });
  mockFrom = jest.fn().mockReturnValue({ where: mockSelectWhere, orderBy: mockOrderBy });
  mockValues = jest.fn().mockResolvedValue(undefined);
  jest.clearAllMocks();
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  mockFrom.mockReturnValue({ where: mockSelectWhere, orderBy: mockOrderBy });
  (fetchLists as jest.Mock).mockResolvedValue([]);
});

describe('executeSync()', () => {
  it('skips entries with retryCount === -1', async () => {
    (getPending as jest.Mock).mockResolvedValue([makePending({ retryCount: -1 })]);

    await executeSync();

    expect(createList).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('calls createList and updates remoteId for list/create', async () => {
    (getPending as jest.Mock).mockResolvedValue([
      makePending({ entity: 'list', operation: 'create', payload: JSON.stringify({ localId: -1, name: 'Groceries' }) }),
    ]);
    (createList as jest.Mock).mockResolvedValue({ id: 99, name: 'Groceries' });

    await executeSync();

    expect(createList).toHaveBeenCalledWith('Groceries');
    expect(db.update).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith(1);
  });

  it('calls incrementRetry on API failure', async () => {
    (getPending as jest.Mock).mockResolvedValue([makePending()]);
    (createList as jest.Mock).mockRejectedValue(new Error('network error'));

    await executeSync();

    expect(incrementRetry).toHaveBeenCalledWith(1, 'network error');
    expect(remove).not.toHaveBeenCalled();
  });

  it('calls markFailed after 4 retries (retryCount >= 4)', async () => {
    (getPending as jest.Mock).mockResolvedValue([makePending({ retryCount: 4 })]);
    (createList as jest.Mock).mockRejectedValue(new Error('persistent error'));

    await executeSync();

    expect(markFailed).toHaveBeenCalledWith(1, 'persistent error');
    expect(incrementRetry).not.toHaveBeenCalled();
  });

  it('routes item/create to createItem', async () => {
    const payload = {
      localId: -2,
      localListId: -1,
      remoteListId: 10,
      description: 'Milk',
    };
    (getPending as jest.Mock).mockResolvedValue([
      makePending({ entity: 'item', operation: 'create', payload: JSON.stringify(payload) }),
    ]);
    // Simulate that the list has been synced and has a remoteId
    mockSelectWhere.mockResolvedValue([{ id: -1, remoteId: 10 }]);
    (createItem as jest.Mock).mockResolvedValue({ id: 55, description: 'Milk' });

    await executeSync();

    expect(createItem).toHaveBeenCalledWith(10, { description: 'Milk' });
    expect(remove).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Run executor tests**

```bash
npm test -- --testPathPattern=sync/__tests__/executor --watchAll=false
```

Expected: `5 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/sync/__tests__/executor.test.ts
git commit -m "test: unit tests for sync executor"
```

---

## Task 8: Unit tests — auth/store

**Files:**
- Create: `lista-ai-mobile/src/auth/__tests__/store.test.ts`

- [ ] **Step 1: Write auth store tests**

```typescript
// src/auth/__tests__/store.test.ts
import { act } from '@testing-library/react-native';

jest.mock('../../api/auth', () => ({
  apiRegister: jest.fn(),
  apiLogin:    jest.fn(),
  apiGoogleAuth: jest.fn(),
  apiRefresh:  jest.fn(),
  apiLogout:   jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../i18n', () => ({
  default: { t: (key: string) => key },
  t: (key: string) => key,
}));

import { useAuthStore } from '../store';
import { apiRegister, apiLogin, apiRefresh, apiLogout } from '../../api/auth';

const tokenResponse = {
  accessToken:
    'eyJhbGciOiJIUzI1NiJ9.' +
    btoa(JSON.stringify({ sub: '1', email: 'a@b.com', exp: 9999999999 })) +
    '.sig',
  refreshToken: 'refresh-abc',
  expiresIn: 900,
};

beforeEach(() => {
  jest.clearAllMocks();
  // Reset store state between tests
  useAuthStore.setState({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    accessToken: null,
    refreshToken: null,
    error: null,
  });
});

describe('register()', () => {
  it('sets isAuthenticated and stores tokens on success', async () => {
    (apiRegister as jest.Mock).mockResolvedValue(tokenResponse);

    await act(async () => {
      await useAuthStore.getState().register('a@b.com', 'pass123', 'Alice');
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe(tokenResponse.accessToken);
    expect(state.refreshToken).toBe(tokenResponse.refreshToken);
    expect(state.user?.email).toBe('a@b.com');
  });

  it('sets error and re-throws on failure', async () => {
    (apiRegister as jest.Mock).mockRejectedValue({
      response: { data: { detail: 'Email already registered' } },
    });

    await expect(
      act(async () => {
        await useAuthStore.getState().register('a@b.com', 'pass123', 'Alice');
      }),
    ).rejects.toBeDefined();

    expect(useAuthStore.getState().error).toBe('Email already registered');
  });
});

describe('loginLocal()', () => {
  it('sets isAuthenticated on valid credentials', async () => {
    (apiLogin as jest.Mock).mockResolvedValue(tokenResponse);

    await act(async () => {
      await useAuthStore.getState().loginLocal('a@b.com', 'pass123');
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('sets error message on failure', async () => {
    (apiLogin as jest.Mock).mockRejectedValue({
      response: { data: { detail: 'Invalid credentials' } },
    });

    await expect(
      act(async () => {
        await useAuthStore.getState().loginLocal('a@b.com', 'wrong');
      }),
    ).rejects.toBeDefined();

    expect(useAuthStore.getState().error).toBe('Invalid credentials');
  });
});

describe('refreshTokens()', () => {
  it('updates tokens in state and storage', async () => {
    const newTokens = { ...tokenResponse, accessToken: 'new-access', refreshToken: 'new-refresh' };
    (apiRefresh as jest.Mock).mockResolvedValue(newTokens);

    useAuthStore.setState({ refreshToken: 'old-refresh', user: { id: '1', name: 'A', email: 'a@b.com' } });

    await act(async () => {
      await useAuthStore.getState().refreshTokens();
    });

    expect(useAuthStore.getState().accessToken).toBe('new-access');
    expect(useAuthStore.getState().refreshToken).toBe('new-refresh');
  });
});

describe('logout()', () => {
  it('clears auth state and calls apiLogout', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      refreshToken: 'ref',
      user: { id: '1', name: 'A', email: 'a@b.com' },
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
  });
});

describe('hydrate()', () => {
  it('sets isAuthenticated from SecureStore when tokens exist', async () => {
    // expo-secure-store is mocked globally; pre-populate it
    const secureStore = require('expo-secure-store');
    secureStore.getItemAsync.mockImplementation((key: string) => {
      const map: Record<string, string> = {
        'auth.accessToken':  tokenResponse.accessToken,
        'auth.refreshToken': tokenResponse.refreshToken,
        'auth.userEmail':    'a@b.com',
        'auth.userId':       '1',
        'auth.userName':     'Alice',
      };
      return Promise.resolve(map[key] ?? null);
    });

    await act(async () => {
      await useAuthStore.getState().hydrate();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('sets isLoading false and stays unauthenticated when no tokens stored', async () => {
    const secureStore = require('expo-secure-store');
    secureStore.getItemAsync.mockResolvedValue(null);

    await act(async () => {
      await useAuthStore.getState().hydrate();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
```

- [ ] **Step 2: Run auth store tests**

```bash
npm test -- --testPathPattern=auth/__tests__/store --watchAll=false
```

Expected: `7 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/auth/__tests__/store.test.ts
git commit -m "test: unit tests for auth store"
```

---

## Task 9: Component test — ItemRow

**Files:**
- Create: `lista-ai-mobile/src/components/__tests__/ItemRow.test.tsx`

- [ ] **Step 1: Write ItemRow tests**

```typescript
// src/components/__tests__/ItemRow.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ItemRow } from '../ItemRow';
import type { Item } from '../../types/item';

const baseItem: Item = {
  id: 1,
  remoteId: null,
  listId: 10,
  description: 'Milk',
  checked: false,
  quantity: 2,
  price: null,
  uom: 'L',
  updatedAt: Date.now(),
  deletedAt: null,
};

describe('ItemRow', () => {
  it('renders item description', () => {
    const { getByText } = render(
      <ItemRow item={baseItem} onToggle={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('Milk')).toBeTruthy();
  });

  it('renders quantity and unit label', () => {
    const { getByText } = render(
      <ItemRow item={baseItem} onToggle={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('2 L')).toBeTruthy();
  });

  it('calls onToggle when checkbox area is pressed', () => {
    const onToggle = jest.fn();
    const { getAllByRole } = render(
      <ItemRow item={baseItem} onToggle={onToggle} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    // Checkbox is a TouchableOpacity — press the first touchable
    fireEvent.press(getAllByRole('button')[0]);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit when description area is pressed', () => {
    const onEdit = jest.fn();
    const { getByText } = render(
      <ItemRow item={baseItem} onToggle={jest.fn()} onEdit={onEdit} onDelete={jest.fn()} />,
    );
    fireEvent.press(getByText('Milk'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button is pressed', () => {
    const onDelete = jest.fn();
    const { getAllByRole } = render(
      <ItemRow item={baseItem} onToggle={jest.fn()} onEdit={jest.fn()} onDelete={onDelete} />,
    );
    const buttons = getAllByRole('button');
    fireEvent.press(buttons[buttons.length - 1]); // last button is delete
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run ItemRow tests**

```bash
npm test -- --testPathPattern=components/__tests__/ItemRow --watchAll=false
```

Expected: `5 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/components/__tests__/ItemRow.test.tsx
git commit -m "test: component tests for ItemRow"
```

---

## Task 10: Component test — ListCard

**Files:**
- Create: `lista-ai-mobile/src/components/__tests__/ListCard.test.tsx`

- [ ] **Step 1: Write ListCard tests**

```typescript
// src/components/__tests__/ListCard.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ListCard } from '../ListCard';
import type { List } from '../../types/list';

// ListCard calls useItemsQuery internally — mock it
jest.mock('../../hooks/useItems', () => ({
  useItemsQuery: jest.fn(),
}));

import { useItemsQuery } from '../../hooks/useItems';

const baseList: List = {
  id: 1,
  remoteId: 10,
  name: 'Groceries',
  updatedAt: Date.now(),
  deletedAt: null,
};

beforeEach(() => {
  (useItemsQuery as jest.Mock).mockReturnValue({ data: [] });
});

describe('ListCard', () => {
  it('renders the list name', () => {
    const { getByText } = render(
      <ListCard list={baseList} onPress={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('Groceries')).toBeTruthy();
  });

  it('shows 0 / 0 when no items', () => {
    (useItemsQuery as jest.Mock).mockReturnValue({ data: [] });
    const { getByText } = render(
      <ListCard list={baseList} onPress={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('0 / 0')).toBeTruthy();
  });

  it('shows correct checked / total count', () => {
    (useItemsQuery as jest.Mock).mockReturnValue({
      data: [
        { id: 1, checked: true },
        { id: 2, checked: false },
        { id: 3, checked: true },
      ],
    });
    const { getByText } = render(
      <ListCard list={baseList} onPress={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('2 / 3')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ListCard list={baseList} onPress={onPress} onDelete={jest.fn()} />,
    );
    fireEvent.press(getByText('Groceries'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run ListCard tests**

```bash
npm test -- --testPathPattern=components/__tests__/ListCard --watchAll=false
```

Expected: `4 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/components/__tests__/ListCard.test.tsx
git commit -m "test: component tests for ListCard"
```

---

## Task 11: Component test — Login screen

**Files:**
- Create: `lista-ai-mobile/src/screens/Login/__tests__/Login.test.tsx`

- [ ] **Step 1: Write Login tests**

```typescript
// src/screens/Login/__tests__/Login.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Login } from '../index';

jest.mock('../../../auth/store', () => ({
  useAuthStore: jest.fn(),
}));

import { useAuthStore } from '../../../auth/store';

const mockNavigation: any = { navigate: jest.fn() };

function makeStore(overrides = {}) {
  return {
    loginLocal: jest.fn().mockResolvedValue(undefined),
    loginGoogle: jest.fn().mockResolvedValue(undefined),
    error: null,
    clearError: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthStore as unknown as jest.Mock).mockReturnValue(makeStore());
});

describe('Login screen', () => {
  it('renders email and password fields', () => {
    const { getByPlaceholderText } = render(<Login navigation={mockNavigation} route={{} as any} />);
    // Placeholders come from t() which returns the key
    expect(getByPlaceholderText('auth.emailPlaceholder')).toBeTruthy();
    expect(getByPlaceholderText('auth.passwordPlaceholder')).toBeTruthy();
  });

  it('login button is disabled when fields are empty', () => {
    const { getByText } = render(<Login navigation={mockNavigation} route={{} as any} />);
    const btn = getByText('auth.login.signIn');
    expect(btn.props.accessibilityState?.disabled ?? btn.parent?.props?.disabled).toBeTruthy();
  });

  it('calls loginLocal with trimmed email and password', async () => {
    const loginLocal = jest.fn().mockResolvedValue(undefined);
    (useAuthStore as unknown as jest.Mock).mockReturnValue(makeStore({ loginLocal }));

    const { getByPlaceholderText, getByText } = render(
      <Login navigation={mockNavigation} route={{} as any} />,
    );

    fireEvent.changeText(getByPlaceholderText('auth.emailPlaceholder'), '  user@example.com  ');
    fireEvent.changeText(getByPlaceholderText('auth.passwordPlaceholder'), 'secret');
    fireEvent.press(getByText('auth.login.signIn'));

    await waitFor(() => {
      expect(loginLocal).toHaveBeenCalledWith('user@example.com', 'secret');
    });
  });

  it('shows error banner when store has an error', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue(
      makeStore({ error: 'Invalid credentials' }),
    );
    const { getByText } = render(<Login navigation={mockNavigation} route={{} as any} />);
    expect(getByText('Invalid credentials')).toBeTruthy();
  });

  it('navigates to Register when sign-up link is pressed', () => {
    const navigate = jest.fn();
    const { getByText } = render(
      <Login navigation={{ ...mockNavigation, navigate }} route={{} as any} />,
    );
    fireEvent.press(getByText('auth.login.signUp'));
    expect(navigate).toHaveBeenCalledWith('Register');
  });
});
```

- [ ] **Step 2: Run Login tests**

```bash
npm test -- --testPathPattern=screens/Login/__tests__ --watchAll=false
```

Expected: `5 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Login/__tests__/Login.test.tsx
git commit -m "test: component tests for Login screen"
```

---

## Task 12: Component test — Register screen

**Files:**
- Create: `lista-ai-mobile/src/screens/Register/__tests__/Register.test.tsx`

- [ ] **Step 1: Write Register tests**

```typescript
// src/screens/Register/__tests__/Register.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Register } from '../index';

jest.mock('../../../auth/store', () => ({
  useAuthStore: jest.fn(),
}));

import { useAuthStore } from '../../../auth/store';

const mockNavigation: any = { navigate: jest.fn() };

function makeStore(overrides = {}) {
  return {
    register: jest.fn().mockResolvedValue(undefined),
    loginGoogle: jest.fn().mockResolvedValue(undefined),
    error: null,
    clearError: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthStore as unknown as jest.Mock).mockReturnValue(makeStore());
});

describe('Register screen', () => {
  it('renders name, email and password fields', () => {
    const { getByPlaceholderText } = render(
      <Register navigation={mockNavigation} route={{} as any} />,
    );
    expect(getByPlaceholderText('auth.register.namePlaceholder')).toBeTruthy();
    expect(getByPlaceholderText('auth.emailPlaceholder')).toBeTruthy();
    expect(getByPlaceholderText('auth.passwordPlaceholder')).toBeTruthy();
  });

  it('submit button is disabled when fields are empty', () => {
    const { getByText } = render(<Register navigation={mockNavigation} route={{} as any} />);
    const btn = getByText('auth.register.createAccount');
    expect(btn.props.accessibilityState?.disabled ?? btn.parent?.props?.disabled).toBeTruthy();
  });

  it('submit button is disabled when password is shorter than 6 characters', () => {
    const { getByPlaceholderText, getByText } = render(
      <Register navigation={mockNavigation} route={{} as any} />,
    );
    fireEvent.changeText(getByPlaceholderText('auth.register.namePlaceholder'), 'Alice');
    fireEvent.changeText(getByPlaceholderText('auth.emailPlaceholder'), 'a@b.com');
    fireEvent.changeText(getByPlaceholderText('auth.passwordPlaceholder'), '123');

    const btn = getByText('auth.register.createAccount');
    expect(btn.props.accessibilityState?.disabled ?? btn.parent?.props?.disabled).toBeTruthy();
  });

  it('calls register with correct args when form is valid', async () => {
    const register = jest.fn().mockResolvedValue(undefined);
    (useAuthStore as unknown as jest.Mock).mockReturnValue(makeStore({ register }));

    const { getByPlaceholderText, getByText } = render(
      <Register navigation={mockNavigation} route={{} as any} />,
    );

    fireEvent.changeText(getByPlaceholderText('auth.register.namePlaceholder'), 'Alice');
    fireEvent.changeText(getByPlaceholderText('auth.emailPlaceholder'), 'alice@example.com');
    fireEvent.changeText(getByPlaceholderText('auth.passwordPlaceholder'), 'password123');
    fireEvent.press(getByText('auth.register.createAccount'));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith('alice@example.com', 'password123', 'Alice');
    });
  });

  it('shows error banner when store has an error', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue(
      makeStore({ error: 'Email already registered' }),
    );
    const { getByText } = render(<Register navigation={mockNavigation} route={{} as any} />);
    expect(getByText('Email already registered')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run Register tests**

```bash
npm test -- --testPathPattern=screens/Register/__tests__ --watchAll=false
```

Expected: `5 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Register/__tests__/Register.test.tsx
git commit -m "test: component tests for Register screen"
```

---

## Task 13: Component test — ListsHome screen

**Files:**
- Create: `lista-ai-mobile/src/screens/ListsHome/__tests__/ListsHome.test.tsx`

- [ ] **Step 1: Write ListsHome tests**

```typescript
// src/screens/ListsHome/__tests__/ListsHome.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ListsHome } from '../index';

jest.mock('../../../hooks/useLists', () => ({
  useListsQuery: jest.fn(),
  useDeleteList: jest.fn(() => ({ mutate: jest.fn() })),
}));

// ListCard uses useItemsQuery internally
jest.mock('../../../hooks/useItems', () => ({
  useItemsQuery: jest.fn(() => ({ data: [] })),
}));

import { useListsQuery } from '../../../hooks/useLists';

// SyncStatusBar depends on store — mock it
jest.mock('../../../components/SyncStatusBar', () => ({
  SyncStatusBar: () => null,
}));

const mockNavigation: any = { navigate: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigation.navigate.mockClear();
});

describe('ListsHome screen', () => {
  it('shows EmptyState when there are no lists', () => {
    (useListsQuery as jest.Mock).mockReturnValue({ data: [], isLoading: false });

    const { getByText } = render(
      <ListsHome navigation={mockNavigation} route={{} as any} />,
    );
    // EmptyState renders the title key from t()
    expect(getByText('lists.empty.title')).toBeTruthy();
  });

  it('renders a card for each list', () => {
    (useListsQuery as jest.Mock).mockReturnValue({
      data: [
        { id: 1, remoteId: null, name: 'Groceries', updatedAt: 1, deletedAt: null },
        { id: 2, remoteId: null, name: 'Hardware', updatedAt: 1, deletedAt: null },
      ],
      isLoading: false,
    });

    const { getByText } = render(
      <ListsHome navigation={mockNavigation} route={{} as any} />,
    );
    expect(getByText('Groceries')).toBeTruthy();
    expect(getByText('Hardware')).toBeTruthy();
  });

  it('navigates to ListDetail when a list card is pressed', () => {
    (useListsQuery as jest.Mock).mockReturnValue({
      data: [{ id: 1, remoteId: null, name: 'Groceries', updatedAt: 1, deletedAt: null }],
      isLoading: false,
    });

    const { getByText } = render(
      <ListsHome navigation={mockNavigation} route={{} as any} />,
    );
    fireEvent.press(getByText('Groceries'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ListDetail', {
      listId: 1,
      listName: 'Groceries',
    });
  });

  it('navigates to AddEditList when FAB is pressed', () => {
    (useListsQuery as jest.Mock).mockReturnValue({ data: [], isLoading: false });

    const { getByText } = render(
      <ListsHome navigation={mockNavigation} route={{} as any} />,
    );
    fireEvent.press(getByText('lists.newList'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('AddEditList', undefined);
  });
});
```

- [ ] **Step 2: Run ListsHome tests**

```bash
npm test -- --testPathPattern=screens/ListsHome/__tests__ --watchAll=false
```

Expected: `4 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/screens/ListsHome/__tests__/ListsHome.test.tsx
git commit -m "test: component tests for ListsHome screen"
```

---

## Task 14: Component test — AddEditList screen

**Files:**
- Create: `lista-ai-mobile/src/screens/AddEditList/__tests__/AddEditList.test.tsx`

- [ ] **Step 1: Write AddEditList tests**

```typescript
// src/screens/AddEditList/__tests__/AddEditList.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddEditList } from '../index';

const mockMutateAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../hooks/useLists', () => ({
  useCreateList: jest.fn(() => ({ mutateAsync: mockMutateAsync })),
  useUpdateList: jest.fn(() => ({ mutateAsync: mockMutateAsync })),
  useListsQuery: jest.fn(() => ({ data: [] })),
}));

const mockNavigation: any = { goBack: jest.fn(), navigate: jest.fn() };
const mockRoute: any = { params: undefined };

beforeEach(() => {
  jest.clearAllMocks();
  mockMutateAsync.mockResolvedValue(undefined);
});

describe('AddEditList screen', () => {
  it('renders the name input field', () => {
    const { getByPlaceholderText } = render(
      <AddEditList navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByPlaceholderText('lists.addEditList.namePlaceholder')).toBeTruthy();
  });

  it('save button is disabled when name is empty', () => {
    const { getByText } = render(
      <AddEditList navigation={mockNavigation} route={mockRoute} />,
    );
    const btn = getByText('common.save');
    expect(btn.parent?.props?.disabled).toBeTruthy();
  });

  it('save button is enabled after entering a name', () => {
    const { getByPlaceholderText, getByText } = render(
      <AddEditList navigation={mockNavigation} route={mockRoute} />,
    );
    fireEvent.changeText(getByPlaceholderText('lists.addEditList.namePlaceholder'), 'Shopping');
    const btn = getByText('common.save');
    expect(btn.parent?.props?.disabled).toBeFalsy();
  });

  it('calls useCreateList mutateAsync with trimmed name on save', async () => {
    const { getByPlaceholderText, getByText } = render(
      <AddEditList navigation={mockNavigation} route={mockRoute} />,
    );
    fireEvent.changeText(
      getByPlaceholderText('lists.addEditList.namePlaceholder'),
      '  My List  ',
    );
    fireEvent.press(getByText('common.save'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({ name: 'My List' });
    });
  });

  it('calls goBack after successful save', async () => {
    const { getByPlaceholderText, getByText } = render(
      <AddEditList navigation={mockNavigation} route={mockRoute} />,
    );
    fireEvent.changeText(getByPlaceholderText('lists.addEditList.namePlaceholder'), 'List');
    fireEvent.press(getByText('common.save'));

    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run AddEditList tests**

```bash
npm test -- --testPathPattern=screens/AddEditList/__tests__ --watchAll=false
```

Expected: `5 passed`.

- [ ] **Step 3: Run the full test suite to confirm everything passes together**

```bash
npm test -- --watchAll=false
```

Expected: all test suites green.

- [ ] **Step 4: Commit**

```bash
git add src/screens/AddEditList/__tests__/AddEditList.test.tsx
git commit -m "test: component tests for AddEditList screen"
```

---

## Task 15: GitHub Actions CI

**Files:**
- Create: `lista-ai-front/.github/workflows/ci.yml`

- [ ] **Step 1: Create the CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  typecheck:
    name: TypeScript
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: lista-ai-mobile
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: lista-ai-mobile/package-lock.json
      - run: npm ci
      - run: npm run typecheck

  lint:
    name: ESLint
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: lista-ai-mobile
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: lista-ai-mobile/package-lock.json
      - run: npm ci
      - run: npm run lint

  test:
    name: Jest
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: lista-ai-mobile
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: lista-ai-mobile/package-lock.json
      - run: npm ci
      - run: npm test -- --watchAll=false --coverage

# NOTE: Maestro E2E flows (e2e/auth.yaml, e2e/shopping.yaml) are intentionally
# excluded from CI. Running a simulator on GitHub Actions is expensive and flaky.
# Run them locally with: maestro test e2e/
```

- [ ] **Step 2: Commit**

```bash
# from lista-ai-front root
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions pipeline for typecheck, lint, and jest"
```

---

## Task 16: Maestro E2E flows

**Files:**
- Create: `lista-ai-front/e2e/auth.yaml`
- Create: `lista-ai-front/e2e/shopping.yaml`

> **Prerequisites:** Install Maestro CLI: `curl -Ls "https://get.maestro.mobile.dev" | bash`
> Run the app on a simulator first: `cd lista-ai-mobile && npx expo start --ios`

- [ ] **Step 1: Create e2e/ directory and auth flow**

```bash
mkdir -p lista-ai-front/e2e
```

```yaml
# e2e/auth.yaml
appId: com.listaai.mobile   # Update to match your actual app bundle ID from app.json
---
- launchApp:
    clearState: true

# Navigate to Register from Login
- assertVisible: "auth.login.signUp"
- tapOn: "auth.login.signUp"

# Fill registration form
- assertVisible: "auth.register.namePlaceholder"
- tapOn: "auth.register.namePlaceholder"
- inputText: "E2E User"
- tapOn: "auth.emailPlaceholder"
- inputText: "e2e@example.com"
- tapOn: "auth.passwordPlaceholder"
- inputText: "Password123"
- tapOn: "auth.register.createAccount"

# Assert home screen is visible after registration
- assertVisible: "lists.title"

# Logout
- tapOn: "common.profile"       # adjust to your actual profile tab label
- tapOn: "auth.logout"          # adjust to your actual logout button label

# Assert login screen is back
- assertVisible: "auth.login.signIn"

# Log in with the same credentials
- tapOn: "auth.emailPlaceholder"
- inputText: "e2e@example.com"
- tapOn: "auth.passwordPlaceholder"
- inputText: "Password123"
- tapOn: "auth.login.signIn"

# Assert home screen again
- assertVisible: "lists.title"
```

- [ ] **Step 2: Create shopping flow**

```yaml
# e2e/shopping.yaml
appId: com.listaai.mobile   # Update to match your actual app bundle ID from app.json
---
- launchApp:
    clearState: true

# Register a fresh account
- tapOn: "auth.login.signUp"
- tapOn: "auth.register.namePlaceholder"
- inputText: "Shop User"
- tapOn: "auth.emailPlaceholder"
- inputText: "shop@example.com"
- tapOn: "auth.passwordPlaceholder"
- inputText: "Password123"
- tapOn: "auth.register.createAccount"

# Create a list
- assertVisible: "lists.title"
- tapOn: "lists.newList"
- assertVisible: "lists.addEditList.namePlaceholder"
- tapOn: "lists.addEditList.namePlaceholder"
- inputText: "My Shopping"
- tapOn: "common.save"

# Assert list appears in home
- assertVisible: "My Shopping"

# Open list and add item
- tapOn: "My Shopping"
- tapOn: "items.addItem"    # adjust to your actual add item FAB label
- tapOn: "items.descriptionPlaceholder"
- inputText: "Milk"
- tapOn: "items.done"

# Assert item appears
- assertVisible: "Milk"

# Check the item
- tapOn:
    id: "Checkbox"    # adjust testID if you add one, or use text-based tap
- assertVisible: "Milk"   # item still visible but checked

# Delete the item
- longPressOn: "Milk"     # or tap the trash icon — adjust to actual UI
- assertNotVisible: "Milk"

# Go back and delete the list
- tapOn: "common.back"    # or navigation back button
- longPressOn: "My Shopping"
- tapOn: "lists.deleteDialog.confirm"
- assertNotVisible: "My Shopping"
```

> **Note:** The `appId` and text selectors (like `"common.profile"`, `"items.addItem"`) must be updated to match your actual app bundle ID from `app.json` and the exact text/testIDs rendered in the app. Run `maestro studio` to interactively discover selectors on a live simulator.

- [ ] **Step 3: Commit**

```bash
git add e2e/
git commit -m "test: add Maestro E2E flows for auth and shopping"
```

---

## Self-Review Notes

- **Spec §1.3 (form validation):** Confirmed already implemented in `AddEditList` (`disabled={!name.trim()}`) and `AddEditItem` (`disabled={!description.trim()}`). No changes needed.
- **jest config key:** `setupFilesAfterFramework` — verify this key is accepted by your jest-expo version. If jest reports an unknown config key, check with `npx jest --showConfig | grep setup` and adjust.
- **Maestro selectors:** The YAML flows use i18n keys as text matchers. If the app uses a real locale (not the test mock), selectors must match actual translated strings. Run `maestro studio` to verify.
- **`tokenResponse` in store tests:** The fake JWT payload uses `btoa()` which is available in Node 16+; jest-expo runs in jsdom or Node, so this is fine.
