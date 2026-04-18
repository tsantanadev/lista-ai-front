# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start Expo dev server (requires Node 20+)
npx expo start

# Open on Android emulator (from Expo dev server: press 'a')
npx expo start --android

# Open on iOS simulator (from Expo dev server: press 'i')
npx expo start --ios

# TypeScript check
npm run typecheck

# Lint
npm run lint

# Generate Drizzle migrations after schema changes
npm run db:generate

# Browse SQLite data visually
npm run db:studio
```

## Architecture

This is an **offline-first React Native app** built with Expo. All reads and writes go through a local SQLite database. A background sync service communicates with the REST API when connectivity is available.

**Data flow (write):**
```
User action → TanStack Query mutation → Write to SQLite → Enqueue sync op → executeSync() if online
```

**Data flow (read):**
```
TanStack Query (staleTime: Infinity) → SELECT from SQLite
```

### Package structure

```
src/
├── api/          # Axios HTTP client — only called by the sync executor
├── db/           # Drizzle ORM: schema, migrations, db instance
├── sync/         # Offline sync: queue CRUD, conflict resolution, executor
├── store/        # Zustand: isOnline, pendingCount, lastSyncError, selectedListId
├── hooks/        # TanStack Query hooks — all reads/writes go through here
├── navigation/   # React Navigation: bottom tabs + native stack
├── components/   # Shared UI components
├── screens/      # Full screens (one folder per screen)
├── types/        # TypeScript interfaces (List, Item, SyncQueueEntry)
└── utils/        # date.ts (now()), id.ts (generateLocalId())
```

### Key conventions

- **Local IDs are negative integers** — `generateLocalId()` returns `-Date.now()`. Server-assigned IDs are always positive, so there's no collision until `remoteId` is populated after sync.
- **Soft deletes** — set `deletedAt: now()` before enqueuing a delete operation. The executor hard-deletes the local row after the server confirms deletion.
- **All queries filter `isNull(deletedAt)`** — soft-deleted records are invisible to the UI.
- **Hooks are the only write path** — components never touch `db` or `enqueue` directly; they use hooks from `src/hooks/`.
- **Sync queue entries use JSON payloads** — always include both `localId` and `remoteId` (may be null) so the executor can route correctly.
- **`retryCount === -1` means permanently failed** — skip these entries in the executor; they require manual intervention.

## Tech Stack

- **React Native 0.81** + **Expo SDK 54**
- **TypeScript ~5.9** strict mode
- **expo-sqlite ~16** + **Drizzle ORM ^0.45** for local database
- **TanStack Query ^5** — `staleTime: Infinity` (SQLite is always fresh)
- **Zustand ^5** for global UI/sync state
- **NativeWind ^4** + **Tailwind CSS ^3** for styling
- **React Navigation ^7** — bottom tabs + native stack
- **Axios ^1.14** for REST API calls
- **@react-native-community/netinfo** for connectivity detection

## Database

Three SQLite tables managed by Drizzle:

- **`lists`** — `id`, `remote_id`, `name`, `updated_at`, `deleted_at`
- **`items`** — `id`, `remote_id`, `list_id` (FK → lists), `description`, `checked`, `quantity`, `price`, `updated_at`, `deleted_at`
- **`sync_queue`** — `id`, `entity`, `operation`, `payload` (JSON), `created_at`, `retry_count`, `last_error`

After changing `src/db/schema.ts`, run `npm run db:generate` to produce a new SQL migration, then update `src/db/migrations/index.ts` to include it.

## Environment

Copy `.env.example` to `.env` before running:

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

On a **physical device**, replace `localhost` with the machine's local IP (e.g. `192.168.x.x`).

## Backend

The app expects the [Lista AI REST API](../../lista-ai/) running at the configured base URL.

```bash
# From lista-ai/
docker-compose up -d
./gradlew bootRun
```

Endpoints used: `GET/POST/DELETE /v1/lists`, `GET/POST/PUT/DELETE /v1/lists/{id}/items`.

## Design Tokens

Tokens are defined in `src/theme/colors.ts`. The app ships two palettes (`darkColors`, `lightColors`) consumed via `useTheme()`.

| Token | Dark | Light |
| ----- | ---- | ----- |
| background | `#111210` | `#F4F7F5` |
| surface | `#1A1C1A` | `#FFFFFF` |
| surfaceElevated | `#161A18` | `#F0F5F2` |
| border | `#0F2E28` | `#D0E8E0` |
| borderSubtle | `#1A2420` | `#D8EBE3` |
| progressTrack | `#222420` | `#E5EDE9` |
| primary | `#1D9E75` | `#1D9E75` |
| accent | `#EF9F27` | `#EF9F27` |
| neutral | `#888780` | `#888780` |
| textPrimary | `#EEF2F0` | `#1A1C1A` |
| destructive | `#EF4444` | `#EF4444` |
