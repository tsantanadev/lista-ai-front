# Lista AI Mobile — UI Redesign Spec

**Date:** 2026-04-03  
**Status:** Approved

## Context

The current mobile app UI uses emoji icons and a plain bottom tab bar, which feel visually inconsistent and low-quality. The goal is to bring the app in line with the `design.pen` Penpot mockup: flat SVG icons via Lucide, a pill-shaped tab bar, polished cards and rows, and consistent spacing/typography throughout.

The existing dark color palette (`#09090B` background, `#3B82F6` primary, `#22C55E` success, etc.) already matches the design — only component-level visual details need updating.

## Approach

**Option B — Custom NativeWind components in-place.** Upgrade existing components surgically without introducing a component library. The only new dependency is `lucide-react-native` (with `react-native-svg` as its peer, which Expo likely already provides).

## Changes

### Dependencies

- Add `lucide-react-native` to `package.json`
- Add `react-native-svg` if not already present (check `package.json` first — Expo includes it)

### Tab Bar (`src/navigation/MainTabs.tsx`)

Replace emoji tab icons with Lucide `List` and `Settings` icons. Implement pill-style active tab: the active tab gets a `#3B82F6` rounded pill background with white label; inactive tabs show gray icon + label with no background.

### `ListCard.tsx`

- Increase title font size from 14px → 16px
- Add `border: 1px solid #27272A` to the card container
- Change progress bar `borderRadius` to `9999` (full pill)
- Add completion percentage text below the progress bar (`color: #71717A`, 11px)
- Format count as `"3 / 6"` (spaced) instead of `"3/6"`

### `ItemRow.tsx`

- Replace checkbox (custom or emoji) with Lucide `Square` (unchecked, stroke `#3B82F6`) and `CheckSquare` (checked, stroke `#22C55E`)
- Replace trash emoji `🗑️` with Lucide `Trash2` icon (stroke `#71717A`, muted when checked)
- Add `border: 1px solid #27272A` to the row container
- Checked row: reduce opacity to 0.6, strikethrough on description text, mute all secondary text

### `EmptyState.tsx`

- Change `icon` prop type from `string` (emoji) to `React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>` (Lucide icon component)
- Wrap icon in a circular badge: `background: #27272A`, `borderRadius: 9999`, padding `18px`; render as `<Icon size={32} color="#71717A" strokeWidth={1.5} />`
- Update callers in `ListsHome` and `ListDetail` to pass Lucide components: `icon={ClipboardList}` and `icon={ShoppingCart}`

### `SyncStatusBar.tsx`

- Replace any emoji or text-only sync indicators with Lucide `Wifi`, `WifiOff`, and `RefreshCw` icons

### `ListsHome` (`src/screens/ListsHome/index.tsx`)

- Increase "Lists" title font size to 28–30px (font weight 700)
- Replace FAB `"+"` text with Lucide `Plus` icon (white, 18px)

### `ListDetail` (`src/screens/ListDetail/index.tsx`)

- Replace back button text/arrow with Lucide `ArrowLeft` icon
- Replace FAB `"+ADD"` text with Lucide `Plus` icon

### `AddEditList` / `AddEditItem` (`src/screens/AddEdit*.tsx`)

- Replace close/dismiss button with Lucide `X` icon
- Polish text inputs: add `border: 1px solid #27272A`, `borderRadius: 8`, consistent padding

## Design Tokens (unchanged)

| Token | Value | Usage |
|---|---|---|
| bg | `#09090B` | Screen backgrounds |
| card | `#18181B` | Cards, modals, tab bar |
| border | `#27272A` | Card/row borders |
| primary | `#3B82F6` | Active tab pill, FAB, unchecked checkbox stroke |
| green | `#22C55E` | Checked checkbox, progress bar fill |
| destructive | `#EF4444` | Delete actions |
| text-primary | `#FAFAFA` | Main text |
| text-secondary | `#A1A1AA` | Labels, counts |
| text-muted | `#71717A` | Completion %, checked item text |

## Verification

1. `cd lista-ai-mobile && npx expo start` — visually verify all 4 screens (ListsHome, ListDetail, AddEditList, AddEditItem) and Settings
2. Confirm tab bar shows pill highlight on active tab
3. Confirm no emoji appears anywhere in the UI
4. Toggle a list item checked — verify strikethrough + muted opacity + green CheckSquare
5. Open an empty list — verify Lucide icon in EmptyState (no emoji)
6. Trigger sync error (disconnect network) — verify SyncStatusBar shows Lucide icon
