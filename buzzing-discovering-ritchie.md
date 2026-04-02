# Plan: Lista AI — React Native Mobile App Scaffold

## Context

The backend (`lista-ai`) is a Spring Boot REST API with two resources: shopping lists and items. The mobile app needs to work fully offline, syncing to the backend when connectivity is available. The user approved Approach A: SQLite-first, TanStack Query reads SQLite, a background sync service communicates with the REST API.

Key constraints discovered during design:
- No auth on backend — app is single-user, no login screen
- Items will have `quantity` + `price` locally (local-only for now, future backend extension)
- Navigation: bottom tab bar with Lists tab + placeholder Settings tab
- Design system: dark theme from `design.pen` (bg `#09090B`, card `#18181B`, primary `#3B82F6`, green `#22C55E` for checked)
- Backend IDs are positive integers; local IDs use negative integers to avoid collision until `remoteId` is populated

---

## Backend API Reference

Base URL: `http://localhost:8080` (from `.env`)

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/v1/lists` | — | `[{id, name}]` |
| POST | `/v1/lists` | `{name}` | `{id, name}` |
| DELETE | `/v1/lists/{id}` | — | 204 |
| GET | `/v1/lists/{listId}/items` | — | `[{id, description, checked}]` |
| POST | `/v1/lists/{listId}/items` | `{description}` | 201 |
| PUT | `/v1/lists/{listId}/items/{itemId}` | `{description, checked}` | `{id, description, checked}` |
| DELETE | `/v1/lists/{listId}/items/{id}` | — | 204 |

---

## Target Project Location

All files go inside `/home/thiago/workspace/lista-ai-front/` (the existing frontend workspace).

---

## Implementation Steps

### Step 0: Write design doc
- Write `docs/superpowers/specs/2026-04-01-lista-ai-mobile-design.md` in `lista-ai-front`
- Commit it to git

### Step 1: Project bootstrap
- Run `npx create-expo-app@latest lista-ai-mobile --template blank-typescript` inside `lista-ai-front/`
- All subsequent work is inside `lista-ai-front/lista-ai-mobile/`

### Step 2: Install all dependencies

```bash
# Navigation
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# Database
npx expo install expo-sqlite
npm install drizzle-orm
npm install -D drizzle-kit

# Styling
npm install nativewind
npm install -D tailwindcss

# State & data fetching
npm install zustand
npm install @tanstack/react-query

# Network
npx expo install @react-native-community/netinfo

# API client
npm install axios

# Fonts
npx expo install @expo-google-fonts/inter expo-font

# Dev utilities
npm install -D typescript @types/react @types/react-native
```

### Step 3: Configuration files

**Files to create:**

#### `lista-ai-mobile/.env.example`
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

#### `lista-ai-mobile/tsconfig.json`
- Extend Expo default, add `"strict": true`, `"paths"` aliases for `@/` → `src/`

#### `lista-ai-mobile/tailwind.config.js`
- NativeWind config, content glob for `src/**/*.{ts,tsx}`
- Extend theme with design tokens: bg colors, card, primary, destructive, green, text colors, border radius tokens

#### `lista-ai-mobile/babel.config.js`
- Add `nativewind/babel` plugin

#### `lista-ai-mobile/metro.config.js`
- Enable NativeWind via `withNativeWind`

#### `lista-ai-mobile/drizzle.config.ts`
- Schema: `src/db/schema.ts`, output: `src/db/migrations/`, dialect: `expo-sqlite`

### Step 4: Types layer — `src/types/`

#### `src/types/list.ts`
```typescript
export interface List {
  id: number;           // local PK (negative until synced)
  remoteId: number | null;
  name: string;
  updatedAt: number;    // unix ms
  deletedAt: number | null;
}

export interface ListInput {
  name: string;
}
```

#### `src/types/item.ts`
```typescript
export interface Item {
  id: number;
  remoteId: number | null;
  listId: number;       // local list PK
  description: string;
  checked: boolean;
  quantity: string | null;
  price: number | null;
  updatedAt: number;
  deletedAt: number | null;
}

export interface ItemInput {
  description: string;
  checked?: boolean;
  quantity?: string;
  price?: number;
}
```

#### `src/types/sync.ts`
```typescript
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
```

### Step 5: Database layer — `src/db/`

#### `src/db/schema.ts`
Define three Drizzle tables using `sqliteTable`:

- `lists`: `id` (integer PK autoincrement), `remoteId` (integer), `name` (text notNull), `updatedAt` (integer notNull), `deletedAt` (integer)
- `items`: `id` (integer PK autoincrement), `remoteId` (integer), `listId` (integer notNull references lists.id), `description` (text notNull), `checked` (integer notNull default 0), `quantity` (text), `price` (real), `updatedAt` (integer notNull), `deletedAt` (integer)
- `syncQueue`: `id` (integer PK autoincrement), `entity` (text notNull), `operation` (text notNull), `payload` (text notNull), `createdAt` (integer notNull), `retryCount` (integer notNull default 0), `lastError` (text)

#### `src/db/index.ts`
```typescript
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const sqlite = SQLite.openDatabaseSync('lista_ai.db');
export const db = drizzle(sqlite, { schema });
```

#### `src/db/migrations/` — generated by `drizzle-kit generate`

#### `src/db/migrate.ts`
```typescript
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from './index';
import migrations from './migrations';

export async function runMigrations() {
  await migrate(db, migrations);
}
```

### Step 6: Utilities — `src/utils/`

#### `src/utils/date.ts`
```typescript
export const now = (): number => Date.now();
```

#### `src/utils/id.ts`
```typescript
// Negative local IDs avoid collision with server positive IDs
export const generateLocalId = (): number => -Date.now();
```

### Step 7: API client — `src/api/`

#### `src/api/client.ts`
- Create axios instance with `baseURL` from `process.env.EXPO_PUBLIC_API_BASE_URL`
- Timeout: 10000ms
- Default headers: `Content-Type: application/json`

#### `src/api/lists.ts`
```typescript
// fetchLists(): Promise<{id: number; name: string}[]>
// createList(name: string): Promise<{id: number; name: string}>
// deleteList(remoteId: number): Promise<void>
```

#### `src/api/items.ts`
```typescript
// fetchItems(remoteListId: number): Promise<{id: number; description: string; checked: boolean}[]>
// createItem(remoteListId: number, data: {description: string}): Promise<void>
// updateItem(remoteListId: number, remoteItemId: number, data: {description: string; checked: boolean}): Promise<{id: number; description: string; checked: boolean}>
// deleteItem(remoteListId: number, remoteItemId: number): Promise<void>
```

### Step 8: Sync layer — `src/sync/`

#### `src/sync/queue.ts`
```typescript
// enqueue(entry: Omit<SyncQueueEntry, 'id' | 'createdAt' | 'retryCount' | 'lastError'>): Promise<void>
// getPending(): Promise<SyncQueueEntry[]>
// remove(id: number): Promise<void>
// incrementRetry(id: number, error: string): Promise<void>
// markFailed(id: number, error: string): Promise<void>  // retryCount >= 5
```
All operations use Drizzle against the `syncQueue` table.

#### `src/sync/conflict.ts`
```typescript
// shouldOverwrite(localUpdatedAt: number, remoteUpdatedAt?: number): boolean
// Returns true if remote is newer than local (use remote). 
// If backend doesn't return updatedAt, always returns false (local wins).
```

#### `src/sync/executor.ts`
Core sync logic:
```typescript
// executeSync(): Promise<void>
// 1. getPending() from queue
// 2. For each entry in FIFO order:
//    a. Parse payload
//    b. Route to correct API function based on entity + operation
//    c. On success: remove from queue, update remoteId on local record
//    d. On failure: incrementRetry(); if retryCount >= 5, markFailed()
// 3. After flush, pull latest lists from server and upsert into SQLite
//    (background refresh — only overwrites non-dirty records)
```

Key routing logic:
- `list/create`: call `createList()`, write `remoteId` back to local lists row
- `list/delete`: call `deleteList(remoteId)` (skip if remoteId is null — never reached server)
- `item/create`: call `createItem(remoteListId, ...)`, write `remoteId` back
- `item/update`: call `updateItem(...)`, update local row with server response
- `item/delete`: call `deleteItem(...)`, hard-delete local row

### Step 9: Zustand store — `src/store/`

#### `src/store/syncSlice.ts`
```typescript
interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  lastSyncError: string | null;
  setOnline: (online: boolean) => void;
  setPendingCount: (count: number) => void;
  setLastSyncError: (error: string | null) => void;
}
```

#### `src/store/listsSlice.ts`
```typescript
interface ListsUIState {
  selectedListId: number | null;
  setSelectedListId: (id: number | null) => void;
}
```

#### `src/store/index.ts`
- Combine slices using `create` with `immer` middleware (optional) or plain Zustand
- Export `useStore` hook

### Step 10: Custom hooks — `src/hooks/`

#### `src/hooks/useConnectivity.ts`
```typescript
// Subscribes to NetInfo.addEventListener
// On transition offline→online:
//   1. setOnline(true) in Zustand
//   2. Call executeSync()
//   3. Invalidate all TanStack Query caches
// On transition online→offline:
//   1. setOnline(false) in Zustand
// Returns: { isOnline: boolean }
```

#### `src/hooks/useLists.ts`
TanStack Query hooks for lists:
```typescript
// useListsQuery(): QueryResult<List[]>
//   queryFn: db.select().from(lists).where(isNull(lists.deletedAt))
//   queryKey: ['lists']
//   staleTime: Infinity (SQLite is always fresh)

// useCreateList(): MutationResult
//   mutationFn: async (input: ListInput) => {
//     1. const localId = generateLocalId()
//     2. Insert into SQLite with localId, updatedAt: now()
//     3. enqueue({ entity: 'list', operation: 'create', payload: JSON.stringify({localId, name}) })
//     4. If online: executeSync() (fire and forget)
//   }
//   onSuccess: invalidateQueries(['lists'])
//   Optimistic update: manually update query cache before mutation

// useDeleteList(): MutationResult
//   mutationFn: async (list: List) => {
//     1. Soft-delete in SQLite (set deletedAt: now())
//     2. enqueue({ entity: 'list', operation: 'delete', payload: JSON.stringify({localId: list.id, remoteId: list.remoteId}) })
//     3. If online: executeSync()
//   }
//   onSuccess: invalidateQueries(['lists'])
```

#### `src/hooks/useItems.ts`
TanStack Query hooks for items — same pattern as useLists:
```typescript
// useItemsQuery(listId: number): QueryResult<Item[]>
//   queryFn: db.select().from(items).where(and(eq(items.listId, listId), isNull(items.deletedAt)))
//   queryKey: ['items', listId]

// useCreateItem(): MutationResult
// useUpdateItem(): MutationResult  (handles both description/checked/qty/price changes)
// useDeleteItem(): MutationResult
```

Note: `useUpdateItem` enqueues an `item/update` sync op. Only `description` and `checked` are sent to the server (quantity/price are local-only until backend is extended).

#### `src/hooks/useSync.ts`
```typescript
// Returns: { pendingCount: number; lastSyncError: string | null; isOnline: boolean }
// Reads from Zustand syncSlice
// Also periodically refreshes pendingCount from SQLite (every 5s)
```

### Step 11: Navigation — `src/navigation/`

#### `src/navigation/MainTabs.tsx`
Bottom tab navigator:
- **Lists tab**: icon `list`, label "Lists", stack = `ListsStack`
- **Settings tab**: icon `settings`, label "Settings", screen = `Settings` (no stack needed — single screen)
- Tab bar style: `#18181B` background, pill-shaped container, `#3B82F6` active tint

#### `src/navigation/ListsStack.tsx`
Native stack:
- `ListsHome` (no header)
- `ListDetail` (header with list name, back button)
- `AddEditList` (modal presentation)
- `AddEditItem` (modal presentation)

#### `src/navigation/RootStack.tsx`
- Wraps `MainTabs`
- `screenOptions`: dark theme, `headerShown: false`

### Step 12: Components — `src/components/`

#### `src/components/ErrorBoundary.tsx`
Class component error boundary. Fallback UI: centered message with retry button.

#### `src/components/EmptyState.tsx`
```typescript
interface EmptyStateProps {
  icon: string;   // lucide icon name
  title: string;
  subtitle?: string;
}
```
Centered layout, muted text colors.

#### `src/components/ListCard.tsx`
Props: `list: List`, `onPress`, `onDelete`

- Internally calls `useItemsQuery(list.id)` to compute progress (SQLite reads are synchronous and fast — no N+1 concern)
- Card background `#18181B`, border-radius 12px, padding 16px
- List name in primary text (20px bold)
- Progress bar: checked items / total items, blue fill
- Item count subtitle in secondary text (e.g. "3 of 7 items")
- Long-press → delete confirm

#### `src/components/ItemRow.tsx`
Props: `item: Item`, `onToggle`, `onEdit`, `onDelete`
- Horizontal layout: checkbox | description | (qty + price)
- Checkbox: 24px circle, stroke `#71717A`, filled `#22C55E` when checked
- Checked state: description gets strikethrough + muted color, row background tinted green
- Swipe-left gesture → delete
- Tap row (not checkbox) → edit

#### `src/components/SyncStatusBar.tsx`
Non-blocking banner shown when `lastSyncError !== null` or `pendingCount > 0`.
- Shows "Syncing…" (amber) or "Sync error — tap to retry" (red)
- Positioned below status bar, above content

### Step 13: Screens — `src/screens/`

#### `src/screens/ListsHome/index.tsx`
- Wrapped in `ErrorBoundary`
- Uses `useListsQuery()` — shows loading skeleton, empty state, or list of `ListCard`
- `SyncStatusBar` at top
- FAB bottom-right: "NEW LIST" pill button, navigates to `AddEditList` modal
- Delete: long-press on card → `Alert.alert` confirm → `useDeleteList()`

#### `src/screens/ListDetail/index.tsx`
- Wrapped in `ErrorBoundary`
- Receives `listId` from route params
- Uses `useItemsQuery(listId)`
- Sections: unchecked items, then "Checked items (N)" collapsible section with checked items
- Each row is `ItemRow`
- "ADD" pill button at bottom → `AddEditItem` modal
- Header: list name + ellipsis menu (rename → `AddEditList`, delete list)

#### `src/screens/AddEditList/index.tsx`
Modal bottom sheet:
- Single `TextInput` for name, pre-filled when editing
- "Save" button → `useCreateList()` or `useUpdateList()`
- Dismiss on save or cancel

Note: Backend has no `PUT /v1/lists/{id}` yet. Rename is local-only until backend is extended. Enqueue as `update` operation anyway for future compatibility.

#### `src/screens/AddEditItem/index.tsx`
Modal bottom sheet:
- `TextInput` for description (required)
- `TextInput` for quantity (optional, free text e.g. "2 kg")
- `TextInput` for price (optional, numeric)
- "Save" → `useCreateItem()` or `useUpdateItem()`

#### `src/screens/Settings/index.tsx`
Placeholder:
- "Settings" title
- "Coming soon" subtitle
- `SyncStatusBar` showing current sync state
- "Retry sync" button if errors present

### Step 14: App entry point

#### `App.tsx`
```typescript
// 1. Load Inter font via useFonts
// 2. Run Drizzle migrations on mount (runMigrations())
// 3. Wrap in QueryClientProvider (TanStack Query)
// 4. Mount useConnectivity() hook
// 5. Render NavigationContainer → RootStack
// 6. Show SplashScreen until fonts + migrations ready
```

### Step 15: Configuration & docs

#### `.env.example`
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

#### `.env` (not committed)
Same as `.env.example` for local dev.

#### `package.json` scripts
```json
{
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web",
  "db:generate": "drizzle-kit generate",
  "db:studio": "drizzle-kit studio",
  "typecheck": "tsc --noEmit",
  "lint": "eslint src --ext .ts,.tsx"
}
```

#### `docs/superpowers/specs/2026-04-01-lista-ai-mobile-design.md`
Write the full design document (this is the first thing to do in the implementation session).

---

## Critical Files to Create (ordered)

1. `docs/superpowers/specs/2026-04-01-lista-ai-mobile-design.md`
2. `lista-ai-mobile/` — Expo project scaffold
3. Config files: `tsconfig.json`, `tailwind.config.js`, `babel.config.js`, `metro.config.js`, `drizzle.config.ts`, `.env.example`
4. `src/types/list.ts`, `src/types/item.ts`, `src/types/sync.ts`
5. `src/db/schema.ts`, `src/db/index.ts`, `src/db/migrate.ts`
6. `src/utils/date.ts`, `src/utils/id.ts`
7. `src/api/client.ts`, `src/api/lists.ts`, `src/api/items.ts`
8. `src/sync/queue.ts`, `src/sync/conflict.ts`, `src/sync/executor.ts`
9. `src/store/syncSlice.ts`, `src/store/listsSlice.ts`, `src/store/index.ts`
10. `src/hooks/useConnectivity.ts`, `src/hooks/useLists.ts`, `src/hooks/useItems.ts`, `src/hooks/useSync.ts`
11. `src/navigation/RootStack.tsx`, `src/navigation/ListsStack.tsx`, `src/navigation/MainTabs.tsx`
12. `src/components/ErrorBoundary.tsx`, `src/components/EmptyState.tsx`, `src/components/ListCard.tsx`, `src/components/ItemRow.tsx`, `src/components/SyncStatusBar.tsx`
13. `src/screens/ListsHome/index.tsx`, `src/screens/ListDetail/index.tsx`, `src/screens/AddEditList/index.tsx`, `src/screens/AddEditItem/index.tsx`, `src/screens/Settings/index.tsx`
14. `App.tsx`

---

## Verification

### Run the project
```bash
cd lista-ai-front/lista-ai-mobile
cp .env.example .env
npm install
npm run db:generate   # generate Drizzle migrations
npx expo start        # scan QR with Expo Go app
```

### Start the backend
```bash
cd lista-ai
docker-compose up -d
./gradlew bootRun
```

### Manual test checklist
- [ ] App opens on ListsHome with empty state
- [ ] Create a list → appears immediately (optimistic), syncs to backend
- [ ] Open list → empty state for items
- [ ] Add item with description, quantity, price → appears immediately
- [ ] Check/uncheck item → row turns green immediately
- [ ] Edit item → changes persist
- [ ] Swipe-delete item → removed immediately
- [ ] Delete list (long press) → removed with confirm dialog
- [ ] Turn off wifi → create/edit/delete → `SyncStatusBar` shows pending
- [ ] Turn wifi back on → `SyncStatusBar` clears, data appears in backend
- [ ] Settings tab → placeholder screen visible
- [ ] TypeScript: `npm run typecheck` passes with zero errors
