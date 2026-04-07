# UI Theme Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blue-grey palette with a neutral-dark/teal theme, redesign all 5 screens to match `design.pen`, add UOM support to items, and rebuild the tab bar with 3 tabs.

**Architecture:** All styling is via `StyleSheet.create()` (not NativeWind classes). Color tokens are defined as string constants directly in each file. Data model adds a numeric `quantity` (real) and `uom` (text) column to items. `react-native-reusables` components are scaffolded via CLI into `components/ui/` and used selectively.

**Tech Stack:** React Native 0.81 · Expo SDK 54 · Drizzle ORM + expo-sqlite · TanStack Query · Zustand · NativeWind v4 · lucide-react-native

---

## Files Modified / Created

| File | Action |
|---|---|
| `src/db/schema.ts` | quantity → real, add uom text |
| `src/db/migrations/index.ts` | register new migration |
| `src/types/item.ts` | quantity → number, add uom |
| `src/hooks/useItems.ts` | pass uom, numeric quantity |
| `tailwind.config.js` | new color tokens |
| `src/navigation/MainTabs.tsx` | 3 tabs, icon-box active style |
| `src/navigation/types.ts` | add Compras/Perfil tab routes |
| `src/screens/Compras/index.tsx` | create (placeholder) |
| `src/screens/Perfil/index.tsx` | create (placeholder) |
| `src/components/SyncStatusBar.tsx` | new colors |
| `src/components/EmptyState.tsx` | new colors |
| `src/components/ListCard.tsx` | new colors |
| `src/components/ItemRow.tsx` | new colors, remove price, add uom |
| `src/screens/ListsHome/index.tsx` | square FAB, new colors |
| `src/screens/ListDetail/index.tsx` | square FAB, remove price, show uom |
| `src/screens/AddEditList/index.tsx` | X dismiss + single Save |
| `src/screens/AddEditItem/index.tsx` | complete redesign |

---

## Task 1: Data model — schema + types

**Files:**
- Modify: `lista-ai-mobile/src/db/schema.ts`
- Modify: `lista-ai-mobile/src/types/item.ts`

- [ ] **Step 1: Update schema.ts**

Replace the `quantity` and `price` lines and add `uom`:

```typescript
// src/db/schema.ts
import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const lists = sqliteTable('lists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  remoteId: integer('remote_id'),
  name: text('name').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  remoteId: integer('remote_id'),
  listId: integer('list_id').notNull().references(() => lists.id),
  description: text('description').notNull(),
  checked: integer('checked', { mode: 'boolean' }).notNull().default(false),
  quantity: real('quantity'),        // was text — now numeric
  price: real('price'),              // kept in DB, removed from UI
  uom: text('uom'),                  // new: "kg" | "g" | "L" | "ml" | "un" | custom
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const syncQueue = sqliteTable('sync_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entity: text('entity').notNull(),
  operation: text('operation').notNull(),
  payload: text('payload').notNull(),
  createdAt: integer('created_at').notNull(),
  retryCount: integer('retry_count').notNull().default(0),
  lastError: text('last_error'),
});
```

- [ ] **Step 2: Update Item and ItemInput types**

```typescript
// src/types/item.ts
export interface Item {
  id: number;
  remoteId: number | null;
  listId: number;
  description: string;
  checked: boolean;
  quantity: number | null;   // was string | null
  price: number | null;      // kept, not shown in UI
  uom: string | null;        // new
  updatedAt: number;
  deletedAt: number | null;
}

export interface ItemInput {
  description: string;
  checked?: boolean;
  quantity?: number;          // was string
  uom?: string;               // new
  // price intentionally removed from input
}
```

- [ ] **Step 3: Type-check**

```bash
cd lista-ai-mobile && npm run typecheck
```

Expected: errors in `useItems.ts` and `AddEditItem` (quantity type mismatch). That is expected — they get fixed in later tasks.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts src/types/item.ts
git commit -m "feat: add uom column, change quantity to real in schema and types"
```

---

## Task 2: Drizzle migration

**Files:**
- Modify: `lista-ai-mobile/src/db/migrations/index.ts`

- [ ] **Step 1: Generate migration**

```bash
cd lista-ai-mobile && npm run db:generate
```

This creates a new `.sql` file in `drizzle/` (or similar output dir). Find it with:

```bash
ls -lt drizzle/*.sql | head -1
```

- [ ] **Step 2: Register the migration in migrations/index.ts**

Drizzle's expo-sqlite setup requires manually adding the migration to the index. Open `src/db/migrations/index.ts` and add entry `m0001` for the new migration. The generated SQL recreates the items table with the new schema. Add it like this:

```typescript
// src/db/migrations/index.ts
export default {
  journal: {
    entries: [
      {
        idx: 0,
        version: '6',
        when: 1775144480737,
        tag: '0000_lame_stone_men',
        breakpoints: true,
      },
      {
        idx: 1,
        version: '6',
        when: Date.now(),
        tag: '0001_quantity_real_uom',
        breakpoints: true,
      },
    ],
  },
  migrations: {
    m0000: `CREATE TABLE \`items\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`remote_id\` integer,
\t\`list_id\` integer NOT NULL,
\t\`description\` text NOT NULL,
\t\`checked\` integer DEFAULT false NOT NULL,
\t\`quantity\` text,
\t\`price\` real,
\t\`updated_at\` integer NOT NULL,
\t\`deleted_at\` integer,
\tFOREIGN KEY (\`list_id\`) REFERENCES \`lists\`(\`id\`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE \`lists\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`remote_id\` integer,
\t\`name\` text NOT NULL,
\t\`updated_at\` integer NOT NULL,
\t\`deleted_at\` integer
);
--> statement-breakpoint
CREATE TABLE \`sync_queue\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`entity\` text NOT NULL,
\t\`operation\` text NOT NULL,
\t\`payload\` text NOT NULL,
\t\`created_at\` integer NOT NULL,
\t\`retry_count\` integer DEFAULT 0 NOT NULL,
\t\`last_error\` text
);
`,
    m0001: `PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE \`__new_items\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`remote_id\` integer,
\t\`list_id\` integer NOT NULL,
\t\`description\` text NOT NULL,
\t\`checked\` integer DEFAULT false NOT NULL,
\t\`quantity\` real,
\t\`price\` real,
\t\`uom\` text,
\t\`updated_at\` integer NOT NULL,
\t\`deleted_at\` integer,
\tFOREIGN KEY (\`list_id\`) REFERENCES \`lists\`(\`id\`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO \`__new_items\` SELECT \`id\`, \`remote_id\`, \`list_id\`, \`description\`, \`checked\`, CAST(\`quantity\` AS REAL), \`price\`, NULL, \`updated_at\`, \`deleted_at\` FROM \`items\`;
--> statement-breakpoint
DROP TABLE \`items\`;
--> statement-breakpoint
ALTER TABLE \`__new_items\` RENAME TO \`items\`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;`,
  },
};
```

> **Note:** The generated SQL from `db:generate` may differ. Use the generated file's content for `m0001`. The SQL above is the expected shape — verify it matches the generated output before committing.

- [ ] **Step 3: Commit**

```bash
git add src/db/migrations/index.ts drizzle/
git commit -m "feat: migration 0001 — quantity real, add uom column"
```

---

## Task 3: Update useItems hook

**Files:**
- Modify: `lista-ai-mobile/src/hooks/useItems.ts`

- [ ] **Step 1: Update mapRow and mutations to handle numeric quantity + uom**

```typescript
// src/hooks/useItems.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../db';
import { items } from '../db/schema';
import { isNull, eq, and } from 'drizzle-orm';
import { enqueue } from '../sync/queue';
import { executeSync } from '../sync/executor';
import { useStore } from '../store';
import { generateLocalId } from '../utils/id';
import { now } from '../utils/date';
import type { Item, ItemInput } from '../types/item';

function mapRow(row: typeof items.$inferSelect): Item {
  return {
    id: row.id,
    remoteId: row.remoteId ?? null,
    listId: row.listId,
    description: row.description,
    checked: row.checked ?? false,
    quantity: row.quantity ?? null,   // now number | null
    price: row.price ?? null,
    uom: row.uom ?? null,             // new
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
  };
}

export function useItemsQuery(listId: number) {
  return useQuery<Item[]>({
    queryKey: ['items', listId],
    queryFn: async () => {
      const rows = await db
        .select()
        .from(items)
        .where(and(eq(items.listId, listId), isNull(items.deletedAt)));
      return rows.map(mapRow);
    },
    staleTime: Infinity,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  const { isOnline, setLastSyncError } = useStore();

  return useMutation({
    mutationFn: async ({
      listId,
      input,
      remoteListId,
    }: {
      listId: number;
      input: ItemInput;
      remoteListId: number | null;
    }) => {
      const localId = generateLocalId();
      const timestamp = now();

      await db.insert(items).values({
        id: localId,
        remoteId: null,
        listId,
        description: input.description,
        checked: input.checked ?? false,
        quantity: input.quantity ?? null,   // number | null
        price: null,
        uom: input.uom ?? null,             // new
        updatedAt: timestamp,
        deletedAt: null,
      });

      await enqueue({
        entity: 'item',
        operation: 'create',
        payload: JSON.stringify({
          localId,
          localListId: listId,
          remoteListId,
          description: input.description,
        }),
      });

      if (isOnline) {
        executeSync().catch((err) => {
          setLastSyncError(err instanceof Error ? err.message : String(err));
        });
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items', variables.listId] });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  const { isOnline, setLastSyncError } = useStore();

  return useMutation({
    mutationFn: async ({
      item,
      input,
      remoteListId,
    }: {
      item: Item;
      input: Partial<ItemInput>;
      remoteListId: number | null;
    }) => {
      const timestamp = now();
      const updatedDescription = input.description ?? item.description;
      const updatedChecked = input.checked ?? item.checked;

      await db
        .update(items)
        .set({
          description: updatedDescription,
          checked: updatedChecked,
          quantity: input.quantity !== undefined ? (input.quantity ?? null) : item.quantity,
          uom: input.uom !== undefined ? (input.uom ?? null) : item.uom,
          updatedAt: timestamp,
        })
        .where(eq(items.id, item.id));

      await enqueue({
        entity: 'item',
        operation: 'update',
        payload: JSON.stringify({
          localId: item.id,
          localListId: item.listId,
          remoteListId,
          remoteId: item.remoteId,
          description: updatedDescription,
          checked: updatedChecked,
        }),
      });

      if (isOnline) {
        executeSync().catch((err) => {
          setLastSyncError(err instanceof Error ? err.message : String(err));
        });
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items', variables.item.listId] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  const { isOnline, setLastSyncError } = useStore();

  return useMutation({
    mutationFn: async ({
      item,
      remoteListId,
    }: {
      item: Item;
      remoteListId: number | null;
    }) => {
      const timestamp = now();
      await db
        .update(items)
        .set({ deletedAt: timestamp })
        .where(eq(items.id, item.id));

      await enqueue({
        entity: 'item',
        operation: 'delete',
        payload: JSON.stringify({
          localId: item.id,
          localListId: item.listId,
          remoteListId,
          remoteId: item.remoteId,
        }),
      });

      if (isOnline) {
        executeSync().catch((err) => {
          setLastSyncError(err instanceof Error ? err.message : String(err));
        });
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items', variables.item.listId] });
    },
  });
}
```

- [ ] **Step 2: Type-check**

```bash
cd lista-ai-mobile && npm run typecheck 2>&1 | grep useItems
```

Expected: no errors from useItems.ts.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useItems.ts
git commit -m "feat: useItems — numeric quantity, uom field"
```

---

## Task 4: Update Tailwind color tokens

**Files:**
- Modify: `lista-ai-mobile/tailwind.config.js`

- [ ] **Step 1: Replace color palette**

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#111210',
        surface: '#1A1C1A',
        border: '#0F2E28',
        'progress-track': '#222420',
        primary: '#1D9E75',
        'primary-dark': '#0F6E56',
        accent: '#EF9F27',
        neutral: '#888780',
        'text-primary': '#EEF2F0',
        destructive: '#EF4444',
      },
      borderRadius: {
        card: '12px',
        sheet: '20px',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Commit**

```bash
git add tailwind.config.js
git commit -m "feat: update tailwind color tokens to teal/neutral theme"
```

---

## Task 5: Install react-native-reusables

**Files:**
- Create: `lista-ai-mobile/components/ui/button.tsx`
- Create: `lista-ai-mobile/components/ui/input.tsx`
- Create: `lista-ai-mobile/components/ui/label.tsx`
- Create: `lista-ai-mobile/components/ui/progress.tsx`

- [ ] **Step 1: Add components via CLI**

```bash
cd lista-ai-mobile
npx @react-native-reusables/cli@latest add button input label progress
```

This scaffolds `components/ui/button.tsx`, `input.tsx`, `label.tsx`, `progress.tsx` and installs any required `@rn-primitives/*` peer deps automatically.

- [ ] **Step 2: Verify files were created**

```bash
ls lista-ai-mobile/components/ui/
```

Expected output includes: `button.tsx input.tsx label.tsx progress.tsx`

- [ ] **Step 3: Type-check**

```bash
cd lista-ai-mobile && npm run typecheck 2>&1 | grep -i "components/ui"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/ui/ package.json package-lock.json
git commit -m "feat: scaffold react-native-reusables button, input, label, progress"
```

---

## Task 6: Rebuild MainTabs — 3 tabs, icon-box active style

**Files:**
- Modify: `lista-ai-mobile/src/navigation/MainTabs.tsx`
- Modify: `lista-ai-mobile/src/navigation/types.ts`

- [ ] **Step 1: Update types.ts to add new tab routes**

```typescript
// src/navigation/types.ts
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type ListsStackParamList = {
  ListsHome: undefined;
  ListDetail: { listId: number; listName: string };
  AddEditList: { listId?: number; listName?: string } | undefined;
  AddEditItem: { listId: number; remoteListId: number | null; itemId?: number } | undefined;
};

export type RootTabParamList = {
  ListsTab: undefined;
  ComprasTab: undefined;
  PerfilTab: undefined;
};

export type ListsHomeProps = NativeStackScreenProps<ListsStackParamList, 'ListsHome'>;
export type ListDetailProps = NativeStackScreenProps<ListsStackParamList, 'ListDetail'>;
export type AddEditListProps = NativeStackScreenProps<ListsStackParamList, 'AddEditList'>;
export type AddEditItemProps = NativeStackScreenProps<ListsStackParamList, 'AddEditItem'>;
```

- [ ] **Step 2: Rewrite MainTabs.tsx**

```typescript
// src/navigation/MainTabs.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { List, ShoppingCart, User } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootTabParamList } from './types';
import { ListsStack } from './ListsStack';
import { Compras } from '../screens/Compras';
import { Perfil } from '../screens/Perfil';

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_CONFIG: Record<keyof RootTabParamList, { icon: LucideIcon; label: string }> = {
  ListsTab:   { icon: List,          label: 'Listas'  },
  ComprasTab: { icon: ShoppingCart,  label: 'Compras' },
  PerfilTab:  { icon: User,          label: 'Perfil'  },
};

function IconBoxTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || 16 }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const config = TAB_CONFIG[route.name as keyof RootTabParamList];
        if (!config) return null;
        const { icon: Icon, label } = config;

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tab}
            onPress={() => { if (!isFocused) navigation.navigate(route.name); }}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, isFocused && styles.iconBoxActive]}>
              <Icon
                size={22}
                color={isFocused ? '#1D9E75' : '#888780'}
                strokeWidth={1.8}
              />
            </View>
            <Text style={[styles.label, isFocused && styles.labelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <IconBoxTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="ListsTab"   component={ListsStack} />
      <Tab.Screen name="ComprasTab" component={Compras} />
      <Tab.Screen name="PerfilTab"  component={Perfil} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#161A18',
    borderTopWidth: 1,
    borderTopColor: '#1A2420',
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: 'rgba(29,158,117,0.15)',
    borderWidth: 1.5,
    borderColor: '#1D9E75',
  },
  label: {
    color: '#888780',
    fontSize: 11,
    fontWeight: '500',
  },
  labelActive: {
    color: '#EEF2F0',
    fontWeight: '700',
  },
});
```

- [ ] **Step 3: Type-check**

```bash
cd lista-ai-mobile && npm run typecheck 2>&1 | grep -E "MainTabs|types"
```

Expected: errors about missing `Compras` and `Perfil` screen imports (fixed in next task).

- [ ] **Step 4: Commit after next task** (screens must exist first — continue to Task 7)

---

## Task 7: Add Compras and Perfil placeholder screens

**Files:**
- Create: `lista-ai-mobile/src/screens/Compras/index.tsx`
- Create: `lista-ai-mobile/src/screens/Perfil/index.tsx`

- [ ] **Step 1: Create Compras screen**

```typescript
// src/screens/Compras/index.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingCart } from 'lucide-react-native';

export function Compras() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Compras</Text>
      </View>
      <View style={styles.empty}>
        <View style={styles.iconBadge}>
          <ShoppingCart size={28} color="#888780" strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>Coming soon</Text>
        <Text style={styles.emptySubtitle}>Shopping mode will be available in a future update</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111210' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { color: '#EEF2F0', fontSize: 28, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    backgroundColor: '#1A1C1A',
    borderWidth: 1,
    borderColor: '#0F2E28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: '#EEF2F0', fontSize: 16, fontWeight: '600' },
  emptySubtitle: { color: '#888780', fontSize: 13, textAlign: 'center' },
});
```

- [ ] **Step 2: Create Perfil screen**

```typescript
// src/screens/Perfil/index.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from 'lucide-react-native';

export function Perfil() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
      </View>
      <View style={styles.empty}>
        <View style={styles.iconBadge}>
          <User size={28} color="#888780" strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>Coming soon</Text>
        <Text style={styles.emptySubtitle}>Profile and settings will be available in a future update</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111210' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { color: '#EEF2F0', fontSize: 28, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    backgroundColor: '#1A1C1A',
    borderWidth: 1,
    borderColor: '#0F2E28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: '#EEF2F0', fontSize: 16, fontWeight: '600' },
  emptySubtitle: { color: '#888780', fontSize: 13, textAlign: 'center' },
});
```

- [ ] **Step 3: Type-check**

```bash
cd lista-ai-mobile && npm run typecheck
```

Expected: no errors from navigation or new screens.

- [ ] **Step 4: Commit**

```bash
git add src/navigation/MainTabs.tsx src/navigation/types.ts src/screens/Compras/ src/screens/Perfil/
git commit -m "feat: 3-tab nav (Listas/Compras/Perfil) with icon-box active style"
```

---

## Task 8: Update SyncStatusBar

**Files:**
- Modify: `lista-ai-mobile/src/components/SyncStatusBar.tsx`

- [ ] **Step 1: Apply new colors**

```typescript
// src/components/SyncStatusBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RefreshCw, AlertCircle } from 'lucide-react-native';
import { useSync } from '../hooks/useSync';
import { executeSync } from '../sync/executor';

export function SyncStatusBar() {
  const { pendingCount, lastSyncError } = useSync();

  if (!lastSyncError && pendingCount === 0) return null;

  const isError = !!lastSyncError;

  const handleRetry = async () => {
    try { await executeSync(); } catch { /* handled by sync layer */ }
  };

  return (
    <TouchableOpacity
      style={[styles.bar, isError ? styles.barError : styles.barPending]}
      onPress={isError ? handleRetry : undefined}
      activeOpacity={isError ? 0.8 : 1}
    >
      {isError
        ? <AlertCircle size={14} color="#EEF2F0" strokeWidth={2} />
        : <RefreshCw size={14} color="#EEF2F0" strokeWidth={2} />}
      <Text style={styles.text}>
        {isError
          ? 'Sync error — tap to retry'
          : `Syncing ${pendingCount} item${pendingCount !== 1 ? 's' : ''}…`}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: '#1A1C1A',
    borderBottomWidth: 1,
    borderBottomColor: '#0F2E28',
  },
  barPending: { backgroundColor: '#1A1C1A' },
  barError:   { backgroundColor: '#EF4444' },
  text: { color: '#888780', fontSize: 12, fontWeight: '500' },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SyncStatusBar.tsx
git commit -m "feat: SyncStatusBar — new color tokens"
```

---

## Task 9: Update EmptyState

**Files:**
- Modify: `lista-ai-mobile/src/components/EmptyState.tsx`

- [ ] **Step 1: Apply new colors**

```typescript
// src/components/EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

export function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Icon size={32} color="#888780" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  badge: {
    width: 68,
    height: 68,
    borderRadius: 9999,
    backgroundColor: '#1A1C1A',
    borderWidth: 1,
    borderColor: '#0F2E28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#EEF2F0', fontSize: 16, fontWeight: '600' },
  subtitle: { color: '#888780', fontSize: 13, textAlign: 'center' },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/EmptyState.tsx
git commit -m "feat: EmptyState — new color tokens"
```

---

## Task 10: Update ListCard

**Files:**
- Modify: `lista-ai-mobile/src/components/ListCard.tsx`

- [ ] **Step 1: Apply new colors and token names**

```typescript
// src/components/ListCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { List } from '../types/list';
import { useItemsQuery } from '../hooks/useItems';

interface ListCardProps {
  list: List;
  onPress: () => void;
  onDelete: () => void;
}

export function ListCard({ list, onPress, onDelete }: ListCardProps) {
  const { data: allItems = [] } = useItemsQuery(list.id);
  const total = allItems.length;
  const checked = allItems.filter((i) => i.checked).length;
  const progress = total > 0 ? checked / total : 0;
  const percent = Math.round(progress * 100);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onDelete}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{list.name}</Text>
        <Text style={styles.count}>{checked} / {total}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>
      <Text style={styles.percent}>
        {total === 0 ? 'No items' : `${percent}% complete`}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1C1A',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#0F2E28',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  name:    { color: '#EEF2F0', fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  count:   { color: '#888780', fontSize: 12 },
  progressTrack: {
    height: 4,
    backgroundColor: '#222420',
    borderRadius: 9999,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1D9E75',
    borderRadius: 9999,
  },
  percent: { color: '#888780', fontSize: 11 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ListCard.tsx
git commit -m "feat: ListCard — teal progress, new color tokens"
```

---

## Task 11: Update ItemRow

**Files:**
- Modify: `lista-ai-mobile/src/components/ItemRow.tsx`

- [ ] **Step 1: Remove price, add uom, apply new colors**

```typescript
// src/components/ItemRow.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import type { Item } from '../types/item';

interface ItemRowProps {
  item: Item;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ItemRow({ item, onToggle, onEdit, onDelete }: ItemRowProps) {
  const qtyLabel = [
    item.quantity != null ? String(item.quantity) : null,
    item.uom ?? null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View style={[styles.row, item.checked && styles.rowChecked]}>
      {/* Checkbox */}
      <TouchableOpacity style={styles.checkboxArea} onPress={onToggle} hitSlop={8}>
        <View style={[styles.checkbox, item.checked && styles.checkboxDone]}>
          {item.checked && (
            <View style={styles.checkmark} />
          )}
        </View>
      </TouchableOpacity>

      {/* Content */}
      <TouchableOpacity style={styles.content} onPress={onEdit} activeOpacity={0.7}>
        <Text
          style={[styles.description, item.checked && styles.descriptionChecked]}
          numberOfLines={2}
        >
          {item.description}
        </Text>
        {qtyLabel ? (
          <Text style={[styles.qty, item.checked && styles.qtyChecked]}>{qtyLabel}</Text>
        ) : null}
      </TouchableOpacity>

      {/* Delete */}
      <TouchableOpacity style={styles.deleteArea} onPress={onDelete} hitSlop={8}>
        <Trash2 size={17} color={item.checked ? '#2A2A2A' : '#888780'} strokeWidth={1.75} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#1A1C1A',
    borderWidth: 1,
    borderColor: '#0F2E28',
    borderRadius: 10,
    marginHorizontal: 12,
    gap: 10,
  },
  rowChecked: { opacity: 0.5 },
  checkboxArea: { flexShrink: 0 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#1D9E75',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: '#1D9E75',
    borderColor: '#1D9E75',
  },
  checkmark: {
    width: 10,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
  content: { flex: 1 },
  description: { color: '#EEF2F0', fontSize: 13 },
  descriptionChecked: { color: '#888780', textDecorationLine: 'line-through' },
  qty: { color: '#EF9F27', fontSize: 11, fontWeight: '600', marginTop: 2 },
  qtyChecked: { color: '#888780', textDecorationLine: 'line-through' },
  deleteArea: { flexShrink: 0 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ItemRow.tsx
git commit -m "feat: ItemRow — teal checkbox, amber qty+uom, remove price, new colors"
```

---

## Task 12: Update ListsHome

**Files:**
- Modify: `lista-ai-mobile/src/screens/ListsHome/index.tsx`

- [ ] **Step 1: Apply new colors and square-rounded FAB**

```typescript
// src/screens/ListsHome/index.tsx
import React from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ClipboardList } from 'lucide-react-native';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { EmptyState } from '../../components/EmptyState';
import { ListCard } from '../../components/ListCard';
import { SyncStatusBar } from '../../components/SyncStatusBar';
import { useListsQuery, useDeleteList } from '../../hooks/useLists';
import type { ListsHomeProps } from '../../navigation/types';
import type { List } from '../../types/list';

function ListsHomeContent({ navigation }: ListsHomeProps) {
  const { data: lists = [], isLoading } = useListsQuery();
  const deleteList = useDeleteList();

  const handleDelete = (list: List) => {
    Alert.alert(
      'Delete List',
      `Delete "${list.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteList.mutate(list) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <SyncStatusBar />
      <View style={styles.header}>
        <Text style={styles.title}>My Lists</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator color="#1D9E75" style={styles.loader} />
      ) : lists.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No lists yet"
          subtitle="Tap NEW LIST to create your first shopping list"
        />
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ListCard
              list={item}
              onPress={() => navigation.navigate('ListDetail', { listId: item.id, listName: item.name })}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEditList', undefined)}
        activeOpacity={0.85}
      >
        <Plus size={16} color="#EEF2F0" strokeWidth={2.5} />
        <Text style={styles.fabText}>NEW LIST</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export function ListsHome(props: ListsHomeProps) {
  return (
    <ErrorBoundary>
      <ListsHomeContent {...props} />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111210' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { color: '#EEF2F0', fontSize: 28, fontWeight: '700' },
  loader: { flex: 1 },
  list: { paddingVertical: 8, paddingBottom: 100 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#1D9E75',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,           // square-rounded (was 9999)
    elevation: 4,
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  fabText: { color: '#EEF2F0', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/ListsHome/index.tsx
git commit -m "feat: ListsHome — teal square-rounded FAB, new color tokens"
```

---

## Task 13: Update ListDetail

**Files:**
- Modify: `lista-ai-mobile/src/screens/ListDetail/index.tsx`

- [ ] **Step 1: Remove price display, add uom to row, square FAB, new colors**

```typescript
// src/screens/ListDetail/index.tsx
import React from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ShoppingCart, ArrowLeft } from 'lucide-react-native';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { EmptyState } from '../../components/EmptyState';
import { ItemRow } from '../../components/ItemRow';
import { useItemsQuery, useUpdateItem, useDeleteItem } from '../../hooks/useItems';
import { useListsQuery } from '../../hooks/useLists';
import type { ListDetailProps } from '../../navigation/types';
import type { Item } from '../../types/item';

function ListDetailContent({ route, navigation }: ListDetailProps) {
  const { listId, listName } = route.params;
  const { data: allItems = [], isLoading } = useItemsQuery(listId);
  const { data: lists = [] } = useListsQuery();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  const currentList = lists.find((l) => l.id === listId);
  const remoteListId = currentList?.remoteId ?? null;

  const handleToggle = (item: Item) => {
    updateItem.mutate({ item, input: { checked: !item.checked }, remoteListId });
  };

  const handleEdit = (item: Item) => {
    navigation.navigate('AddEditItem', { listId, remoteListId, itemId: item.id });
  };

  const handleDelete = (item: Item) => {
    deleteItem.mutate({ item, remoteListId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <ArrowLeft size={22} color="#1D9E75" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{listName}</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator color="#1D9E75" style={styles.loader} />
      ) : allItems.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No items yet"
          subtitle="Tap ADD ITEM to add your first item"
        />
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              onToggle={() => handleToggle(item)}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEditItem', { listId, remoteListId })}
        activeOpacity={0.85}
      >
        <Plus size={16} color="#EEF2F0" strokeWidth={2.5} />
        <Text style={styles.fabText}>ADD ITEM</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export function ListDetail(props: ListDetailProps) {
  return (
    <ErrorBoundary>
      <ListDetailContent {...props} />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111210' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0F2E28',
    backgroundColor: '#1A1C1A',
  },
  title:  { color: '#EEF2F0', fontSize: 16, fontWeight: '600', flex: 1 },
  loader: { flex: 1 },
  list:   { padding: 12, paddingBottom: 100 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#1D9E75',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  fabText: { color: '#EEF2F0', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/ListDetail/index.tsx
git commit -m "feat: ListDetail — teal FAB, arrow back, no price, uom in rows"
```

---

## Task 14: Update AddEditList

**Files:**
- Modify: `lista-ai-mobile/src/screens/AddEditList/index.tsx`

- [ ] **Step 1: Replace Cancel+Save with X header + single Save button**

```typescript
// src/screens/AddEditList/index.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useCreateList, useUpdateList, useListsQuery } from '../../hooks/useLists';
import type { AddEditListProps } from '../../navigation/types';

export function AddEditList({ route, navigation }: AddEditListProps) {
  const params = route.params;
  const isEditing = !!params?.listId;
  const [name, setName] = useState(params?.listName ?? '');
  const [focused, setFocused] = useState(false);

  const createList = useCreateList();
  const updateList = useUpdateList();
  const { data: lists = [] } = useListsQuery();

  const handleSave = async () => {
    if (!name.trim()) return;
    if (isEditing && params?.listId) {
      const list = lists.find((l) => l.id === params.listId);
      if (list) await updateList.mutateAsync({ list, input: { name: name.trim() } });
    } else {
      await createList.mutateAsync({ name: name.trim() });
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with X */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit List' : 'New List'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <View style={styles.xBtn}>
            <X size={16} color="#888780" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.body}
      >
        <Text style={styles.label}>LIST NAME</Text>
        <TextInput
          style={[styles.input, focused && styles.inputFocused]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Weekly Groceries"
          placeholderTextColor="#888780"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSave}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        <TouchableOpacity
          style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!name.trim()}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1C1A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0F2E28',
  },
  headerTitle: { color: '#EEF2F0', fontSize: 16, fontWeight: '700' },
  xBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#111210',
    borderWidth: 1,
    borderColor: '#0F2E28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, padding: 20, gap: 8 },
  label: {
    color: '#888780',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  input: {
    backgroundColor: '#111210',
    borderWidth: 1,
    borderColor: '#0F2E28',
    borderRadius: 9,
    color: '#EEF2F0',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  inputFocused: { borderColor: '#1D9E75', borderWidth: 1.5 },
  saveBtn: {
    backgroundColor: '#1D9E75',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  saveBtnText: { color: '#EEF2F0', fontWeight: '700', fontSize: 15 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/AddEditList/index.tsx
git commit -m "feat: AddEditList — X dismiss, single Save, new colors"
```

---

## Task 15: Redesign AddEditItem

**Files:**
- Modify: `lista-ai-mobile/src/screens/AddEditItem/index.tsx`
- Modify: `lista-ai-mobile/src/navigation/ListsStack.tsx` (presentation mode)

- [ ] **Step 1: Update ListsStack to present AddEditItem as bottom sheet**

```typescript
// src/navigation/ListsStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ListsStackParamList } from './types';
import { ListsHome } from '../screens/ListsHome';
import { ListDetail } from '../screens/ListDetail';
import { AddEditList } from '../screens/AddEditList';
import { AddEditItem } from '../screens/AddEditItem';

const Stack = createNativeStackNavigator<ListsStackParamList>();

export function ListsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: '#111210' },
      }}
    >
      <Stack.Screen name="ListsHome"  component={ListsHome}    options={{ headerShown: false }} />
      <Stack.Screen name="ListDetail" component={ListDetail}   options={{ headerShown: false }} />
      <Stack.Screen
        name="AddEditList"
        component={AddEditList}
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="AddEditItem"
        component={AddEditItem}
        options={{
          presentation: 'formSheet',   // bottom sheet on iOS; modal on Android
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack.Navigator>
  );
}
```

> **Note:** `formSheet` presentation gives the native bottom sheet drag-handle on iOS. On Android it behaves as a full modal. If `formSheet` causes issues on your RN version, fall back to `modal`.

- [ ] **Step 2: Rewrite AddEditItem**

```typescript
// src/screens/AddEditItem/index.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, XCircle } from 'lucide-react-native';
import { useCreateItem, useUpdateItem, useItemsQuery } from '../../hooks/useItems';
import type { AddEditItemProps } from '../../navigation/types';

const UOM_CHIPS = ['g', 'kg', 'L', 'ml', 'un'] as const;

function getStep(qty: number): number {
  // If the value has a decimal part, step by 0.1; otherwise step by 1
  return qty !== Math.floor(qty) ? 0.1 : 1;
}

export function AddEditItem({ route, navigation }: AddEditItemProps) {
  const { listId, remoteListId, itemId } = route.params ?? {};
  const isEditing = !!itemId;

  const { data: allItems = [] } = useItemsQuery(listId!);
  const existingItem = itemId ? allItems.find((i) => i.id === itemId) : undefined;

  const [description, setDescription] = useState(existingItem?.description ?? '');
  const [descFocused, setDescFocused] = useState(false);
  const [quantity, setQuantity] = useState<number>(existingItem?.quantity ?? 1);
  const [quantityText, setQuantityText] = useState<string>(
    existingItem?.quantity != null ? String(existingItem.quantity) : '1'
  );
  const [uom, setUom] = useState<string>(existingItem?.uom ?? '');
  const [uomFocused, setUomFocused] = useState(false);

  const createItem = useCreateItem();
  const updateItem = useUpdateItem();

  // Keep quantity number in sync with quantityText input
  const handleQuantityText = (text: string) => {
    setQuantityText(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) setQuantity(parsed);
  };

  const handleDecrement = useCallback(() => {
    setQuantity((prev) => {
      const step = getStep(prev);
      const next = Math.max(0, parseFloat((prev - step).toFixed(1)));
      setQuantityText(String(next));
      return next;
    });
  }, []);

  const handleIncrement = useCallback(() => {
    setQuantity((prev) => {
      const step = getStep(prev);
      const next = parseFloat((prev + step).toFixed(1));
      setQuantityText(String(next));
      return next;
    });
  }, []);

  const handleChipSelect = (chip: string) => {
    setUom(chip);
  };

  const handleUomText = (text: string) => {
    setUom(text);
  };

  const handleSave = async () => {
    if (!description.trim() || !listId) return;

    const input = {
      description: description.trim(),
      quantity: quantity > 0 ? quantity : undefined,
      uom: uom.trim() || undefined,
    };

    if (isEditing && existingItem) {
      await updateItem.mutateAsync({ item: existingItem, input, remoteListId: remoteListId ?? null });
    } else {
      await createItem.mutateAsync({ listId, remoteListId: remoteListId ?? null, input });
    }
    navigation.goBack();
  };

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        {/* Drag handle */}
        <View style={styles.dragHandleRow}>
          <View style={styles.dragHandle} />
        </View>

        {/* Header: camera · Detalhes · Concluído */}
        <View style={styles.header}>
          <View style={styles.cameraBtn}>
            <Camera size={18} color="#1D9E75" strokeWidth={1.8} />
          </View>
          <Text style={styles.headerTitle}>{isEditing ? 'Detalhes' : 'Detalhes'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={!description.trim()}>
            <Text style={[styles.concluido, !description.trim() && styles.concluidoDisabled]}>
              Concluído
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {/* Description */}
            <TextInput
              style={[styles.descInput, descFocused && styles.descInputFocused]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description"
              placeholderTextColor="#555"
              autoFocus
              onFocus={() => setDescFocused(true)}
              onBlur={() => setDescFocused(false)}
              returnKeyType="next"
            />

            {/* Quantidade + Unidade */}
            <View>
              <View style={styles.qtyLabels}>
                <Text style={[styles.fieldLabel, { flex: 1 }]}>Quantidade</Text>
                <Text style={[styles.fieldLabel, { flex: 1 }]}>Unidade</Text>
                <View style={styles.btnSpacer} />
              </View>
              <View style={styles.qtyRow}>
                {/* Qty text input */}
                <View style={styles.qtyInput}>
                  <TextInput
                    style={styles.qtyTextInput}
                    value={quantityText}
                    onChangeText={handleQuantityText}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    selectTextOnFocus
                  />
                  <TouchableOpacity onPress={() => { setQuantityText('1'); setQuantity(1); }}>
                    <XCircle size={16} color="#333" strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                {/* UOM text input */}
                <View style={[styles.qtyInput, uomFocused && styles.qtyInputFocused]}>
                  <TextInput
                    style={styles.qtyTextInput}
                    value={uom}
                    onChangeText={handleUomText}
                    placeholder="—"
                    placeholderTextColor="#555"
                    onFocus={() => setUomFocused(true)}
                    onBlur={() => setUomFocused(false)}
                    returnKeyType="done"
                    maxLength={8}
                  />
                  {uom.length > 0 && (
                    <TouchableOpacity onPress={() => setUom('')}>
                      <XCircle size={16} color="#333" strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* − button */}
                <TouchableOpacity style={styles.stepBtn} onPress={handleDecrement} activeOpacity={0.8}>
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>

                {/* + button */}
                <TouchableOpacity style={styles.stepBtn} onPress={handleIncrement} activeOpacity={0.8}>
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* UOM chips */}
            <View style={styles.chipsRow}>
              <Text style={styles.chipsLabel}>UNIDADE</Text>
              <View style={styles.chips}>
                {UOM_CHIPS.map((chip) => {
                  const isActive = uom === chip;
                  return (
                    <TouchableOpacity
                      key={chip}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => handleChipSelect(chip)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {chip}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  sheet: {
    backgroundColor: '#1A1C1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  flex: { flex: 1 },

  dragHandleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  dragHandle: { width: 36, height: 4, borderRadius: 9999, backgroundColor: '#2A2C2A' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0F2E28',
  },
  cameraBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#111210',
    borderWidth: 1,
    borderColor: '#0F2E28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#EEF2F0', fontSize: 16, fontWeight: '700' },
  concluido: { color: '#1D9E75', fontSize: 14, fontWeight: '600' },
  concluidoDisabled: { opacity: 0.35 },

  body: { padding: 18, gap: 16 },

  descInput: {
    backgroundColor: '#111210',
    borderWidth: 1.5,
    borderColor: '#0F2E28',
    borderRadius: 12,
    color: '#EEF2F0',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  descInputFocused: { borderColor: '#1D9E75' },

  fieldLabel: { color: '#888780', fontSize: 11, fontWeight: '500', marginBottom: 6 },
  qtyLabels: { flexDirection: 'row', alignItems: 'center' },
  btnSpacer: { width: 96 },

  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111210',
    borderWidth: 1,
    borderColor: '#0F2E28',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
    gap: 4,
  },
  qtyInputFocused: { borderColor: '#1D9E75' },
  qtyTextInput: { flex: 1, color: '#EEF2F0', fontSize: 14, fontWeight: '500', padding: 0 },

  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1D9E75',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  stepBtnText: { color: '#fff', fontSize: 20, fontWeight: '400', lineHeight: 24 },

  chipsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipsLabel: {
    color: '#888780',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flexShrink: 0,
  },
  chips: { flex: 1, flexDirection: 'row', gap: 5 },
  chip: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#111210',
    borderWidth: 1,
    borderColor: '#0F2E28',
  },
  chipActive: { backgroundColor: '#1D9E75', borderColor: '#1D9E75' },
  chipText: { color: '#888780', fontSize: 12 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
});
```

- [ ] **Step 3: Type-check**

```bash
cd lista-ai-mobile && npm run typecheck
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/AddEditItem/index.tsx src/navigation/ListsStack.tsx
git commit -m "feat: AddEditItem — bottom sheet redesign with stepper, UOM chips, Concluído"
```

---

## Verification

- [ ] `cd lista-ai-mobile && npx expo start`
- [ ] **ListsHome**: teal progress bars, no blue; FAB has square corners
- [ ] **Tab bar**: 3 tabs (Listas/Compras/Perfil); active tab shows icon in rounded-square teal box with bold white label; inactive is muted with no box
- [ ] **ListDetail**: no price column; qty+UOM shown in amber (e.g. `2 kg`); teal checkboxes; teal back arrow
- [ ] **Toggle item checked**: teal filled checkbox, 50% opacity, strikethrough description
- [ ] **AddEditList**: opens as modal with X top-right and single Save button; X dismisses without saving
- [ ] **AddEditItem**: opens as bottom sheet; description input; qty + unit side-by-side with ⊗ clear and rounded-square ± buttons; 5 UOM chips below; Concluído saves; chip tap fills unit field; typing in unit clears chip selection
- [ ] **Stepper logic**: integer value (e.g. 2) → ±1; decimal value (e.g. 1.5) → ±0.1
- [ ] **Compras / Perfil tabs**: show "Coming soon" placeholder with icon
