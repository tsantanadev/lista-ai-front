import { act } from '@testing-library/react-native';

jest.mock('../../api/auth', () => ({
  apiRegister:   jest.fn(),
  apiLogin:      jest.fn(),
  apiGoogleAuth: jest.fn(),
  apiRefresh:    jest.fn(),
  apiLogout:     jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../i18n', () => ({
  default: { t: (key: string) => key },
  t: (key: string) => key,
}));

import { useAuthStore } from '../store';
import { apiRegister, apiLogin, apiRefresh, apiLogout } from '../../api/auth';

// Build a minimal valid-looking JWT whose payload contains sub and email.
// atob/btoa are available in the Jest jsdom/RN environment.
const accessToken =
  'eyJhbGciOiJIUzI1NiJ9.' +
  btoa(JSON.stringify({ sub: '1', email: 'a@b.com', exp: 9999999999 })) +
  '.sig';

const tokenResponse = {
  accessToken,
  refreshToken: 'refresh-abc',
  expiresIn: 900,
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    accessToken: null,
    refreshToken: null,
    error: null,
  });
});

// ── register() ────────────────────────────────────────────────────────────────

describe('register()', () => {
  it('sets isAuthenticated and stores tokens on success', async () => {
    (apiRegister as jest.Mock).mockResolvedValue(tokenResponse);

    await act(async () => {
      await useAuthStore.getState().register('a@b.com', 'pass123', 'Alice');
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe(tokenResponse.accessToken);
    expect(state.refreshToken).toBe(tokenResponse.refreshToken);
    expect(state.user?.email).toBe('a@b.com');
  });

  it('sets error and re-throws on failure', async () => {
    (apiRegister as jest.Mock).mockRejectedValue({
      response: { data: { detail: 'Email already registered' } },
    });

    await expect(
      act(async () => {
        await useAuthStore.getState().register('a@b.com', 'pass123', 'Alice');
      }),
    ).rejects.toBeDefined();

    expect(useAuthStore.getState().error).toBe('Email already registered');
  });
});

// ── loginLocal() ──────────────────────────────────────────────────────────────

describe('loginLocal()', () => {
  it('sets isAuthenticated on valid credentials', async () => {
    (apiLogin as jest.Mock).mockResolvedValue(tokenResponse);

    await act(async () => {
      await useAuthStore.getState().loginLocal('a@b.com', 'pass123');
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('sets error message on failure', async () => {
    (apiLogin as jest.Mock).mockRejectedValue({
      response: { data: { detail: 'Invalid credentials' } },
    });

    await expect(
      act(async () => {
        await useAuthStore.getState().loginLocal('a@b.com', 'wrong');
      }),
    ).rejects.toBeDefined();

    expect(useAuthStore.getState().error).toBe('Invalid credentials');
  });
});

// ── refreshTokens() ───────────────────────────────────────────────────────────

describe('refreshTokens()', () => {
  it('updates tokens in state after a silent refresh', async () => {
    const newTokens = {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 900,
    };
    (apiRefresh as jest.Mock).mockResolvedValue(newTokens);

    // Seed state with an existing refresh token and user so the store can proceed.
    useAuthStore.setState({
      refreshToken: 'old-refresh',
      user: { id: '1', name: 'Alice', email: 'a@b.com' },
    });

    await act(async () => {
      await useAuthStore.getState().refreshTokens();
    });

    expect(useAuthStore.getState().accessToken).toBe('new-access');
    expect(useAuthStore.getState().refreshToken).toBe('new-refresh');
  });
});

// ── logout() ──────────────────────────────────────────────────────────────────

describe('logout()', () => {
  it('clears auth state and calls apiLogout with the current refresh token', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      refreshToken: 'ref',
      user: { id: '1', name: 'Alice', email: 'a@b.com' },
    });

    await act(async () => {
      await useAuthStore.getState().logout();
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(apiLogout).toHaveBeenCalledWith('ref');
  });
});

// ── hydrate() ─────────────────────────────────────────────────────────────────

describe('hydrate()', () => {
  it('sets isAuthenticated from SecureStore when tokens exist', async () => {
    const secureStore = require('expo-secure-store');
    secureStore.getItemAsync.mockImplementation((key: string) => {
      const map: Record<string, string> = {
        'auth.accessToken':  tokenResponse.accessToken,
        'auth.refreshToken': tokenResponse.refreshToken,
        'auth.userEmail':    'a@b.com',
        'auth.userId':       '1',
        'auth.userName':     'Alice',
      };
      return Promise.resolve(map[key] ?? null);
    });

    await act(async () => {
      await useAuthStore.getState().hydrate();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('sets isLoading false and stays unauthenticated when no tokens stored', async () => {
    const secureStore = require('expo-secure-store');
    secureStore.getItemAsync.mockResolvedValue(null);

    await act(async () => {
      await useAuthStore.getState().hydrate();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
