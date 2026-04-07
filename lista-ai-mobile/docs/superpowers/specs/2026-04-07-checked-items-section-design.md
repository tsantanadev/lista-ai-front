# Checked Items Section — Design Spec

**Date:** 2026-04-07  
**Status:** Approved

## Overview

When a user checks an item in the `ListDetail` screen, it moves to a separate collapsible section below all unchecked items. The section can be hidden or shown by tapping a toggle row.

## Behaviour

- **Checked item moves down:** Checking an item removes it from the unchecked group and places it at the bottom of the checked group (below the toggle row).
- **Unchecking moves it back:** Unchecking an item returns it to the unchecked group at the top.
- **Default state:** Checked section is expanded.
- **Toggle persists in-session only:** Collapse state is local React state; it resets when navigating away. No persistence needed.
- **No checked items:** The section header (toggle row) is not rendered at all.
- **All items checked:** The unchecked section is empty; only the toggle row and checked items are shown.

## Toggle Row Labels

| State    | Label                        |
|----------|------------------------------|
| Expanded | `(N) Hide checked items ∧`   |
| Collapsed| `(N) Show checked items ∨`   |

Where `N` is the count of checked items.

## Architecture

**Approach:** Replace the `FlatList` in `ListDetail` with React Native's `SectionList`. Two sections are derived from `allItems`:

1. **Unchecked section** — items where `checked === false`, no section header.
2. **Checked section** — items where `checked === true`, section header is the toggle row.

The checked section's `renderSectionHeader` renders the toggle row. When collapsed, the checked section's data is passed as an empty array so `SectionList` renders nothing below the header.

## Files Changed

| File | Change |
|------|--------|
| `src/screens/ListDetail/index.tsx` | Replace `FlatList` with `SectionList`; add `checkedVisible` state; derive two sections from `allItems`; add toggle row rendered via `renderSectionHeader` |

## Files Unchanged

All other files remain untouched:
- `src/components/ItemRow.tsx` — no changes; card-style rows keep their existing styling
- `src/components/EmptyState.tsx` — no changes
- All hooks, store, sync, API, DB layers — no changes

## Toggle Row Style

- Full-width touchable row
- Centered text, color `#1D9E75`
- Font size 13, matching the existing muted label style
- Top and bottom `1px` borders using color `#0F2E28`

## Edge Cases

- **Empty list (no items at all):** `EmptyState` shown as before; `SectionList` is not rendered.
- **Only checked items:** Unchecked section data is `[]`; `SectionList` renders only the toggle row and checked items.
- **Only unchecked items:** Checked section is not added to the sections array; no toggle row shown.
