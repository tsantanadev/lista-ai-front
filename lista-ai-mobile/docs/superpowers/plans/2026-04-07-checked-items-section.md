# Checked Items Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user checks an item in ListDetail, it moves to a collapsible "checked" section below all unchecked items.

**Architecture:** Replace the `FlatList` in `ListDetail/index.tsx` with a `SectionList` that splits `allItems` into two sections — unchecked first, checked second. The checked section's `renderSectionHeader` renders the collapsible toggle row. Local `checkedVisible` state (default `true`) controls whether the checked section data is passed as a full array or empty array. No other files are modified.

**Tech Stack:** React Native `SectionList`, TypeScript, existing `ItemRow` component, `lucide-react-native` icons (ChevronDown / ChevronUp).

---

### Task 1: Split items and wire up SectionList sections

**Files:**
- Modify: `src/screens/ListDetail/index.tsx`

- [ ] **Step 1: Add `checkedVisible` state and derive section data**

  In `ListDetailContent`, add after the existing hook calls:

  ```tsx
  const [checkedVisible, setCheckedVisible] = React.useState(true);

  const uncheckedItems = allItems.filter((i) => !i.checked);
  const checkedItems   = allItems.filter((i) => i.checked);
  ```

- [ ] **Step 2: Build the `sections` array**

  Add directly after the two derived arrays:

  ```tsx
  type Section = { title: 'unchecked' | 'checked'; data: Item[] };

  const sections: Section[] = [
    { title: 'unchecked', data: uncheckedItems },
    ...(checkedItems.length > 0
      ? [{ title: 'checked' as const, data: checkedVisible ? checkedItems : [] }]
      : []),
  ];
  ```

- [ ] **Step 3: Replace `FlatList` with `SectionList`**

  Update the import line at the top of the file — add `SectionList` and remove `FlatList`:

  ```tsx
  import {
    View,
    SectionList,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
  } from 'react-native';
  ```

  Replace the `FlatList` JSX block (currently inside the `allItems.length === 0 ? ... : (...)` branch) with:

  ```tsx
  <SectionList
    sections={sections}
    keyExtractor={(item) => String(item.id)}
    renderItem={({ item }) => (
      <ItemRow
        item={item}
        onToggle={() => handleToggle(item)}
        onEdit={() => handleEdit(item)}
        onDelete={() => handleDelete(item)}
      />
    )}
    renderSectionHeader={({ section }) => {
      if (section.title !== 'checked') return null;
      return (
        <TouchableOpacity
          style={styles.sectionToggle}
          onPress={() => setCheckedVisible((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionToggleText}>
            ({checkedItems.length}){' '}
            {checkedVisible ? 'Hide checked items' : 'Show checked items'}{' '}
            {checkedVisible ? '∧' : '∨'}
          </Text>
        </TouchableOpacity>
      );
    }}
    contentContainerStyle={styles.list}
    ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
    stickySectionHeadersEnabled={false}
  />
  ```

- [ ] **Step 4: Add styles for the toggle row**

  Append to the `StyleSheet.create({...})` call:

  ```tsx
  sectionToggle: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#0F2E28',
    marginTop: 6,
    marginBottom: 2,
  },
  sectionToggleText: {
    color: '#1D9E75',
    fontSize: 13,
  },
  ```

- [ ] **Step 5: Run TypeScript check**

  ```bash
  cd lista-ai-mobile && npm run typecheck
  ```

  Expected: no errors.

- [ ] **Step 6: Run lint**

  ```bash
  npm run lint
  ```

  Expected: no errors or warnings introduced by this change.

- [ ] **Step 7: Commit**

  ```bash
  git add lista-ai-mobile/src/screens/ListDetail/index.tsx
  git commit -m "feat: move checked items to collapsible section in ListDetail"
  ```

---

## Edge Cases Covered by This Plan

| Scenario | Behaviour |
|---|---|
| No items at all | `EmptyState` shown; `SectionList` never rendered (existing guard unchanged) |
| Only unchecked items | `checkedItems.length === 0` → checked section not added to `sections`; no toggle row |
| Only checked items | `uncheckedItems` is `[]`; `SectionList` renders toggle row + checked items only |
| Unchecking an item | Item moves to unchecked section automatically via re-derived arrays on re-render |
| Navigating away and back | `checkedVisible` state resets to `true` (default) |
