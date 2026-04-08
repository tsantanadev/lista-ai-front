# Google OAuth2 Authentication — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Login, Register, Profile, and Profile Info screens in the React Native/Expo frontend, with Google OAuth2 and local email/password auth wired to the existing Spring Boot backend.

**Architecture:** The client completes Google OAuth2 via `expo-auth-session/providers/google`, extracts the `id_token`, and POSTs it to `POST /v1/auth/google`. All auth flows return a JWT access token + opaque refresh token persisted via `expo-secure-store`. An Axios interceptor attaches `Bearer` to every request and silently refreshes on 401. RootStack conditionally renders AuthStack (Login/Register) when unauthenticated, MainTabs otherwise. PerfilInfo is pushed from the root-level stack so the tab bar is hidden.

**Tech Stack:** React Native + Expo SDK 54, TypeScript, Zustand (auth state), Axios (with interceptors), expo-secure-store, expo-auth-session (Google PKCE flow), NativeWind not used for auth screens (StyleSheet.create for precise color matching).

> **No test infrastructure exists in this project.** Verification for each task is `npm run typecheck` (TypeScript errors) + manual Expo dev server testing. No Jest tasks are included.

---

## Backend API Reference

All endpoints are at `EXPO_PUBLIC_API_BASE_URL` (default `http://localhost:8080`).

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/v1/auth/register` | `{email, password, name}` | `{accessToken, refreshToken, expiresIn}` |
| POST | `/v1/auth/login` | `{email, password}` | `{accessToken, refreshToken, expiresIn}` |
| POST | `/v1/auth/google` | `{idToken}` | `{accessToken, refreshToken, expiresIn}` |
| POST | `/v1/auth/refresh` | `{refreshToken}` | `{accessToken, refreshToken, expiresIn}` |
| POST | `/v1/auth/logout` | `{refreshToken}` | 204 |

Protected endpoints require `Authorization: Bearer <accessToken>`.

The JWT access token contains `sub` (userId) and `email` claims but NOT `name`. The user's `name` must be captured from the registration form or decoded from the Google `id_token`.

---

## Color Palette (auth screens)

These match the existing app theme observed in `MainTabs.tsx` and `Perfil/index.tsx`:

```typescript
const C = {
  bg:          '#111210',
  surface:     '#161A18',
  border:      '#1A2420',
  primary:     '#1D9E75',
  primaryDark: '#16785A',
  text:        '#EEF2F0',
  textSub:     '#888780',
  textMuted:   '#556B5E',
  danger:      '#EF4444',
} as const;
```

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `src/auth/storage.ts` | expo-secure-store wrappers: save/load/clear tokens and user info |
| `src/auth/store.ts` | Zustand auth slice: user, tokens, isAuthenticated, login/logout actions |
| `src/api/auth.ts` | Axios calls: register, login, google, refresh, logout |
| `src/navigation/AuthStack.tsx` | Unauthenticated stack: Login → Register |
| `src/screens/Login/index.tsx` | Login screen |
| `src/screens/Register/index.tsx` | Register screen |
| `src/screens/PerfilInfo/index.tsx` | Profile Info screen |

### Modified Files

| File | Change |
|------|--------|
| `src/api/client.ts` | Add request interceptor (Bearer token) + response interceptor (401 → silent refresh) |
| `src/navigation/RootStack.tsx` | Auth-aware: AuthStack vs (MainTabs + PerfilInfo) based on `isAuthenticated` |
| `src/navigation/types.ts` | Add `AuthStackParamList`, `RootStackParamList`, `PerfilInfoProps` |
| `src/screens/Perfil/index.tsx` | Replace "Coming soon" with actual profile UI |
| `App.tsx` | Load persisted auth state before rendering (add to startup sequence) |

---

## Pre-requisite: Google Cloud Setup (manual, one-time)

Before running the app with Google sign-in, you must configure OAuth credentials:

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable "Google Sign-In" / OAuth consent screen
3. Create OAuth 2.0 credentials:
   - **Web application** client ID (used by Expo Go and the backend audience check)
   - **Android** client ID (use SHA-1 from `expo credentials:manager`)
   - **iOS** client ID (use your bundle ID)
4. Add to `.env`:
   ```
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
   ```
5. Set the same web client ID in `GOOGLE_CLIENT_ID` env var on the backend (required for the backend's audience check in `GoogleAuthProvider.java`).
6. In `app.json`, add a scheme:
   ```json
   { "expo": { "scheme": "listai" } }
   ```

For **Expo Go development**, only `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is needed (Expo Go uses its own scheme).

---

## Task 1: Install dependencies

**Files:** `package.json`, `app.json`

- [ ] **Step 1: Install packages**

```bash
cd lista-ai-mobile
npx expo install expo-secure-store expo-auth-session expo-web-browser expo-crypto
```

- [ ] **Step 2: Add scheme to app.json**

Open `app.json`. Add `"scheme": "listai"` inside the `"expo"` object:

```json
{
  "expo": {
    "name": "lista-ai-mobile",
    "scheme": "listai",
    ...
  }
}
```

- [ ] **Step 3: Verify TypeScript resolves new packages**

```bash
npm run typecheck
```

Expected: no errors related to the new packages.

- [ ] **Step 4: Commit**

```bash
git add app.json package.json
git commit -m "feat(auth): install expo-secure-store, expo-auth-session, expo-web-browser"
```

---

## Task 2: Auth token storage (`src/auth/storage.ts`)

Wraps `expo-secure-store` with typed keys. Used by the auth store and the Axios interceptor.

**Files:**
- Create: `src/auth/storage.ts`

- [ ] **Step 1: Create `src/auth/storage.ts`**

```typescript
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  accessToken:  'auth.accessToken',
  refreshToken: 'auth.refreshToken',
  userName:     'auth.userName',
  userEmail:    'auth.userEmail',
  userId:       'auth.userId',
} as const;

export type StoredUser = {
  id: string;
  name: string;
  email: string;
};

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
};

export async function saveAuth(tokens: StoredTokens, user: StoredUser): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.accessToken,  tokens.accessToken),
    SecureStore.setItemAsync(KEYS.refreshToken, tokens.refreshToken),
    SecureStore.setItemAsync(KEYS.userName,     user.name),
    SecureStore.setItemAsync(KEYS.userEmail,    user.email),
    SecureStore.setItemAsync(KEYS.userId,       user.id),
  ]);
}

export async function loadAuth(): Promise<{ tokens: StoredTokens; user: StoredUser } | null> {
  const [accessToken, refreshToken, name, email, id] = await Promise.all([
    SecureStore.getItemAsync(KEYS.accessToken),
    SecureStore.getItemAsync(KEYS.refreshToken),
    SecureStore.getItemAsync(KEYS.userName),
    SecureStore.getItemAsync(KEYS.userEmail),
    SecureStore.getItemAsync(KEYS.userId),
  ]);
  if (!accessToken || !refreshToken || !email || !id) return null;
  return {
    tokens: { accessToken, refreshToken },
    user:   { id, name: name ?? email.split('@')[0], email },
  };
}

export async function clearAuth(): Promise<void> {
  await Promise.all(
    Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)),
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/auth/storage.ts
git commit -m "feat(auth): add secure token storage helpers"
```

---

## Task 3: Auth API module (`src/api/auth.ts`)

Pure Axios calls. Consumed by the auth store actions and the Axios refresh interceptor.

**Files:**
- Create: `src/api/auth.ts`

- [ ] **Step 1: Create `src/api/auth.ts`**

```typescript
import { apiClient } from './client';

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export async function apiRegister(
  email: string,
  password: string,
  name: string,
): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/v1/auth/register', {
    email,
    password,
    name,
  });
  return data;
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/v1/auth/login', {
    email,
    password,
  });
  return data;
}

export async function apiGoogleAuth(idToken: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/v1/auth/google', {
    idToken,
  });
  return data;
}

export async function apiRefresh(refreshToken: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/v1/auth/refresh', {
    refreshToken,
  });
  return data;
}

export async function apiLogout(refreshToken: string): Promise<void> {
  await apiClient.post('/v1/auth/logout', { refreshToken });
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/api/auth.ts
git commit -m "feat(auth): add auth API module (register, login, google, refresh, logout)"
```

---

## Task 4: Auth Zustand store (`src/auth/store.ts`)

Centralises auth state. Persists tokens via `storage.ts`. Exposes typed actions consumed by screens and the Axios interceptor.

**Files:**
- Create: `src/auth/store.ts`

- [ ] **Step 1: Create `src/auth/store.ts`**

```typescript
import { create } from 'zustand';
import { saveAuth, loadAuth, clearAuth, StoredUser } from './storage';
import { apiRegister, apiLogin, apiGoogleAuth, apiRefresh, apiLogout } from '../api/auth';

/** Decode a JWT payload without verifying the signature (safe for client-side display). */
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

/** Decode a Google id_token to extract name and email. */
function extractGoogleUser(idToken: string): { name: string; email: string } {
  const payload = decodeJwtPayload(idToken);
  return {
    name:  (payload['name']  as string) ?? '',
    email: (payload['email'] as string) ?? '',
  };
}

export type AuthUser = StoredUser;

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean; // true during initial hydration from storage
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
};

type AuthActions = {
  hydrate: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginLocal: (email: string, password: string) => Promise<void>;
  loginGoogle: (googleIdToken: string) => Promise<void>;
  refreshTokens: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  // Called by interceptor to inject a new access token after a silent refresh
  _setAccessToken: (token: string) => void;
};

export const useAuthStore = create<AuthState & AuthActions>()((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  accessToken: null,
  refreshToken: null,
  error: null,

  hydrate: async () => {
    try {
      const stored = await loadAuth();
      if (stored) {
        set({
          isAuthenticated: true,
          accessToken: stored.tokens.accessToken,
          refreshToken: stored.tokens.refreshToken,
          user: stored.user,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  register: async (email, password, name) => {
    set({ error: null });
    try {
      const tokens = await apiRegister(email, password, name);
      const payload = decodeJwtPayload(tokens.accessToken);
      const user: AuthUser = {
        id:    String(payload['sub'] ?? ''),
        email: (payload['email'] as string) ?? email,
        name,
      };
      await saveAuth(tokens, user);
      set({ isAuthenticated: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Erro ao criar conta. Tente novamente.';
      set({ error: msg });
      throw e;
    }
  },

  loginLocal: async (email, password) => {
    set({ error: null });
    try {
      const tokens = await apiLogin(email, password);
      const payload = decodeJwtPayload(tokens.accessToken);
      const storedUser = await loadAuth();
      const user: AuthUser = {
        id:    String(payload['sub'] ?? ''),
        email: (payload['email'] as string) ?? email,
        name:  storedUser?.user.email === email ? (storedUser.user.name ?? email.split('@')[0]) : email.split('@')[0],
      };
      await saveAuth(tokens, user);
      set({ isAuthenticated: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Credenciais inválidas. Verifique e tente novamente.';
      set({ error: msg });
      throw e;
    }
  },

  loginGoogle: async (googleIdToken) => {
    set({ error: null });
    try {
      const tokens = await apiGoogleAuth(googleIdToken);
      const { name, email } = extractGoogleUser(googleIdToken);
      const payload = decodeJwtPayload(tokens.accessToken);
      const user: AuthUser = {
        id:    String(payload['sub'] ?? ''),
        email: (payload['email'] as string) ?? email,
        name:  name || email.split('@')[0],
      };
      await saveAuth(tokens, user);
      set({ isAuthenticated: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Erro ao entrar com Google. Tente novamente.';
      set({ error: msg });
      throw e;
    }
  },

  refreshTokens: async () => {
    const currentRefresh = get().refreshToken;
    if (!currentRefresh) throw new Error('No refresh token');
    const tokens = await apiRefresh(currentRefresh);
    const stored = await loadAuth();
    const user = stored?.user ?? get().user;
    if (user) await saveAuth(tokens, user);
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  },

  logout: async () => {
    const currentRefresh = get().refreshToken;
    try {
      if (currentRefresh) await apiLogout(currentRefresh);
    } catch { /* best effort */ }
    await clearAuth();
    set({ isAuthenticated: false, accessToken: null, refreshToken: null, user: null });
  },

  clearError: () => set({ error: null }),

  _setAccessToken: (token) => set({ accessToken: token }),
}));
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/auth/store.ts
git commit -m "feat(auth): add auth Zustand store with hydrate, login, register, Google, logout"
```

---

## Task 5: Axios interceptors (`src/api/client.ts`)

Attach `Bearer` token to every request. On 401 response, attempt a silent refresh and retry. On refresh failure, clear auth and throw.

**Files:**
- Modify: `src/api/client.ts`

- [ ] **Step 1: Replace `src/api/client.ts`**

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../auth/store';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach current access token ──────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: silent token refresh on 401 ─────────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function drainQueue(err: unknown, token?: string) {
  pendingQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only retry once; skip auth endpoints to avoid infinite loops
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.startsWith('/v1/auth/')
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      // Queue this request until the in-flight refresh completes
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers['Authorization'] = `Bearer ${token}`;
        return apiClient(original);
      });
    }

    isRefreshing = true;

    try {
      await useAuthStore.getState().refreshTokens();
      const newToken = useAuthStore.getState().accessToken!;
      useAuthStore.getState()._setAccessToken(newToken);
      drainQueue(null, newToken);
      original.headers['Authorization'] = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshErr) {
      drainQueue(refreshErr);
      await useAuthStore.getState().logout();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/api/client.ts
git commit -m "feat(auth): add Bearer token request interceptor and 401 refresh interceptor"
```

---

## Task 6: Navigation types + AuthStack (`src/navigation/`)

**Files:**
- Modify: `src/navigation/types.ts`
- Create: `src/navigation/AuthStack.tsx`
- Modify: `src/navigation/RootStack.tsx`

- [ ] **Step 1: Update `src/navigation/types.ts`**

Replace entire file:

```typescript
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';

// ── Lists stack ───────────────────────────────────────────────────────────────
export type ListsStackParamList = {
  ListsHome: undefined;
  ListDetail: { listId: number; listName: string };
  AddEditList: { listId?: number; listName?: string } | undefined;
  AddEditItem: { listId: number; remoteListId: number | null; itemId?: number } | undefined;
};

// ── Bottom tabs ───────────────────────────────────────────────────────────────
export type RootTabParamList = {
  ListsTab:   undefined;
  ComprasTab: undefined;
  PerfilTab:  undefined;
};

// ── Auth stack (unauthenticated) ──────────────────────────────────────────────
export type AuthStackParamList = {
  Login:    undefined;
  Register: undefined;
};

// ── Root stack (wraps tabs + modal-style screens) ────────────────────────────
export type RootStackParamList = {
  Auth:      NavigatorScreenParams<AuthStackParamList>;
  MainTabs:  NavigatorScreenParams<RootTabParamList>;
  PerfilInfo: undefined;
};

// ── Typed screen props ────────────────────────────────────────────────────────
export type ListsHomeProps  = NativeStackScreenProps<ListsStackParamList, 'ListsHome'>;
export type ListDetailProps = NativeStackScreenProps<ListsStackParamList, 'ListDetail'>;
export type AddEditListProps = NativeStackScreenProps<ListsStackParamList, 'AddEditList'>;
export type AddEditItemProps = NativeStackScreenProps<ListsStackParamList, 'AddEditItem'>;

export type LoginProps     = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type RegisterProps  = NativeStackScreenProps<AuthStackParamList, 'Register'>;
export type PerfilInfoProps = NativeStackScreenProps<RootStackParamList, 'PerfilInfo'>;
```

- [ ] **Step 2: Create `src/navigation/AuthStack.tsx`**

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { Login }    from '../screens/Login';
import { Register } from '../screens/Register';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Login"    component={Login} />
      <Stack.Screen name="Register" component={Register} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 3: Replace `src/navigation/RootStack.tsx`**

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../auth/store';
import type { RootStackParamList } from './types';
import { AuthStack }     from './AuthStack';
import { MainTabs }      from './MainTabs';
import { PerfilInfo }    from '../screens/PerfilInfo';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="MainTabs"  component={MainTabs} />
            <Stack.Screen
              name="PerfilInfo"
              component={PerfilInfo}
              options={{ animation: 'slide_from_right' }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: errors about missing `Login`, `Register`, `PerfilInfo` screen exports — these will be resolved in later tasks. If only those errors appear, proceed.

- [ ] **Step 5: Commit**

```bash
git add src/navigation/types.ts src/navigation/AuthStack.tsx src/navigation/RootStack.tsx
git commit -m "feat(auth): add AuthStack, update RootStack to be auth-aware, extend nav types"
```

---

## Task 7: Login screen (`src/screens/Login/index.tsx`)

Matches the design: logo, "Continuar com Google" button, divider, email/password fields, "Entrar" button, forgot password link, register link.

**Files:**
- Create: `src/screens/Login/index.tsx`

> Note: Google sign-in requires `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env`. During development in Expo Go, only the web client ID is needed.

- [ ] **Step 1: Create `src/screens/Login/index.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuthStore } from '../../auth/store';
import type { LoginProps } from '../../navigation/types';

WebBrowser.maybeCompleteAuthSession();

const C = {
  bg:          '#111210',
  surface:     '#161A18',
  border:      '#1A2420',
  primary:     '#1D9E75',
  text:        '#EEF2F0',
  textSub:     '#888780',
  danger:      '#EF4444',
} as const;

export function Login({ navigation }: LoginProps) {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { loginLocal, loginGoogle, error, clearError } = useAuthStore();

  const [_req, response, promptAsync] = Google.useAuthRequest({
    webClientId:     process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId:     process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    scopes:          ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (idToken) {
        setGoogleLoading(true);
        loginGoogle(idToken).finally(() => setGoogleLoading(false));
      }
    }
  }, [response]);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      await loginLocal(email.trim().toLowerCase(), password);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={s.logoArea}>
            <View style={s.logoBox}>
              <ShoppingBag size={36} color={C.primary} strokeWidth={1.6} />
            </View>
            <Text style={s.appName}>Lista AI</Text>
          </View>

          {/* Error banner */}
          {error ? (
            <TouchableOpacity style={s.errorBanner} onPress={clearError}>
              <Text style={s.errorText}>{error}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Google button */}
          <TouchableOpacity
            style={s.googleBtn}
            onPress={() => promptAsync()}
            disabled={googleLoading}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={C.text} />
            ) : (
              <>
                <Text style={s.googleG}>G</Text>
                <Text style={s.googleLabel}>Continuar com Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>ou</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Email */}
          <Text style={s.label}>E-mail</Text>
          <View style={s.inputRow}>
            <Mail size={16} color={C.textSub} />
            <TextInput
              style={s.input}
              placeholder="seu@email.com"
              placeholderTextColor={C.textSub}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              onFocus={clearError}
            />
          </View>

          {/* Password */}
          <Text style={[s.label, { marginTop: 16 }]}>Senha</Text>
          <View style={s.inputRow}>
            <Lock size={16} color={C.textSub} />
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={C.textSub}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoComplete="current-password"
              onFocus={clearError}
            />
            <TouchableOpacity onPress={() => setShowPass((v) => !v)}>
              {showPass
                ? <Eye size={18} color={C.textSub} />
                : <EyeOff size={18} color={C.textSub} />}
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.primaryBtn, (loading || !email || !password) && s.primaryBtnDisabled]}
            onPress={handleLogin}
            disabled={loading || !email || !password}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>Entrar</Text>}
          </TouchableOpacity>

          {/* Forgot */}
          <TouchableOpacity style={s.linkRow}>
            <Text style={s.linkText}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          {/* Register */}
          <View style={[s.linkRow, { marginTop: 4 }]}>
            <Text style={s.mutedText}>Não tem uma conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={s.link}>Cadastre-se</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  flex:   { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },

  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(29,158,117,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(29,158,117,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  appName: { color: C.text, fontSize: 26, fontWeight: '700' },

  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorText: { color: C.danger, fontSize: 13, textAlign: 'center' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingVertical: 14, gap: 10, backgroundColor: C.surface,
  },
  googleG:     { color: C.text, fontSize: 16, fontWeight: '700' },
  googleLabel: { color: C.text, fontSize: 15, fontWeight: '500' },

  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { color: C.textSub, fontSize: 12, marginHorizontal: 12 },

  label: { color: C.textSub, fontSize: 13, fontWeight: '500', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, gap: 10,
  },
  input: { flex: 1, color: C.text, fontSize: 15 },

  primaryBtn: {
    backgroundColor: C.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 28,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },

  linkRow:   { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  linkText:  { color: C.textSub, fontSize: 13 },
  mutedText: { color: C.textSub, fontSize: 13 },
  link:      { color: C.primary, fontSize: 13, fontWeight: '600' },
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/Login/index.tsx
git commit -m "feat(auth): implement Login screen with email/password and Google sign-in"
```

---

## Task 8: Register screen (`src/screens/Register/index.tsx`)

Matches the design: logo, Google button, divider, name/email/password fields, "Criar conta" button, terms note, login link.

**Files:**
- Create: `src/screens/Register/index.tsx`

- [ ] **Step 1: Create `src/screens/Register/index.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, Eye, EyeOff, Mail, Lock, User } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuthStore } from '../../auth/store';
import type { RegisterProps } from '../../navigation/types';

WebBrowser.maybeCompleteAuthSession();

const C = {
  bg:      '#111210',
  surface: '#161A18',
  border:  '#1A2420',
  primary: '#1D9E75',
  text:    '#EEF2F0',
  textSub: '#888780',
  danger:  '#EF4444',
} as const;

export function Register({ navigation }: RegisterProps) {
  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { register, loginGoogle, error, clearError } = useAuthStore();

  const [_req, response, promptAsync] = Google.useAuthRequest({
    webClientId:     process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId:     process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    scopes:          ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (idToken) {
        setGoogleLoading(true);
        loginGoogle(idToken).finally(() => setGoogleLoading(false));
      }
    }
  }, [response]);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) return;
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, name.trim());
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && password.length >= 6;

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={s.logoArea}>
            <View style={s.logoBox}>
              <ShoppingBag size={36} color={C.primary} strokeWidth={1.6} />
            </View>
            <Text style={s.appName}>Lista AI</Text>
          </View>

          {/* Error banner */}
          {error ? (
            <TouchableOpacity style={s.errorBanner} onPress={clearError}>
              <Text style={s.errorText}>{error}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Google button */}
          <TouchableOpacity
            style={s.googleBtn}
            onPress={() => promptAsync()}
            disabled={googleLoading}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={C.text} />
            ) : (
              <>
                <Text style={s.googleG}>G</Text>
                <Text style={s.googleLabel}>Continuar com Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>ou</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Name */}
          <Text style={s.label}>Nome completo</Text>
          <View style={s.inputRow}>
            <User size={16} color={C.textSub} />
            <TextInput
              style={s.input}
              placeholder="João Silva"
              placeholderTextColor={C.textSub}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              onFocus={clearError}
            />
          </View>

          {/* Email */}
          <Text style={[s.label, { marginTop: 16 }]}>E-mail</Text>
          <View style={s.inputRow}>
            <Mail size={16} color={C.textSub} />
            <TextInput
              style={s.input}
              placeholder="seu@email.com"
              placeholderTextColor={C.textSub}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              onFocus={clearError}
            />
          </View>

          {/* Password */}
          <Text style={[s.label, { marginTop: 16 }]}>Senha</Text>
          <View style={s.inputRow}>
            <Lock size={16} color={C.textSub} />
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={C.textSub}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoComplete="new-password"
              onFocus={clearError}
            />
            <TouchableOpacity onPress={() => setShowPass((v) => !v)}>
              {showPass
                ? <Eye size={18} color={C.textSub} />
                : <EyeOff size={18} color={C.textSub} />}
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.primaryBtn, !canSubmit && s.primaryBtnDisabled]}
            onPress={handleRegister}
            disabled={loading || !canSubmit}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>Criar conta</Text>}
          </TouchableOpacity>

          {/* Terms */}
          <Text style={s.terms}>
            Ao se cadastrar, você concorda com nossos{' '}
            <Text style={s.termsLink}>Termos e Política de Privacidade</Text>
          </Text>

          {/* Login link */}
          <View style={[s.linkRow, { marginTop: 12 }]}>
            <Text style={s.mutedText}>Já tem uma conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={s.link}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  flex:   { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },

  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(29,158,117,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(29,158,117,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  appName: { color: C.text, fontSize: 26, fontWeight: '700' },

  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorText: { color: C.danger, fontSize: 13, textAlign: 'center' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingVertical: 14, gap: 10, backgroundColor: C.surface,
  },
  googleG:     { color: C.text, fontSize: 16, fontWeight: '700' },
  googleLabel: { color: C.text, fontSize: 15, fontWeight: '500' },

  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { color: C.textSub, fontSize: 12, marginHorizontal: 12 },

  label: { color: C.textSub, fontSize: 13, fontWeight: '500', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, gap: 10,
  },
  input: { flex: 1, color: C.text, fontSize: 15 },

  primaryBtn: {
    backgroundColor: C.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 28,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },

  terms: {
    color: C.textSub, fontSize: 12, textAlign: 'center',
    marginTop: 16, lineHeight: 18,
  },
  termsLink: { color: C.primary },

  linkRow:   { flexDirection: 'row', justifyContent: 'center' },
  mutedText: { color: C.textSub, fontSize: 13 },
  link:      { color: C.primary, fontSize: 13, fontWeight: '600' },
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/Register/index.tsx
git commit -m "feat(auth): implement Register screen with email/password and Google sign-in"
```

---

## Task 9: Profile screen (`src/screens/Perfil/index.tsx`)

Replaces the "Coming soon" placeholder. Shows avatar with initials, name, email, and menu rows for Profile Info and Settings.

**Files:**
- Modify: `src/screens/Perfil/index.tsx`

- [ ] **Step 1: Replace `src/screens/Perfil/index.tsx`**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, UserCircle, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../auth/store';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

const C = {
  bg:      '#111210',
  surface: '#161A18',
  border:  '#1A2420',
  primary: '#1D9E75',
  text:    '#EEF2F0',
  textSub: '#888780',
} as const;

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function Perfil() {
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const displayName = user?.name ?? user?.email?.split('@')[0] ?? 'Usuário';
  const displayEmail = user?.email ?? '';

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Perfil</Text>
      </View>

      {/* Avatar */}
      <View style={s.avatarArea}>
        <View style={s.avatarRing}>
          <Text style={s.avatarText}>{getInitials(displayName)}</Text>
        </View>
        <Text style={s.userName}>{displayName}</Text>
        <Text style={s.userEmail}>{displayEmail}</Text>
      </View>

      {/* Menu rows */}
      <View style={s.menu}>
        <TouchableOpacity
          style={s.menuRow}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('PerfilInfo')}
        >
          <View style={s.menuIcon}>
            <UserCircle size={20} color={C.primary} strokeWidth={1.6} />
          </View>
          <Text style={s.menuLabel}>Informações do perfil</Text>
          <ChevronRight size={18} color={C.textSub} />
        </TouchableOpacity>

        <View style={s.separator} />

        <TouchableOpacity style={s.menuRow} activeOpacity={0.75}>
          <View style={s.menuIcon}>
            <Settings size={20} color={C.primary} strokeWidth={1.6} />
          </View>
          <Text style={s.menuLabel}>Configurações</Text>
          <ChevronRight size={18} color={C.textSub} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title:  { color: C.text, fontSize: 28, fontWeight: '700' },

  avatarArea: { alignItems: 'center', paddingTop: 32, paddingBottom: 36 },
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(29,158,117,0.12)',
    borderWidth: 2, borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText:  { color: C.primary, fontSize: 26, fontWeight: '700' },
  userName:    { color: C.text,    fontSize: 20, fontWeight: '700', marginBottom: 4 },
  userEmail:   { color: C.textSub, fontSize: 14 },

  menu: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, gap: 12,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(29,158,117,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel:   { flex: 1, color: C.text, fontSize: 15, fontWeight: '500' },
  separator:   { height: 1, backgroundColor: C.border, marginLeft: 64 },
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/Perfil/index.tsx
git commit -m "feat(auth): implement Profile screen with avatar, name, email, and menu"
```

---

## Task 10: Profile Info screen (`src/screens/PerfilInfo/index.tsx`)

Shows editable name, read-only email, local-only phone/address fields, password placeholder, and "Excluir conta" (logout). Save persists name to auth store.

> **Backend limitation:** There is no `PATCH /v1/users/me` endpoint. Name changes are stored locally in the auth store and persist via `expo-secure-store`. Phone and address are stored locally in AsyncStorage. A backend update endpoint would be needed for true profile persistence.

**Files:**
- Create: `src/screens/PerfilInfo/index.tsx`

- [ ] **Step 1: Install AsyncStorage for local profile fields**

```bash
npx expo install @react-native-async-storage/async-storage
```

- [ ] **Step 2: Create `src/screens/PerfilInfo/index.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Camera, Pencil, Lock, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../auth/store';
import { saveAuth, loadAuth } from '../../auth/storage';
import type { PerfilInfoProps } from '../../navigation/types';

const C = {
  bg:      '#111210',
  surface: '#161A18',
  border:  '#1A2420',
  primary: '#1D9E75',
  text:    '#EEF2F0',
  textSub: '#888780',
  danger:  '#EF4444',
} as const;

const LOCAL_PROFILE_KEY = 'local.profile';

type LocalProfile = { phone: string; address: string };

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function PerfilInfo({ navigation }: PerfilInfoProps) {
  const { user, logout } = useAuthStore();

  const [name, setName]       = useState(user?.name ?? '');
  const [phone, setPhone]     = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving]   = useState(false);

  // Load locally stored phone/address
  useEffect(() => {
    AsyncStorage.getItem(LOCAL_PROFILE_KEY)
      .then((raw) => {
        if (raw) {
          const local: LocalProfile = JSON.parse(raw);
          setPhone(local.phone ?? '');
          setAddress(local.address ?? '');
        }
      })
      .catch(() => {/* ignore */});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      // Persist name update to secure store
      const stored = await loadAuth();
      if (stored && user) {
        const updatedUser = { ...user, name: name.trim() || user.name };
        await saveAuth(stored.tokens, updatedUser);
        useAuthStore.setState({ user: updatedUser });
      }
      // Persist phone/address locally
      const local: LocalProfile = { phone: phone.trim(), address: address.trim() };
      await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(local));
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Excluir conta',
      'Tem certeza? Você será desconectado. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  }

  const displayName = user?.name ?? '';

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
            <ChevronLeft size={26} color={C.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Perfil</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={C.primary} />
              : <Text style={s.saveBtn}>Salvar</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={s.avatarArea}>
            <View style={s.avatarRing}>
              <Text style={s.avatarText}>{getInitials(displayName)}</Text>
            </View>
            <View style={s.cameraBtn}>
              <Camera size={14} color={C.bg} />
            </View>
          </View>

          {/* Fields */}
          <View style={s.fields}>
            {/* Name */}
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>Nome</Text>
              <View style={s.fieldInput}>
                <TextInput
                  style={s.fieldText}
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor={C.textSub}
                  autoCapitalize="words"
                />
                <Pencil size={16} color={C.textSub} />
              </View>
            </View>

            <View style={s.divider} />

            {/* Email (read-only) */}
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>E-mail</Text>
              <View style={s.fieldInput}>
                <TextInput
                  style={[s.fieldText, s.fieldTextMuted]}
                  value={user?.email ?? ''}
                  editable={false}
                  placeholderTextColor={C.textSub}
                />
                <Lock size={16} color={C.textSub} />
              </View>
            </View>

            <View style={s.divider} />

            {/* Phone */}
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>Telefone</Text>
              <View style={s.fieldInput}>
                <TextInput
                  style={s.fieldText}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+55 11 99999-0000"
                  placeholderTextColor={C.textSub}
                  keyboardType="phone-pad"
                />
                <Pencil size={16} color={C.textSub} />
              </View>
            </View>

            <View style={s.divider} />

            {/* Address */}
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>Endereço</Text>
              <View style={s.fieldInput}>
                <TextInput
                  style={s.fieldText}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Rua Example, 123"
                  placeholderTextColor={C.textSub}
                />
                <Pencil size={16} color={C.textSub} />
              </View>
            </View>

            <View style={s.divider} />

            {/* Password (display-only placeholder) */}
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>Senha</Text>
              <View style={s.fieldInput}>
                <TextInput
                  style={[s.fieldText, s.fieldTextMuted]}
                  value="••••••••"
                  editable={false}
                  secureTextEntry={false}
                />
                <Pencil size={16} color={C.textSub} />
              </View>
            </View>
          </View>

          {/* Delete account */}
          <TouchableOpacity style={s.deleteBtn} onPress={confirmDelete} activeOpacity={0.8}>
            <Trash2 size={16} color={C.danger} />
            <Text style={s.deleteText}>Excluir conta</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: C.bg },
  flex:  { flex: 1 },
  scroll: { paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { color: C.text, fontSize: 17, fontWeight: '600' },
  saveBtn:     { color: C.primary, fontSize: 16, fontWeight: '600' },

  avatarArea: { alignItems: 'center', paddingVertical: 32 },
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(29,158,117,0.12)',
    borderWidth: 2, borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: C.primary, fontSize: 26, fontWeight: '700' },
  cameraBtn: {
    position: 'absolute', bottom: 28, right: '32%',
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  fields: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  fieldRow:   { paddingHorizontal: 16, paddingVertical: 14 },
  fieldLabel: { color: C.textSub, fontSize: 12, fontWeight: '500', marginBottom: 6 },
  fieldInput: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldText:  { flex: 1, color: C.text, fontSize: 15 },
  fieldTextMuted: { color: C.textSub },
  divider:    { height: 1, backgroundColor: C.border, marginLeft: 16 },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 32,
  },
  deleteText: { color: C.danger, fontSize: 14, fontWeight: '600' },
});
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/PerfilInfo/index.tsx package.json
git commit -m "feat(auth): implement Profile Info screen with editable name, local phone/address, delete"
```

---

## Task 11: App bootstrap — load auth state on startup (`App.tsx`)

Calls `hydrate()` before rendering so the navigation guard has the correct auth state immediately, preventing flicker to the auth screen for logged-in users.

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Update `App.tsx`**

Replace the `AppContent` function and `App` function:

```typescript
// Add to imports at top of App.tsx:
import { useAuthStore } from './src/auth/store';
```

Replace `AppContent` and `App`:

```typescript
function AppContent() {
  useConnectivity();
  return <RootStack />;
}

export default function App() {
  const [migrationsReady, setMigrationsReady] = useState(false);
  const [authReady, setAuthReady]             = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    runMigrations()
      .then(() => setMigrationsReady(true))
      .catch((err) => {
        console.error('Migration failed:', err);
        setMigrationsReady(true);
      });
  }, []);

  useEffect(() => {
    useAuthStore.getState()
      .hydrate()
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded && migrationsReady && authReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, migrationsReady, authReady]);

  if (!fontsLoaded || !migrationsReady || !authReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#111210', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#1D9E75" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat(auth): hydrate auth state from secure storage on app startup"
```

---

## Task 12: Environment file + smoke test

- [ ] **Step 1: Update `.env.example`**

Add Google client ID vars (do not commit real values):

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
```

- [ ] **Step 2: Ensure `.env` is in `.gitignore`**

```bash
grep -q "^\.env$" .gitignore || echo ".env" >> .gitignore
```

- [ ] **Step 3: Final typecheck**

```bash
npm run typecheck
```

Expected: zero TypeScript errors.

- [ ] **Step 4: Start Expo dev server and verify manually**

```bash
npx expo start
```

Manual checklist:
- [ ] App shows Login screen when not authenticated
- [ ] "Continuar com Google" launches browser (requires `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` set)
- [ ] Email + password fields accept input and submit calls `/v1/auth/login`
- [ ] "Não tem uma conta? Cadastre-se" navigates to Register
- [ ] Register form submits to `/v1/auth/register` and navigates to main tabs on success
- [ ] Profile tab shows avatar initials, name, email
- [ ] "Informações do perfil" row navigates to Profile Info (no tab bar)
- [ ] Profile Info "Salvar" persists name changes; back returns to Profile with updated name
- [ ] "Excluir conta" shows confirmation alert; confirming calls logout and shows Login screen
- [ ] Closing and reopening app restores authenticated state (no login required)

- [ ] **Step 5: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add Google OAuth env vars to .env.example"
```

---

## Self-Review

### Spec coverage
- [x] Login screen with email/password + Google — Task 7
- [x] Register screen with name/email/password + Google — Task 8
- [x] Profile screen with initials avatar, name, email, menu — Task 9
- [x] Profile Info screen — Task 10
- [x] Token storage (secure) — Task 2
- [x] Axios Bearer interceptor — Task 5
- [x] Silent 401 refresh — Task 5
- [x] Auth-aware navigation guard — Task 6
- [x] App startup hydration — Task 11
- [x] Logout / delete account — Task 10 + auth store

### Security checklist
- Tokens stored in `expo-secure-store` (OS keychain/keystore), not AsyncStorage
- Access token is never logged or included in error reports
- Refresh token is rotated on every use (single-use, enforced by backend)
- Email is lowercased before sending
- Google `id_token` is validated server-side (audience, signature, expiry) — client only decodes for display
- `Authorization` header is never sent to `/v1/auth/*` endpoints (interceptor guard)
- Logout clears all secure storage including refresh token

### Known limitations (future work)
- **No backend `PATCH /v1/users/me`**: name changes persist locally only; server-side sync requires a new backend endpoint
- **No password change flow**: the password field in Profile Info is display-only
- **Phone/address**: stored in AsyncStorage (unencrypted); move to SecureStore if sensitive
