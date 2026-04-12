# Lista AI Mobile

Offline-first shopping list app built with React Native + Expo.

## Getting started

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env
# Edit .env and set EXPO_PUBLIC_API_BASE_URL

# Start dev server
npx expo start
```

On a **physical device**, replace `localhost` in `.env` with your machine's local IP (e.g. `192.168.x.x`).

The app requires the [Lista AI REST API](../../lista-ai/) running at the configured base URL:

```bash
# From lista-ai/
docker-compose up -d
./gradlew bootRun
```

## Commands

| Command | Description |
|---------|-------------|
| `npx expo start` | Start Expo dev server |
| `npx expo start --android` | Open on Android emulator |
| `npx expo start --ios` | Open on iOS simulator |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | Lint |
| `npm run db:generate` | Generate Drizzle migrations after schema changes |
| `npm run db:studio` | Browse SQLite data visually |

## Architecture

See [CLAUDE.md](./CLAUDE.md) for full architecture documentation.

## Theming

The app supports **light**, **dark**, and **system** (device default) themes. The user's preference is persisted in AsyncStorage and restored on app start.

### How it works

1. `src/theme/colors.ts` — defines `darkColors` and `lightColors` token objects.
2. `src/theme/ThemeContext.tsx` — `ThemeProvider` resolves the active palette and exposes it via `useTheme()`.
3. `ThemeProvider` wraps the whole app in `App.tsx`.

### Using the theme in a component

```tsx
import { useTheme } from '../../theme/ThemeContext';

export function MyComponent() {
  const { theme } = useTheme();

  return (
    <View style={{ backgroundColor: theme.background }}>
      <Text style={{ color: theme.textPrimary }}>Hello</Text>
    </View>
  );
}
```

### Token reference

| Token | Purpose |
|-------|---------|
| `background` | Screen background |
| `surface` | Card / list item background |
| `surfaceElevated` | Bottom sheets, tab bar, auth form backgrounds |
| `border` | Card and input borders |
| `borderSubtle` | Dividers, modal borders |
| `progressTrack` | Progress bar track |
| `dragHandle` | Bottom sheet drag handle |
| `primary` | Teal brand color `#1D9E75` |
| `primaryDark` | Darker teal for pressed states |
| `accent` | Orange accent `#EF9F27` |
| `neutral` | Secondary text, icons, muted elements |
| `placeholder` | TextInput placeholder text |
| `textPrimary` | Primary text |
| `destructive` | Error / delete actions `#EF4444` |

### Changing the user's preference

```tsx
const { preference, setPreference } = useTheme();
// preference: 'system' | 'light' | 'dark'
await setPreference('light');
```
