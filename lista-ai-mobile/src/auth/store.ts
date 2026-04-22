import { create } from 'zustand';
import { saveAuth, loadAuth, clearAuth, StoredUser } from './storage';
import { apiRegister, apiLogin, apiGoogleAuth, apiRefresh, apiLogout } from '../api/auth';
import i18n from '../i18n';
import { db } from '../db';
import { items as itemsTable, lists as listsTable, syncQueue as syncQueueTable } from '../db/schema';
import { queryClient } from '../queryClient';

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
        ?? i18n.t('auth.register.createError');
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
        ?? i18n.t('auth.login.invalidCredentials');
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
        ?? i18n.t('auth.login.googleError');
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
    await db.delete(itemsTable);
    await db.delete(listsTable);
    await db.delete(syncQueueTable);
    queryClient.clear();
    set({ isAuthenticated: false, accessToken: null, refreshToken: null, user: null });
  },

  clearError: () => set({ error: null }),

  _setAccessToken: (token) => set({ accessToken: token }),
}));
