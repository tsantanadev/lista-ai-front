# Lista AI — Mobile App

A React Native mobile app for managing shopping lists, built with an **offline-first** architecture. All data is stored locally in SQLite and synced to the [Lista AI backend](https://github.com/thiago91098/lista-ai) in the background when connectivity is available.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Sync Strategy](#sync-strategy)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [Backend API](#backend-api)
- [Authentication](#authentication)

---

## Features

- **Authentication** — email/password registration & login, Google OAuth2 sign-in
- **Secure sessions** — JWT access tokens (15 min) + rotating opaque refresh tokens stored in the OS keychain
- **Profile** — avatar with initials, name, email; editable profile info
- Create, rename, and delete shopping lists
- Add, edit, check/uncheck, and delete items per list
- Items support optional **quantity** and **price** fields (local-only)
- **Offline-first** — all actions work without internet, synced when back online
- Progress bar per list showing checked vs total items
- Collapsible "Checked items" section in list detail
- Sync status banner showing pending operations or errors
- Dark theme throughout

---

## Tech Stack

| Category | Library | Version |
|---|---|---|
| Framework | React Native + Expo | `expo ~54` / `react-native 0.81` |
| Language | TypeScript | `~5.9` |
| Navigation | React Navigation (bottom tabs + native stack) | `^7` |
| Local DB | expo-sqlite + Drizzle ORM | `~16` / `^0.45` |
| State | Zustand | `^5` |
| Data fetching | TanStack Query (React Query) | `^5` |
| Styling | NativeWind (Tailwind for RN) | `^4` |
| HTTP client | Axios | `^1.14` |
| Connectivity | @react-native-community/netinfo | `11.4` |
| Fonts | @expo-google-fonts/inter | `^0.4` |
| Secure storage | expo-secure-store | `~14` |
| OAuth / Google | expo-auth-session + expo-web-browser | `~6` / `~14` |

---

## Architecture

The app uses a **SQLite-first** approach: all reads and writes go through the local database. The REST API is only touched by a background sync service.

```
User action
    │
    ▼
TanStack Query mutation
    │
    ├─► Write to SQLite (immediate)
    │
    ├─► Enqueue sync operation (syncQueue table)
    │
    └─► If online: trigger executeSync() [fire & forget]
            │
            ▼
        Flush queue (FIFO) ──► REST API
            │
            └─► On success: remove from queue, write remoteId back
            └─► On failure: increment retry (max 5, then mark failed)
            └─► After flush: pull latest lists from server, upsert non-dirty records

UI read
    │
    ▼
TanStack Query (staleTime: Infinity) ──► SELECT from SQLite
```

### Key design decisions

- **Local IDs are negative integers** — avoids collision with server-assigned positive integer IDs until `remoteId` is populated after sync.
- **Soft deletes** — records get a `deletedAt` timestamp before being queued for deletion on the server. Hard-deleted locally after successful sync.
- **Conflict resolution** — last-write-wins based on `updatedAt` timestamps. If the server doesn't return `updatedAt`, local data wins.
- **Optimistic updates** — UI reflects changes immediately; sync happens in the background.

---

## Project Structure

```
lista-ai-mobile/
├── App.tsx                     # Entry point: fonts, migrations, providers
├── src/
│   ├── auth/                   # Authentication
│   │   ├── storage.ts          # expo-secure-store wrappers (tokens + user)
│   │   └── store.ts            # Zustand auth slice (hydrate, login, register, Google, logout)
│   ├── api/                    # Axios API client
│   │   ├── client.ts           # Axios instance + Bearer token & 401-refresh interceptors
│   │   ├── auth.ts             # Auth API calls (register, login, google, refresh, logout)
│   │   ├── lists.ts            # List API calls
│   │   └── items.ts            # Item API calls
│   ├── db/                     # SQLite + Drizzle
│   │   ├── schema.ts           # Table definitions
│   │   ├── index.ts            # DB instance
│   │   ├── migrate.ts          # Migration runner
│   │   └── migrations/         # Generated SQL migrations
│   ├── sync/                   # Offline sync layer
│   │   ├── queue.ts            # syncQueue CRUD
│   │   ├── conflict.ts         # Conflict resolution logic
│   │   └── executor.ts         # Core sync orchestration
│   ├── store/                  # Zustand global state
│   │   ├── syncSlice.ts        # isOnline, pendingCount, lastSyncError
│   │   ├── listsSlice.ts       # selectedListId
│   │   └── index.ts            # Combined store
│   ├── hooks/                  # TanStack Query hooks
│   │   ├── useLists.ts         # useListsQuery, useCreateList, useDeleteList, useUpdateList
│   │   ├── useItems.ts         # useItemsQuery, useCreateItem, useUpdateItem, useDeleteItem
│   │   ├── useConnectivity.ts  # NetInfo listener, triggers sync on reconnect
│   │   └── useSync.ts          # Exposes sync state, polls pendingCount every 5s
│   ├── navigation/             # React Navigation
│   │   ├── types.ts            # TypeScript screen param types
│   │   ├── RootStack.tsx       # Auth-aware root (AuthStack vs MainTabs)
│   │   ├── AuthStack.tsx       # Unauthenticated stack (Login → Register)
│   │   ├── MainTabs.tsx        # Bottom tab navigator
│   │   └── ListsStack.tsx      # Native stack for lists flow
│   ├── components/             # Shared UI components
│   │   ├── ErrorBoundary.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ListCard.tsx        # Card with progress bar
│   │   ├── ItemRow.tsx         # Row with checkbox, edit, delete
│   │   └── SyncStatusBar.tsx   # Amber/red sync banner
│   ├── screens/
│   │   ├── Login/              # Login screen (email/password + Google)
│   │   ├── Register/           # Registration screen
│   │   ├── Perfil/             # Profile screen (avatar, name, email, menu)
│   │   ├── PerfilInfo/         # Profile info editor (name, phone, address)
│   │   ├── ListsHome/          # All lists + FAB
│   │   ├── ListDetail/         # Items in a list
│   │   ├── AddEditList/        # Modal: create/rename list
│   │   ├── AddEditItem/        # Modal: create/edit item
│   │   └── Settings/           # Placeholder + sync status
│   ├── types/                  # TypeScript interfaces
│   │   ├── list.ts
│   │   ├── item.ts
│   │   └── sync.ts
│   └── utils/
│       ├── date.ts             # now() → unix ms
│       └── id.ts               # generateLocalId() → negative integer
```

---

## Database Schema

Three SQLite tables managed by Drizzle ORM:

**lists**
| Column | Type | Notes |
|---|---|---|
| id | integer PK | Local ID (negative until synced) |
| remote_id | integer | Server ID, null until synced |
| name | text NOT NULL | |
| updated_at | integer NOT NULL | Unix ms |
| deleted_at | integer | Soft delete timestamp |

**items**
| Column | Type | Notes |
|---|---|---|
| id | integer PK | Local ID (negative until synced) |
| remote_id | integer | |
| list_id | integer NOT NULL | FK → lists.id |
| description | text NOT NULL | |
| checked | integer (boolean) | Default 0 |
| quantity | text | Local-only |
| price | real | Local-only |
| updated_at | integer NOT NULL | |
| deleted_at | integer | |

**sync_queue**
| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| entity | text NOT NULL | `'list'` or `'item'` |
| operation | text NOT NULL | `'create'`, `'update'`, `'delete'` |
| payload | text NOT NULL | JSON string |
| created_at | integer NOT NULL | Used for FIFO ordering |
| retry_count | integer | -1 = permanently failed |
| last_error | text | Last error message |

---

## Sync Strategy

1. **Write path** — every mutation writes to SQLite first, then enqueues a sync operation.
2. **Flush** — `executeSync()` processes the queue in FIFO order, calling the appropriate REST endpoint for each entry.
3. **Retry** — failures increment `retry_count`. After 5 failures, the entry is marked permanently failed (`retry_count = -1`) and skipped.
4. **Background refresh** — after flushing the queue, the executor pulls the current list of lists from the server and upserts any records that don't have pending local changes.
5. **Reconnect trigger** — `useConnectivity` subscribes to NetInfo and calls `executeSync()` automatically when the device comes back online.

---

## Prerequisites

- **Node.js** 20+ (v18 works but triggers engine warnings)
- **npm** 9+
- **Expo Go** app on your mobile device, or an Android/iOS emulator
- The [Lista AI backend](../lista-ai/) running locally

---

## Getting Started

### 1. Start the backend

```bash
cd ../lista-ai

# Start PostgreSQL
docker-compose up -d

# Start the API (http://localhost:8080)
./gradlew bootRun
```

### 2. Set up the mobile app

```bash
cd lista-ai-mobile

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

If running on a **physical device**, edit `.env` and replace `localhost` with your machine's local IP:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:8080
```

### 3. Run the app

```bash
npx expo start
```

| Key | Action |
|---|---|
| `a` | Open on Android emulator |
| `i` | Open on iOS simulator (macOS only) |
| `w` | Open in browser (limited support) |
| Scan QR | Open in Expo Go on physical device |

---

## Available Scripts

```bash
npm start           # Start Expo dev server
npm run android     # Start and open on Android
npm run ios         # Start and open on iOS
npm run web         # Start and open in browser
npm run typecheck   # TypeScript check (tsc --noEmit)
npm run lint        # ESLint on src/
npm run db:generate # Generate Drizzle SQL migrations from schema
npm run db:studio   # Open Drizzle Studio (DB browser)
```

---

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:8080` | Base URL of the Lista AI REST API |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | — | Google OAuth2 web client ID (required for Google sign-in) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | — | Google OAuth2 iOS client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | — | Google OAuth2 Android client ID |

Create a `.env` file in `lista-ai-mobile/` (see `.env.example`).

> For **Expo Go** development, only `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is required. Google client IDs are obtained from the [Google Cloud Console](https://console.cloud.google.com). The same web client ID must be set as `GOOGLE_CLIENT_ID` on the backend.

---

## Backend API

The app communicates with the following endpoints:

| Method | Path | Description |
|---|---|---|
| GET | `/v1/lists` | Fetch all lists |
| POST | `/v1/lists` | Create a list |
| DELETE | `/v1/lists/{id}` | Delete a list |
| GET | `/v1/lists/{listId}/items` | Fetch items in a list |
| POST | `/v1/lists/{listId}/items` | Create an item |
| PUT | `/v1/lists/{listId}/items/{itemId}` | Update an item |
| DELETE | `/v1/lists/{listId}/items/{id}` | Delete an item |

> See the [backend README](../lista-ai/README.md) for full API documentation.

---

## Authentication

The app supports two sign-in methods wired to the Lista AI backend:

| Method | How it works |
| --- | --- |
| Email / password | Register via `/v1/auth/register`, login via `/v1/auth/login` |
| Google OAuth2 | PKCE flow via `expo-auth-session`; the Google `id_token` is sent to `/v1/auth/google` for server-side validation |

### Token management

- **Access token** (JWT, HS256, 15 min) — attached automatically via an Axios request interceptor as `Authorization: Bearer <token>`.
- **Refresh token** (opaque, 7 days) — stored in the OS keychain/keystore via `expo-secure-store`. On a 401 response the interceptor silently refreshes and retries; on refresh failure the user is signed out.
- Tokens are **never** sent to `/v1/auth/*` endpoints (interceptor guard).

### Screens

| Screen | Description |
| --- | --- |
| Login | Email/password fields + "Continuar com Google" button |
| Register | Name, email, password + Google sign-in |
| Profile (Perfil tab) | Avatar with initials, name, email, links to Profile Info and Settings |
| Profile Info | Editable name, read-only email, local phone/address; sign-out button |

### Setup

1. Create OAuth 2.0 credentials in the [Google Cloud Console](https://console.cloud.google.com).
2. Add the client IDs to `.env` (see [Environment Variables](#environment-variables)).
3. Set `GOOGLE_CLIENT_ID` to the web client ID on the backend.

For **Expo Go** development only `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is required.
