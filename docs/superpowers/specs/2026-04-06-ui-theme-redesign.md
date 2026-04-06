# Lista AI Mobile — UI Theme Redesign

**Date:** 2026-04-06
**Status:** Approved

---

## Context

The current app uses a blue-grey dark palette (`#09090B` / `#3B82F6`) that doesn't reflect the brand identity. This redesign applies a **neutral-base dark theme with teal primary and amber accent**, updates all screens to match the `design.pen` layout, introduces `react-native-reusables` components selectively, and adds a UOM (unit of measure) field to items with a quantity stepper.

---

## Design Tokens

| Token | Value | Usage |
|---|---|---|
| `bg` | `#111210` | Screen backgrounds |
| `surface` | `#1A1C1A` | Cards, modals, tab bar, bottom sheet |
| `border` | `#0F2E28` | Card/input borders |
| `progressTrack` | `#222420` | Progress bar background |
| `primary` | `#1D9E75` | FAB, active chip, checkbox, progress fill, tab pill, "Concluído", back arrow |
| `accent` | `#EF9F27` | Qty + UOM display in item rows |
| `neutral` | `#888780` | Secondary / muted text, inactive tab |
| `textPrimary` | `#EEF2F0` | All primary text |
| `destructive` | `#EF4444` | Delete actions (unchanged) |

---

## Color Mapping (old → new)

| Old | New |
|---|---|
| `#09090B` bg | `#111210` |
| `#18181B` card | `#1A1C1A` |
| `#27272A` border | `#0F2E28` |
| `#3B82F6` primary | `#1D9E75` |
| `#22C55E` success/checked | `#1D9E75` |
| `#A1A1AA` text-secondary | `#888780` |
| `#71717A` text-muted | `#888780` |
| `#FAFAFA` text-primary | `#EEF2F0` |

---

## Data Model Changes

### `items` table (`src/db/schema.ts`)
- Change `quantity` from `text` to `real` (numeric, nullable)
- Add `uom` as `text` (nullable) — stores selected unit or custom text

### `Item` type (`src/types/item.ts`)
- `quantity: number | null` (was `string | null`)
- Add `uom: string | null`

### `ItemInput` type
- `quantity?: number` (was `string`)
- Add `uom?: string`
- Remove `price` from input (column kept in DB for existing data, not editable from UI)

### Migration
- New Drizzle migration: `ALTER TABLE items ADD COLUMN uom TEXT` + change quantity column type
- Run `npm run db:generate` after schema changes

---

## Screen Changes

### `tailwind.config.js`
Replace entire color palette with new tokens.

### `src/navigation/MainTabs.tsx`

- **3 tabs**: Listas (List icon), Compras (ShoppingCart icon), Perfil (User icon)
- Tab bar background: `#161A18`, top border: `#1A2420`
- **Active tab**: icon wrapped in 52×52 rounded-square container (`borderRadius: 14`, `background: rgba(29,158,117,0.15)`, `border: 1.5px solid #1D9E75`), teal icon stroke, bold white label below
- **Inactive tab**: plain icon (stroke `#888780`), muted label — no container
- Compras and Perfil screens: "Coming soon" placeholder (same pattern as current Settings)

### `src/screens/ListsHome/index.tsx`
- `ActivityIndicator` color: `#1D9E75`
- FAB: `backgroundColor: #1D9E75`, `borderRadius: 12` (was `9999`)

### `src/screens/ListDetail/index.tsx`
- Remove price display from item rows
- Item row qty+UOM shown in amber (`#EF9F27`) as `"{qty} {uom}"` when set
- FAB: same square-rounded style as ListsHome

### `src/screens/AddEditList/index.tsx`
- Replace Save/Cancel layout with: X button top-right + single full-width Save button
- Input border: `#0F2E28`, focus border: `#1D9E75`
- Save button: `backgroundColor: #1D9E75`, `borderRadius: 12`

### `src/screens/AddEditItem/index.tsx`
**Complete redesign** matching `design.pen`:
- Bottom sheet style: `#1A1C1A` background, `borderRadius: 20` top corners, drag handle
- Header: camera icon (Lucide `Camera`, `#1D9E75`) · **Detalhes** title · **Concluído** teal text button (saves + closes)
- No X button, no Save button at bottom — "Concluído" is the single save action
- Description: full-width `TextInput`, green focus border
- Quantity + Unit row:
  - **Quantidade** label + numeric `TextInput` (decimal-pad) with `⊗` clear button
  - **Unidade** label + text `TextInput` (custom UOM) with `⊗` clear button
  - Two rounded-square (`borderRadius: 10`) teal `±` buttons (44×44)
  - `±` step logic: integer value → step 1; decimal value → step 0.1
- UOM chip row: `UNIDADE` label + 5 equal chips: **g · kg · L · ml · un**
  - Selecting a chip fills the Unit input; typing in Unit input clears chip selection
  - Active chip: `backgroundColor: #1D9E75`, white bold text
  - Inactive chip: `backgroundColor: #111210`, border `#0F2E28`, muted text
- Price field removed from UI

### `src/components/ListCard.tsx`
- Card bg: `#1A1C1A`, border: `#0F2E28`
- Title color: `#EEF2F0`
- Count color: `#888780`
- Progress track: `#222420`, fill: `#1D9E75`
- Completion % color: `#888780`

### `src/components/ItemRow.tsx`
- Row bg: `#1A1C1A`, border: `#0F2E28`
- Unchecked checkbox border: `#1D9E75`
- Checked checkbox fill: `#1D9E75`
- Qty+UOM display: `color: #EF9F27` (amber), format `"{qty} {uom}"`
- Remove price display
- Checked row opacity: 0.5, strikethrough on description

### `src/components/EmptyState.tsx`
- Badge bg: `#1A1C1A`, border: `#0F2E28`
- Icon color: `#888780`

### `src/components/SyncStatusBar.tsx`
- Background: `#1A1C1A`, border-bottom: `#0F2E28`
- Synced dot: `#1D9E75`
- Text: `#888780`

---

## react-native-reusables Components

Install via `npx @react-native-reusables/cli@latest add <component>`:

| Component | Used in |
|---|---|
| `button` | FAB (ListsHome, ListDetail), Save (AddEditList), Concluído (AddEditItem) |
| `input` | Description, custom UOM (AddEditItem), list name (AddEditList) |
| `label` | Form field labels in AddEditList / AddEditItem |
| `progress` | Progress bar in ListCard |

---

## Verification

1. `cd lista-ai-mobile && npx expo start`
2. **ListsHome**: teal FAB with square corners, teal progress bars, no blue anywhere
3. **ListDetail**: no price column, qty+UOM in amber (e.g. `2 kg`), teal checkboxes
4. **AddEditItem**: bottom sheet opens, Concluído saves, ± buttons step correctly, chip selection fills unit field, custom unit clears chip
5. **AddEditList**: X top-right dismisses, single Save button works
6. **Settings**: teal active tab, neutral-dark background
7. Toggle item checked → teal filled checkbox, 50% opacity, strikethrough
8. Create item with decimal qty (e.g. `1.5 kg`) → ± steps by 0.1
