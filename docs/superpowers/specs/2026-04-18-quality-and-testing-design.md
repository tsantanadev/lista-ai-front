# Quality & Testing — lista-ai-mobile

**Date:** 2026-04-18
**Scope:** lista-ai-front / lista-ai-mobile (React Native / Expo)
**Goal:** Establish test coverage (unit, component, E2E), fix existing code quality issues, and add a CI pipeline before pushing to GitHub.

---

## 1. Code Quality Fixes

Three targeted changes, no new features.

### 1.1 Remove unused import in `executor.ts`
`shouldOverwrite` is imported from `src/sync/conflict.ts` but never called in `src/sync/executor.ts`. Remove the import. The function itself stays in `conflict.ts` — it is correct and will be covered by unit tests.

### 1.2 Fix `any` cast in `executor.ts`
Line 21 passes `entry.operation as any` into typed sync functions. Replace with `entry.operation as SyncOperation` (the type already exists in `src/types/sync.ts`), eliminating the unsafe cast.

### 1.3 Input validation on forms
`AddEditList` and `AddEditItem` screens currently allow submitting an empty name/description. Fix: trim the input value and keep the submit button disabled (or surface an inline error message) while the field is blank.

---

## 2. Test Setup

### 2.1 Dependencies

| Package | Purpose |
|---------|---------|
| `jest-expo` | Expo-aware Jest preset — handles RN transforms |
| `@testing-library/react-native` | Component rendering and user interaction |
| `@testing-library/jest-native` | Custom matchers (`toBeVisible`, `toHaveTextContent`, …) |
| `@types/jest` | TypeScript support for Jest globals |

### 2.2 Jest configuration (in `package.json`)

```json
"scripts": {
  "test": "jest"
},
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
  ]
}
```

### 2.3 Mocking strategy

All native modules are mocked at the Jest module level so tests run in Node without a simulator:

- `expo-secure-store` — mocked with in-memory map
- `expo-sqlite` / Drizzle (`src/db`) — mocked; individual tests inject controlled return values
- `src/api/*` — mocked with `jest.fn()` per test file
- `@react-native-community/netinfo` — mocked to return online by default

---

## 3. Unit Tests

One test file per module. All database and API calls are mocked.

| Module | Scenarios covered |
|--------|------------------|
| `src/sync/conflict.ts` | `shouldOverwrite`: remote newer → true; local newer → false; remote undefined → false |
| `src/utils/date.ts` | `now()` returns a number; increases monotonically |
| `src/utils/id.ts` | `generateLocalId()` returns a negative integer; successive calls return distinct values |
| `src/sync/queue.ts` | `enqueue` inserts a row; `getPending` returns rows ordered by `createdAt`; `remove` deletes the row; `incrementRetry` increments count and sets `lastError`; `markFailed` sets `retryCount` to -1 |
| `src/sync/executor.ts` | `executeSync` skips entries with `retryCount === -1`; routes `list/create` to `createList` API; routes `item/update` to `updateItem` API; calls `incrementRetry` on failure; calls `markFailed` after 5th failure; background refresh upserts remote lists |
| `src/auth/store.ts` | `register` saves tokens and sets `isAuthenticated`; `loginLocal` updates state on success, sets error on failure; `loginGoogle` extracts user from id_token; `refreshTokens` calls apiRefresh and persists new tokens; `logout` calls apiLogout and clears state; `hydrate` restores state from SecureStore |

---

## 4. Component Tests

Rendered with RNTL. Navigation and store dependencies are wrapped or mocked per test.

| Component / Screen | Scenarios covered |
|-------------------|------------------|
| `components/ListCard` | Renders list name; calls `onPress` when tapped |
| `components/ItemRow` | Renders description; checked state toggles on press |
| `screens/Login` | Fields are present; submit calls `loginLocal`; error message appears on failure |
| `screens/Register` | Submit disabled when fields are empty; calls `register` on valid input; shows error on conflict |
| `screens/ListsHome` | Shows `EmptyState` when no lists; renders a `ListCard` per list item |
| `screens/AddEditList` | Submit button disabled when name is blank; calls `useCreateList` mutation on valid submit |

---

## 5. Maestro E2E

Flows live in `e2e/` at the `lista-ai-front` repo root. Run locally with `maestro test e2e/` against a simulator running Expo Go.

### `e2e/auth.yaml`
1. Launch app
2. Navigate to Register screen
3. Enter valid email, password, name → submit
4. Assert home screen is visible
5. Logout → assert login screen is visible
6. Login with same credentials → assert home screen is visible again

### `e2e/shopping.yaml`
1. Register (fresh account)
2. Create a list → assert it appears in the list
3. Tap the list → add an item → assert it appears
4. Check the item → assert checked visual state
5. Delete the item → assert it is removed
6. Delete the list → assert home is empty

### CI note
Maestro E2E flows are **not** part of the GitHub Actions pipeline. Running a simulator on GHA is expensive and flaky. Flows are committed to the repo and run locally before release. The CI YAML will include a comment documenting this decision.

---

## 6. GitHub Actions CI

File: `.github/workflows/ci.yml` (in the `lista-ai-front` repo root).
Triggers: push and pull request to `main`.

Three jobs run in parallel:

| Job | Command | Fails on |
|-----|---------|---------|
| `typecheck` | `npm run typecheck` | any TypeScript error |
| `lint` | `npm run lint` | any ESLint error |
| `test` | `npm test -- --coverage` | any failing test |

All jobs: `ubuntu-latest`, Node 20, `node_modules` cached via `actions/cache`. No secrets required — all dependencies are mocked.

---

## Out of Scope

- Backend (`lista-ai`) — separate repo, not touched here
- Drizzle schema changes — no schema modifications in this work
- New features or UI changes beyond the form validation fix
