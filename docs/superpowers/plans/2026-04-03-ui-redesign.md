# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all emoji icons with flat Lucide SVG icons, add a pill-style tab bar, and polish ListCard/ItemRow components to match the `design.pen` Penpot mockup.

**Architecture:** Surgical in-place upgrades to existing components — no new component library. `lucide-react-native` provides all icons; `react-native-svg` is its required peer. The tab bar is replaced with a fully custom component using the `tabBar` prop of React Navigation's bottom tabs.

**Tech Stack:** React Native 0.81, Expo SDK 54, React Navigation v7 bottom tabs, NativeWind 4, StyleSheet, lucide-react-native

---

## File Map

| File | Change |
|---|---|
| `lista-ai-mobile/package.json` | Add `lucide-react-native`, `react-native-svg` |
| `src/navigation/MainTabs.tsx` | Replace with custom pill tab bar |
| `src/components/EmptyState.tsx` | Change `icon` prop from `string` to Lucide component |
| `src/components/ListCard.tsx` | Pill progress bar, green fill, completion %, count format |
| `src/components/ItemRow.tsx` | Square/CheckSquare + Trash2 icons, checked opacity |
| `src/components/SyncStatusBar.tsx` | RefreshCw / AlertCircle icons |
| `src/screens/ListsHome/index.tsx` | Title text, Plus icon in FAB, updated EmptyState call |
| `src/screens/ListDetail/index.tsx` | Plus icon in FAB, updated EmptyState call |

> **Note:** `AddEditList` and `AddEditItem` already have polished input styling and no emoji — no changes needed.

---

## Task 1: Install Dependencies

**Files:**
- Modify: `lista-ai-mobile/package.json`

- [ ] **Step 1: Install lucide-react-native and react-native-svg**

Run from `lista-ai-mobile/`:
```bash
cd lista-ai-mobile
npx expo install react-native-svg
npm install lucide-react-native
```

Expected: Both packages added to `package.json`. `react-native-svg` version will be chosen by Expo for SDK 54 compatibility.

- [ ] **Step 2: Verify imports resolve**

```bash
npm run typecheck
```

Expected: No errors related to `lucide-react-native` or `react-native-svg`. (Other pre-existing type errors are fine to ignore.)

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add lucide-react-native and react-native-svg"
```

---

## Task 2: Update EmptyState Component

**Files:**
- Modify: `src/components/EmptyState.tsx`

Current: accepts `icon: string` (emoji), renders it as a `<Text>`.
New: accepts a Lucide icon component, renders it inside a circular badge.

- [ ] **Step 1: Replace EmptyState.tsx**

Replace the entire file `src/components/EmptyState.tsx` with:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBadge}>
        <Icon size={32} color="#71717A" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconBadge: {
    backgroundColor: '#27272A',
    borderRadius: 9999,
    padding: 18,
    marginBottom: 16,
  },
  title: { color: '#FAFAFA', fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#A1A1AA', fontSize: 14, textAlign: 'center' },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run typecheck
```

Expected: Errors on `ListsHome` and `ListDetail` where `icon="📋"` is still a string — those callers are fixed in Tasks 7 and 8.

- [ ] **Step 3: Commit**

```bash
git add src/components/EmptyState.tsx
git commit -m "feat: replace emoji icon with Lucide component in EmptyState"
```

---

## Task 3: Update ListCard Component

**Files:**
- Modify: `src/components/ListCard.tsx`

Changes:
- Progress bar fill color: `#3B82F6` → `#22C55E` (green, matches design)
- Progress bar `borderRadius`: `2` → `9999` (full pill shape)
- Count display: move to header row next to name as `"3 / 6"`, add percentage text below bar

- [ ] **Step 1: Replace ListCard.tsx**

Replace the entire file `src/components/ListCard.tsx` with:

```tsx
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
        <Text style={styles.count}>
          {total === 0 ? '0 / 0' : `${checked} / ${total}`}
        </Text>
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
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: { color: '#FAFAFA', fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  count: { color: '#A1A1AA', fontSize: 12 },
  progressTrack: {
    height: 5,
    backgroundColor: '#27272A',
    borderRadius: 9999,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 9999,
  },
  percent: { color: '#71717A', fontSize: 11 },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run typecheck
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ListCard.tsx
git commit -m "feat: polish ListCard with pill progress bar and completion percentage"
```

---

## Task 4: Update ItemRow Component

**Files:**
- Modify: `src/components/ItemRow.tsx`

Changes:
- Replace custom circle checkbox with Lucide `Square` (unchecked) / `CheckSquare` (checked)
- Replace `🗑️` emoji with Lucide `Trash2`
- Checked row: add `opacity: 0.55`

- [ ] **Step 1: Replace ItemRow.tsx**

Replace the entire file `src/components/ItemRow.tsx` with:

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Square, CheckSquare, Trash2 } from 'lucide-react-native';
import type { Item } from '../types/item';

interface ItemRowProps {
  item: Item;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ItemRow({ item, onToggle, onEdit, onDelete }: ItemRowProps) {
  return (
    <View style={[styles.row, item.checked && styles.rowChecked]}>
      <TouchableOpacity style={styles.checkboxArea} onPress={onToggle} hitSlop={8}>
        {item.checked
          ? <CheckSquare size={22} color="#22C55E" strokeWidth={2} />
          : <Square size={22} color="#3B82F6" strokeWidth={2} />}
      </TouchableOpacity>

      <TouchableOpacity style={styles.content} onPress={onEdit} activeOpacity={0.7}>
        <Text
          style={[styles.description, item.checked && styles.descriptionChecked]}
          numberOfLines={2}
        >
          {item.description}
        </Text>
        {(item.quantity || item.price != null) && (
          <Text style={styles.meta}>
            {[item.quantity, item.price != null ? `$${item.price.toFixed(2)}` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteArea} onPress={onDelete} hitSlop={8}>
        <Trash2 size={18} color={item.checked ? '#3F3F46' : '#71717A'} strokeWidth={1.75} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#18181B',
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  rowChecked: { opacity: 0.55 },
  checkboxArea: { marginRight: 12 },
  content: { flex: 1 },
  description: { color: '#FAFAFA', fontSize: 16 },
  descriptionChecked: { color: '#71717A', textDecorationLine: 'line-through' },
  meta: { color: '#A1A1AA', fontSize: 13, marginTop: 2 },
  deleteArea: { marginLeft: 12 },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run typecheck
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ItemRow.tsx
git commit -m "feat: replace emoji checkbox and trash icon with Lucide icons in ItemRow"
```

---

## Task 5: Update SyncStatusBar Component

**Files:**
- Modify: `src/components/SyncStatusBar.tsx`

Changes: add `RefreshCw` icon for pending state, `AlertCircle` for error state, to the left of the text.

- [ ] **Step 1: Replace SyncStatusBar.tsx**

Replace the entire file `src/components/SyncStatusBar.tsx` with:

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RefreshCw, AlertCircle } from 'lucide-react-native';
import { useSync } from '../hooks/useSync';
import { executeSync } from '../sync/executor';

export function SyncStatusBar() {
  const { pendingCount, lastSyncError } = useSync();

  if (!lastSyncError && pendingCount === 0) return null;

  const isError = lastSyncError !== null;

  const handleRetry = async () => {
    try {
      await executeSync();
    } catch {
      // handled by sync layer
    }
  };

  return (
    <TouchableOpacity
      style={[styles.bar, isError ? styles.barError : styles.barPending]}
      onPress={isError ? handleRetry : undefined}
      activeOpacity={isError ? 0.8 : 1}
    >
      {isError
        ? <AlertCircle size={14} color="#FAFAFA" strokeWidth={2} />
        : <RefreshCw size={14} color="#FAFAFA" strokeWidth={2} />}
      <Text style={styles.text}>
        {isError
          ? `Sync error — tap to retry`
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
  },
  barPending: { backgroundColor: '#D97706' },
  barError: { backgroundColor: '#EF4444' },
  text: { color: '#FAFAFA', fontSize: 13, fontWeight: '500' },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run typecheck
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/SyncStatusBar.tsx
git commit -m "feat: add Lucide icons to SyncStatusBar"
```

---

## Task 6: Pill Tab Bar

**Files:**
- Modify: `src/navigation/MainTabs.tsx`

Replace the default emoji-based tab bar with a fully custom pill-style component. The active tab gets a `#3B82F6` rounded pill wrapping icon + label; inactive tabs show gray icon + label on the transparent background.

- [ ] **Step 1: Replace MainTabs.tsx**

Replace the entire file `src/navigation/MainTabs.tsx` with:

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { List, Settings as SettingsIcon } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootTabParamList } from './types';
import { ListsStack } from './ListsStack';
import { Settings as SettingsScreen } from '../screens/Settings';

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  ListsTab: { icon: List, label: 'Lists' },
  SettingsTab: { icon: SettingsIcon, label: 'Settings' },
};

function PillTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || 12 }]}>
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name];
          if (!config) return null;
          const { icon: Icon, label } = config;

          const onPress = () => {
            if (!isFocused) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.tab, isFocused && styles.tabActive]}
              onPress={onPress}
              activeOpacity={0.85}
            >
              <Icon
                size={16}
                color={isFocused ? '#FFFFFF' : '#71717A'}
                strokeWidth={2}
              />
              <Text style={[styles.label, isFocused && styles.labelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="ListsTab" component={ListsStack} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#18181B',
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    paddingTop: 10,
    paddingHorizontal: 24,
  },
  inner: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  label: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '500',
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run typecheck
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/navigation/MainTabs.tsx
git commit -m "feat: replace emoji tab bar with Lucide pill-style tab bar"
```

---

## Task 7: Update ListsHome Screen

**Files:**
- Modify: `src/screens/ListsHome/index.tsx`

Changes:
- Title text: `"My Lists"` → `"Lists"`
- FAB: replace `"+ NEW LIST"` text-only with `Plus` icon + `"NEW LIST"` text
- EmptyState: pass `icon={ClipboardList}` (Lucide component) instead of `icon="📋"`

- [ ] **Step 1: Replace ListsHome/index.tsx**

Replace the entire file `src/screens/ListsHome/index.tsx` with:

```tsx
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
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteList.mutate(list),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <SyncStatusBar />
      <View style={styles.header}>
        <Text style={styles.title}>Lists</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator color="#3B82F6" style={styles.loader} />
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
              onPress={() =>
                navigation.navigate('ListDetail', {
                  listId: item.id,
                  listName: item.name,
                })
              }
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEditList', undefined)}
        activeOpacity={0.85}
      >
        <Plus size={18} color="#FAFAFA" strokeWidth={2.5} />
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
  container: { flex: 1, backgroundColor: '#09090B' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { color: '#FAFAFA', fontSize: 28, fontWeight: '700' },
  loader: { flex: 1 },
  list: { paddingVertical: 8, paddingBottom: 100 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 9999,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: { color: '#FAFAFA', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run typecheck
```

Expected: No errors on `ListsHome`.

- [ ] **Step 3: Commit**

```bash
git add src/screens/ListsHome/index.tsx
git commit -m "feat: update ListsHome with Lucide icons and 'Lists' title"
```

---

## Task 8: Update ListDetail Screen

**Files:**
- Modify: `src/screens/ListDetail/index.tsx`

Changes:
- FAB: replace `"+ ADD"` text-only with `Plus` icon + `"ADD"` text
- EmptyState: pass `icon={ShoppingCart}` instead of `icon="🛒"`

- [ ] **Step 1: Replace ListDetail/index.tsx**

Replace the entire file `src/screens/ListDetail/index.tsx` with:

```tsx
import React, { useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ShoppingCart, ChevronDown, ChevronRight } from 'lucide-react-native';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { EmptyState } from '../../components/EmptyState';
import { ItemRow } from '../../components/ItemRow';
import { useItemsQuery, useUpdateItem, useDeleteItem } from '../../hooks/useItems';
import { useListsQuery } from '../../hooks/useLists';
import type { ListDetailProps } from '../../navigation/types';
import type { Item } from '../../types/item';

function ListDetailContent({ route, navigation }: ListDetailProps) {
  const { listId, listName } = route.params;
  const [showChecked, setShowChecked] = useState(true);

  const { data: allItems = [], isLoading } = useItemsQuery(listId);
  const { data: lists = [] } = useListsQuery();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  const currentList = lists.find((l) => l.id === listId);
  const remoteListId = currentList?.remoteId ?? null;

  const unchecked = allItems.filter((i) => !i.checked);
  const checked = allItems.filter((i) => i.checked);

  const handleToggle = (item: Item) => {
    updateItem.mutate({
      item,
      input: { checked: !item.checked },
      remoteListId,
    });
  };

  const handleEdit = (item: Item) => {
    navigation.navigate('AddEditItem', {
      listId,
      remoteListId,
      itemId: item.id,
    });
  };

  const handleDelete = (item: Item) => {
    deleteItem.mutate({ item, remoteListId });
  };

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <ActivityIndicator color="#3B82F6" style={styles.loader} />
      ) : allItems.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No items yet"
          subtitle="Tap ADD to add your first item"
        />
      ) : (
        <FlatList
          data={[
            ...unchecked,
            ...(showChecked ? checked : []),
          ]}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            checked.length > 0 ? (
              <TouchableOpacity
                style={styles.checkedHeader}
                onPress={() => setShowChecked((v) => !v)}
              >
                {showChecked
                  ? <ChevronDown size={16} color="#A1A1AA" strokeWidth={2} />
                  : <ChevronRight size={16} color="#A1A1AA" strokeWidth={2} />}
                <Text style={styles.checkedHeaderText}>
                  Checked items ({checked.length})
                </Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              onToggle={() => handleToggle(item)}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddEditItem', { listId, remoteListId })}
        activeOpacity={0.85}
      >
        <Plus size={18} color="#FAFAFA" strokeWidth={2.5} />
        <Text style={styles.addButtonText}>ADD</Text>
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
  container: { flex: 1, backgroundColor: '#09090B' },
  loader: { flex: 1 },
  list: { paddingBottom: 100 },
  checkedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#09090B',
  },
  checkedHeaderText: { color: '#A1A1AA', fontSize: 14, fontWeight: '600' },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 9999,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addButtonText: { color: '#FAFAFA', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/ListDetail/index.tsx
git commit -m "feat: update ListDetail with Lucide icons in FAB and EmptyState"
```

---

## Final Verification

- [ ] Start Expo dev server:
  ```bash
  npx expo start
  ```
- [ ] Press `a` (Android) or `i` (iOS) to open the app
- [ ] **ListsHome:** Title shows "Lists". FAB shows Plus icon + "NEW LIST". Tab bar shows pill highlight on Lists tab.
- [ ] **ListDetail:** FAB shows Plus icon + "ADD". Checked items section toggle shows ChevronDown/ChevronRight icon.
- [ ] **ItemRow:** Toggle an item — unchecked shows blue `Square`, checked shows green `CheckSquare` + strikethrough text + muted opacity.
- [ ] **ListCard:** Progress bar is green pill shape. Completion percentage shown below bar.
- [ ] **EmptyState:** Open an empty list — Lucide icon in circular badge, no emoji.
- [ ] **Tab bar:** Tap Settings tab — Settings tab gets blue pill, Lists tab goes gray.
- [ ] **No emoji anywhere** in the UI (search the screen visually).
