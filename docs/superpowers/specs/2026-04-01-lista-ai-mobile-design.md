# Lista AI Mobile — Design Specification

**Date:** 2026-04-01  
**Status:** Approved  
**Version:** 1.0

---

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [Architecture & Data Flow](#2-architecture--data-flow)
3. [Offline Strategy](#3-offline-strategy)
4. [Data Models](#4-data-models)
5. [API Integration](#5-api-integration)
6. [Component Structure](#6-component-structure)
7. [Navigation Structure](#7-navigation-structure)
8. [Design Tokens & Theme](#8-design-tokens--theme)
9. [Limitations & Future Work](#9-limitations--future-work)

---

## 1. Overview & Goals

### 1.1 Purpose

Lista AI Mobile is a React Native shopping list manager built on top of an existing Spring Boot REST API. The app is designed for a single user with no authentication requirement. The primary engineering goal is **offline-first reliability**: the app must be fully functional without a network connection, with seamless background synchronization when connectivity is available.

### 1.2 Goals

- Allow the user to create, read, update, and delete shopping lists and their items at any time, regardless of network availability.
- Provide immediate, optimistic UI updates — no loading spinners on user-initiated writes.
- Synchronize all local changes to the backend in the background, with transparent status feedback.
- Present a clean, focused dark-theme interface optimized for quick shopping-list interaction.

### 1.3 Non-Goals

- Multi-user support or authentication.
- List sharing or collaboration.
- Push notifications.
- Cloud backup beyond the single backend instance.
- Barcode scanning or product search.

---

## 2. Architecture & Data Flow

### 2.1 High-Level Architecture

```
┌────────────────────────────────────────────────┐
│                 React Native UI                 │
│  (Screens, Components, Bottom Tabs, Modals)     │
└──────────────┬────────────────────┬────────────┘
               │ TanStack Query     │ Zustand
               │ (reads SQLite)     │ (UI state)
               ▼                    ▼
┌─────────────────────────────────────────────────┐
│             SQLite (via expo-sqlite)             │
│          Drizzle ORM schema & queries            │
│  Tables: lists, items, sync_queue               │
└──────────────┬──────────────────────────────────┘
               │ Background Sync Service
               │ (reads sync_queue, calls API)
               ▼
┌─────────────────────────────────────────────────┐
│        Spring Boot REST API (Axios)              │
│        Base URL: http://localhost:8080           │
└─────────────────────────────────────────────────┘
```

### 2.2 Layer Responsibilities

| Layer | Technology | Responsibility |
|---|---|---|
| UI / Screens | React Native + NativeWind | Render, user interaction |
| Query layer | TanStack Query | Cache, re-render on invalidation |
| Local DB | expo-sqlite + Drizzle | Primary data store |
| UI state | Zustand | Online flag, pending count, selected list |
| Sync service | Custom service module | Dequeue sync entries, call REST API |
| HTTP client | Axios | HTTP requests to backend |
| Connectivity | NetInfo | Detect online/offline transitions |

### 2.3 Write Data Flow

```
User action (create/update/delete)
  │
  ▼
Write to SQLite (lists or items table)
  │
  ├── Enqueue operation in sync_queue table
  │
  ▼
TanStack Query cache invalidated
  │
  ▼
UI re-renders from SQLite (instant, optimistic)
  │
  ▼ (background, when online)
SyncService dequeues entry → calls REST API
  │
  ├─ Success → update remoteId if newly created, remove from sync_queue
  └─ Failure → increment retryCount; remove if retryCount ≥ 5, mark lastError
```

### 2.4 Read Data Flow

```
Screen mounts → TanStack Query hook called
  │
  ▼
useQuery({ queryFn: () => db.select(...).from(lists) })
  │
  staleTime: Infinity — no background refetch
  │
  ▼
Data rendered directly from SQLite
```

Network data only enters SQLite through the sync service response handlers (e.g., updating `remoteId` after a successful create, or a full pull on first launch / pull-to-refresh).

---

## 3. Offline Strategy

### 3.1 SQLite-First Principle

SQLite is the single source of truth for the UI. TanStack Query reads exclusively from SQLite. The backend is treated as a remote replica that is eventually consistent with the local state. This ensures:

- Zero latency reads.
- Full functionality with no network.
- Predictable UI behavior (no loading states on reads after initial hydration).

### 3.2 Local ID Strategy

New records created offline are assigned **negative integer IDs** as their local primary key (`id`). This avoids any collision with server-assigned positive integer IDs. The `remoteId` field is `null` until the create operation is acknowledged by the backend. Once acknowledged, `remoteId` is populated and the record is considered fully synced.

```
Newly created list (offline):
  id = -1, remoteId = null, name = "Market"

After sync:
  id = -1, remoteId = 42, name = "Market"
```

Subsequent operations (update/delete) on a record with `remoteId = null` must wait for the create to be confirmed before they can be dispatched. The sync service processes the queue in insertion order to enforce this sequencing.

### 3.3 Soft Deletes

Records are not physically deleted from SQLite immediately. Instead, `deletedAt` is set to the current Unix timestamp in milliseconds. The sync service reads `deletedAt IS NOT NULL` entries from the queue and dispatches the corresponding `DELETE` API call. Once confirmed, the record is physically removed from SQLite.

All queries filter `WHERE deletedAt IS NULL` to exclude soft-deleted records from the UI.

### 3.4 Sync Queue

The `sync_queue` table is an ordered log of pending write operations. Each entry contains:

- `entity`: `'list'` or `'item'`
- `operation`: `'create'`, `'update'`, or `'delete'`
- `payload`: JSON string with the data required for the API call
- `retryCount`: incremented on failure, entry removed when it reaches 5
- `lastError`: string description of the last error for display in Settings

The sync service processes entries sequentially (by `createdAt` ASC) to guarantee ordering. It runs:

1. Immediately on app foreground if online.
2. When NetInfo reports the device comes back online.
3. On a periodic background interval (every 30 seconds) while online.

### 3.5 Conflict Resolution

Conflict resolution uses a **last-write-wins** strategy based on `updatedAt` (Unix milliseconds):

- If the server response includes an `updatedAt` field, compare it to the local `updatedAt`. The higher value wins.
- If the server does not return `updatedAt` (current API does not), **local wins** and the local state is preserved.
- In practice, since this is a single-user, single-device app, conflicts are rare. This strategy is a safety net, not a primary concern.

### 3.6 Initial Hydration & Pull-to-Refresh

On first launch (empty SQLite), the app performs a full pull from the backend:

1. `GET /v1/lists` → insert all lists into SQLite with `remoteId` populated.
2. For each list, `GET /v1/lists/{listId}/items` → insert items.

Pull-to-refresh on the Lists screen triggers the same full pull, merging server data with local data (server records win on remoteId match; local-only records with `remoteId = null` are preserved).

---

## 4. Data Models

### 4.1 Drizzle Schema

#### `lists` table

```typescript
export const lists = sqliteTable('lists', {
  id: integer('id').primaryKey(),            // local PK, negative for unsynced
  remoteId: integer('remote_id'),            // server PK, null until synced
  name: text('name').notNull(),
  updatedAt: integer('updated_at').notNull(), // Unix ms
  deletedAt: integer('deleted_at'),          // Unix ms, null if active
});
```

#### `items` table

```typescript
export const items = sqliteTable('items', {
  id: integer('id').primaryKey(),            // local PK, negative for unsynced
  remoteId: integer('remote_id'),            // server PK, null until synced
  listId: integer('list_id')
    .notNull()
    .references(() => lists.id),             // local FK
  description: text('description').notNull(),
  checked: integer('checked', { mode: 'boolean' }).notNull().default(false),
  quantity: text('quantity'),                // optional, local-only
  price: real('price'),                     // optional, local-only
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});
```

#### `sync_queue` table

```typescript
export const syncQueue = sqliteTable('sync_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entity: text('entity').notNull(),          // 'list' | 'item'
  operation: text('operation').notNull(),    // 'create' | 'update' | 'delete'
  payload: text('payload').notNull(),        // JSON string
  createdAt: integer('created_at').notNull(),
  retryCount: integer('retry_count').notNull().default(0),
  lastError: text('last_error'),
});
```

### 4.2 TypeScript Types

```typescript
export type List = {
  id: number;
  remoteId: number | null;
  name: string;
  updatedAt: number;
  deletedAt: number | null;
};

export type Item = {
  id: number;
  remoteId: number | null;
  listId: number;
  description: string;
  checked: boolean;
  quantity: string | null;
  price: number | null;
  updatedAt: number;
  deletedAt: number | null;
};

export type SyncQueueEntry = {
  id: number;
  entity: 'list' | 'item';
  operation: 'create' | 'update' | 'delete';
  payload: string;
  createdAt: number;
  retryCount: number;
  lastError: string | null;
};
```

### 4.3 Local ID Generation

```typescript
// Returns a negative integer guaranteed not to collide with any existing local id.
async function nextLocalId(table: 'lists' | 'items'): Promise<number> {
  const row = await db
    .select({ min: sql<number>`min(id)` })
    .from(table === 'lists' ? lists : items)
    .get();
  return (row?.min ?? 0) - 1;
}
```

---

## 5. API Integration

### 5.1 Endpoints

Base URL: `http://localhost:8080`

| Method | Path | Request Body | Success Response |
|---|---|---|---|
| GET | `/v1/lists` | — | `200 [{id, name}]` |
| POST | `/v1/lists` | `{name}` | `200 {id, name}` |
| DELETE | `/v1/lists/{id}` | — | `204` |
| GET | `/v1/lists/{listId}/items` | — | `200 [{id, description, checked}]` |
| POST | `/v1/lists/{listId}/items` | `{description}` | `201` |
| PUT | `/v1/lists/{listId}/items/{itemId}` | `{description, checked}` | `200 {id, description, checked}` |
| DELETE | `/v1/lists/{listId}/items/{id}` | — | `204` |

### 5.2 Axios Client

```typescript
// src/services/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});
```

### 5.3 Sync Service

The sync service is the only component that calls the API client directly. It is not exposed to UI components.

```typescript
// src/services/sync/syncService.ts
async function processQueue(): Promise<void> {
  const entries = await db
    .select()
    .from(syncQueue)
    .where(lt(syncQueue.retryCount, MAX_RETRIES))
    .orderBy(asc(syncQueue.createdAt));

  for (const entry of entries) {
    await processEntry(entry);
  }
}
```

Key responsibilities of `processEntry`:

1. Parse `payload` JSON.
2. Resolve the correct API call based on `entity` + `operation`.
3. On success: remove entry from `sync_queue`; if `operation === 'create'`, update `remoteId` in the local table.
4. On failure: increment `retryCount` and set `lastError`; if `retryCount >= MAX_RETRIES (5)`, remove from queue and log permanently.

### 5.4 Payload Schemas per Operation

**List create:**
```json
{ "localId": -1, "name": "Market" }
```

**List delete:**
```json
{ "remoteId": 42 }
```

**Item create:**
```json
{ "localId": -3, "listRemoteId": 42, "description": "Milk" }
```

**Item update:**
```json
{ "remoteId": 7, "listRemoteId": 42, "description": "Milk 2%", "checked": true }
```

**Item delete:**
```json
{ "remoteId": 7, "listRemoteId": 42 }
```

---

## 6. Component Structure

### 6.1 Directory Layout

```
src/
├── app/                        # Expo Router or React Navigation entry points
├── components/
│   ├── common/
│   │   ├── SyncStatusBar.tsx   # Amber/red banner for sync state
│   │   ├── FAB.tsx             # Floating action button
│   │   └── EmptyState.tsx      # Empty list placeholder
│   ├── lists/
│   │   ├── ListCard.tsx        # Card with name, progress bar, count
│   │   ├── ListsScreen.tsx     # FlatList of ListCards + FAB
│   │   └── CreateListModal.tsx # Bottom sheet: name input
│   └── items/
│       ├── ItemRow.tsx         # Checkbox, description, qty, price + swipe delete
│       ├── ItemListScreen.tsx  # Unchecked + collapsible checked sections
│       └── ItemModal.tsx       # Bottom sheet: description, qty, price
├── hooks/
│   ├── useLists.ts             # useQuery over SQLite lists
│   ├── useItems.ts             # useQuery over SQLite items for a list
│   ├── useListMutations.ts     # create/delete list mutations
│   └── useItemMutations.ts     # create/update/delete item mutations
├── services/
│   ├── api/
│   │   └── client.ts           # Axios instance
│   └── sync/
│       ├── syncService.ts      # Queue processor
│       └── syncScheduler.ts    # NetInfo listener + interval
├── store/
│   └── uiStore.ts              # Zustand: isOnline, pendingCount, selectedListId
├── db/
│   ├── schema.ts               # Drizzle table definitions
│   ├── migrations/             # Drizzle migration files
│   └── index.ts                # expo-sqlite + Drizzle client singleton
└── types/
    └── index.ts                # List, Item, SyncQueueEntry types
```

### 6.2 Component Details

#### `ListCard`

```
┌────────────────────────────────────────────┐
│ Market                              5 items │
│ ████████████░░░░░░░░░░░░░░░░░░░░░░  3/5    │
└────────────────────────────────────────────┘
```

- Displays list name and item progress.
- Progress bar: green (`#22C55E`) fill proportional to `checked / total`.
- Long-press triggers a confirmation alert → delete list mutation.
- Tap navigates to `ItemListScreen`.

#### `ItemRow`

```
☐  Milk 2%                    x2    R$ 5,49
```

- Checkbox toggles `checked` state immediately (optimistic).
- Checked items render with strikethrough text and muted color.
- Swipe left reveals a red Delete action.
- `quantity` and `price` fields are displayed inline; rendered only if non-null.

#### `SyncStatusBar`

- Rendered at the top of every screen (below the navigation header).
- Hidden when `pendingCount === 0` and no error.
- **Amber** when `pendingCount > 0`: "Syncing N changes..."
- **Red** when the last sync entry has `retryCount >= MAX_RETRIES`: "Sync error — tap to retry."
- Tapping navigates to the Settings screen.

#### `CreateListModal` / `ItemModal`

- Bottom sheet modal (uses `@gorhom/bottom-sheet` or equivalent).
- Dismisses on backdrop tap or swipe down.
- Validates required fields before enabling the submit button.
- `ItemModal` fields: description (required text), quantity (optional text), price (optional numeric).

### 6.3 Hooks

#### `useLists`

```typescript
export function useLists() {
  return useQuery({
    queryKey: ['lists'],
    queryFn: () =>
      db.select().from(lists).where(isNull(lists.deletedAt)).all(),
    staleTime: Infinity,
  });
}
```

#### `useListMutations`

```typescript
export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const id = await nextLocalId('lists');
      await db.insert(lists).values({ id, name, updatedAt: Date.now() });
      await db.insert(syncQueue).values({
        entity: 'list', operation: 'create',
        payload: JSON.stringify({ localId: id, name }),
        createdAt: Date.now(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lists'] }),
  });
}
```

---

## 7. Navigation Structure

### 7.1 Navigator Hierarchy

```
RootNavigator (NavigationContainer)
└── BottomTabNavigator
    ├── Tab: Lists
    │   └── StackNavigator
    │       ├── Screen: ListsScreen         (route: "Lists")
    │       └── Screen: ItemListScreen      (route: "ItemList", params: { listId })
    └── Tab: Settings
        └── Screen: SettingsScreen          (route: "Settings")
```

### 7.2 Tab Bar

| Tab | Icon | Label |
|---|---|---|
| Lists | list-bullet | Lists |
| Settings | gear | Settings |

Tab bar style: background `#18181B`, active tint `#3B82F6`, inactive tint `#71717A`.

### 7.3 Screen Parameters

- `ItemListScreen` receives `{ listId: number }` (local ID) as a route param.
- `selectedListId` is also mirrored in Zustand for components that need it without prop drilling.

### 7.4 Modals

Modals are rendered as bottom sheets within the respective screen, not as separate navigation routes. This keeps the navigation tree shallow and avoids modal-navigation edge cases on Android.

---

## 8. Design Tokens & Theme

### 8.1 Color Palette

| Token | Hex | Usage |
|---|---|---|
| `background` | `#09090B` | Screen background |
| `card` | `#18181B` | Card, modal, tab bar background |
| `border` | `#27272A` | Dividers, input borders |
| `muted` | `#71717A` | Secondary text, inactive icons |
| `primary` | `#3B82F6` | Active tab, CTAs, progress bar accent |
| `success` | `#22C55E` | Checked item checkbox, progress bar fill |
| `destructive` | `#EF4444` | Delete action, error banner |
| `warning` | `#F59E0B` | Sync pending banner |
| `text` | `#FAFAFA` | Primary text |
| `textMuted` | `#A1A1AA` | Secondary text |

### 8.2 Typography

| Role | Size | Weight |
|---|---|---|
| Screen title | 20px | 600 |
| Card title | 16px | 500 |
| Body | 14px | 400 |
| Caption | 12px | 400 |

### 8.3 Spacing Scale

Uses a 4px base unit. Common values: 4, 8, 12, 16, 20, 24, 32.

### 8.4 NativeWind Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#09090B',
        card: '#18181B',
        border: '#27272A',
        muted: '#71717A',
        primary: '#3B82F6',
        success: '#22C55E',
        destructive: '#EF4444',
        warning: '#F59E0B',
      },
    },
  },
  plugins: [],
};
```

### 8.5 Component Visual Specs

**ListCard:**
- Background: `card`
- Border radius: 12px
- Padding: 16px
- Progress bar height: 4px, border radius: full
- Progress bar track: `border`, fill: `success`

**ItemRow:**
- Checkbox: 20x20px, border `border`, filled with `success` when checked
- Checked item text: `line-through`, color `muted`
- Swipe delete background: `destructive`

**FAB:**
- Size: 56x56px, border radius: full
- Background: `primary`
- Icon: `+` (white, 24px)
- Position: bottom-right, margin 24px

---

## 9. Limitations & Future Work

### 9.1 Current Limitations

**Quantity and price are local-only.**  
The backend `items` API does not include `quantity` or `price` fields. These are stored in SQLite and displayed in the UI but are never sent to or received from the backend. If the user switches devices or reinstalls the app, this data is lost.

**No list rename on backend.**  
There is no `PUT /v1/lists/{id}` endpoint. List names cannot be updated through the API. If a rename feature is added to the UI, the change will be local-only until the backend exposes an update endpoint. The sync queue `update` operation for lists is stubbed but inactive.

**No authentication.**  
The backend is single-user with no auth. The app does not implement any login flow or token management. Adding multi-user support would require a significant rework of both the backend and the sync strategy.

**Sequential sync queue.**  
The sync queue is processed sequentially to preserve ordering guarantees (e.g., create before update). This means a single stuck entry (at max retries) does not block subsequent entries, but a network outage will delay all pending operations until connectivity is restored.

**No pagination.**  
All lists and all items for a list are fetched in a single query. For users with very large datasets, this may cause performance issues. Pagination or virtual windowing should be considered if list sizes grow significantly.

**Base URL is hardcoded.**  
The API base URL (`http://localhost:8080`) is hardcoded in the Axios client. This is acceptable for a single-user local setup but must be made configurable before any deployment scenario.

### 9.2 Future Work

| Feature | Description | Priority |
|---|---|---|
| List rename | Add `PUT /v1/lists/{id}` to backend, wire up sync | High |
| Quantity/price sync | Extend item API to include these fields | Medium |
| Pull-to-refresh | Full re-sync from backend on manual refresh | Medium |
| Conflict UI | Show a toast or badge when last-write-wins discards a change | Low |
| Authentication | JWT or session-based auth for multi-user support | Low |
| Pagination | Cursor-based pagination for large lists | Low |
| Configurable server URL | Settings screen input for backend base URL | Low |
| Item reordering | Drag-to-reorder items within a list | Low |
| List categories | Group lists by category or store | Low |
| Share list | Export list as text or share link | Low |
