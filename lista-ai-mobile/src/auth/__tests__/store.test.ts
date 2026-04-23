import { act } from '@testing-library/react-native';

/** Flush all pending microtasks and resolved promise callbacks. */
const flushPromises = () => new Promise<void>((res) => setImmediate(res));

var mockDbDelete: jest.Mock;
var mockDbSelect: jest.Mock;
var mockDbFrom: jest.Mock;
var mockDbWhere: jest.Mock;
var mockDbLimit: jest.Mock;

jest.mock('../../db', () => ({
  db: {
    delete: (...args: any[]) => mockDbDelete(...args),
    select: (...args: any[]) => mockDbSelect(...args),
  },
}));

jest.mock('../../db/schema', () => ({
  items: { _: 'items' },
  lists: { _: 'lists' },
  syncQueue: { _: 'sync_queue' },
}));

jest.mock('../../queryClient', () => ({
  queryClient: { clear: jest.fn() },
}));

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

jest.mock('../../sync/seed', () => ({
  seedFromRemote: jest.fn().mockResolvedValue(undefined),
}));

import { useAuthStore } from '../store';
import { apiRegister, apiLogin, apiGoogleAuth, apiRefresh, apiLogout } from '../../api/auth';
import { seedFromRemote } from '../../sync/seed';

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
  // Reset seedFromRemote to default resolved behaviour; clearAllMocks() does not
  // reset implementations, so a test that calls mockImplementation() would
  // otherwise leak its implementation into subsequent tests.
  (seedFromRemote as jest.Mock).mockResolvedValue(undefined);
  mockDbDelete = jest.fn().mockResolvedValue(undefined);
  mockDbLimit = jest.fn().mockResolvedValue([]); // empty DB by default
  mockDbWhere = jest.fn().mockReturnValue({ limit: mockDbLimit });
  mockDbFrom = jest.fn().mockReturnValue({ where: mockDbWhere });
  mockDbSelect = jest.fn().mockReturnValue({ from: mockDbFrom });
  useAuthStore.setState({
    isAuthenticated: false,
    isLoading: true,
    isSyncing: false,
    syncProgress: null,
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
  it('clears auth state, calls apiLogout, wipes DB tables, and clears query cache', async () => {
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
    // DB tables wiped (items, lists, syncQueue)
    expect(mockDbDelete).toHaveBeenCalledTimes(3);
    expect(mockDbDelete).toHaveBeenCalledWith({ _: 'items' });
    expect(mockDbDelete).toHaveBeenCalledWith({ _: 'lists' });
    expect(mockDbDelete).toHaveBeenCalledWith({ _: 'sync_queue' });
    // Query cache cleared
    const { queryClient } = require('../../queryClient');
    expect(queryClient.clear).toHaveBeenCalled();
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

// ── loginLocal() seed-on-login ─────────────────────────────────────────────────

describe('loginLocal() seed-on-login', () => {
  it('calls seedFromRemote when lists table is empty after login', async () => {
    (apiLogin as jest.Mock).mockResolvedValue(tokenResponse);
    mockDbLimit.mockResolvedValue([]); // empty DB

    await act(async () => {
      await useAuthStore.getState().loginLocal('a@b.com', 'pass123');
    });

    expect(seedFromRemote).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().isSyncing).toBe(false);
    expect(useAuthStore.getState().syncProgress).toBeNull();
  });

  it('skips seedFromRemote when DB already has lists', async () => {
    (apiLogin as jest.Mock).mockResolvedValue(tokenResponse);
    mockDbLimit.mockResolvedValue([{ id: 1 }]); // DB not empty

    await act(async () => {
      await useAuthStore.getState().loginLocal('a@b.com', 'pass123');
    });

    expect(seedFromRemote).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('still authenticates if seedFromRemote throws', async () => {
    (apiLogin as jest.Mock).mockResolvedValue(tokenResponse);
    mockDbLimit.mockResolvedValue([]);
    (seedFromRemote as jest.Mock).mockRejectedValue(new Error('network'));

    await act(async () => {
      await useAuthStore.getState().loginLocal('a@b.com', 'pass123');
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().isSyncing).toBe(false);
  });

  it('sets isAuthenticated only after seed completes', async () => {
    (apiLogin as jest.Mock).mockResolvedValue(tokenResponse);
    mockDbLimit.mockResolvedValue([]);

    let resolveSeeed!: () => void;
    (seedFromRemote as jest.Mock).mockImplementation(
      () => new Promise<void>((res) => { resolveSeeed = res; }),
    );

    let loginDone = false;
    const loginPromise = act(async () => {
      await useAuthStore.getState().loginLocal('a@b.com', 'pass123');
      loginDone = true;
    });

    // Flush microtasks so loginLocal progresses up to the seedFromRemote await
    await flushPromises();

    // Seed is still in flight — isAuthenticated must still be false
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().isSyncing).toBe(true);

    resolveSeeed();
    await loginPromise;

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(loginDone).toBe(true);
  });
});

// ── loginGoogle() seed-on-login ────────────────────────────────────────────────

// A minimal Google id_token JWT with name and email in its payload.
const googleIdToken =
  'eyJhbGciOiJSUzI1NiJ9.' +
  btoa(JSON.stringify({ sub: '2', email: 'g@example.com', name: 'Gina', exp: 9999999999 })) +
  '.sig';

describe('loginGoogle() seed-on-login', () => {
  it('calls seedFromRemote when lists table is empty after Google login', async () => {
    (apiGoogleAuth as jest.Mock).mockResolvedValue(tokenResponse);
    mockDbLimit.mockResolvedValue([]); // empty DB

    await act(async () => {
      await useAuthStore.getState().loginGoogle(googleIdToken);
    });

    expect(seedFromRemote).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().isSyncing).toBe(false);
  });

  it('skips seedFromRemote when DB already has lists after Google login', async () => {
    (apiGoogleAuth as jest.Mock).mockResolvedValue(tokenResponse);
    mockDbLimit.mockResolvedValue([{ id: 1 }]); // DB not empty

    await act(async () => {
      await useAuthStore.getState().loginGoogle(googleIdToken);
    });

    expect(seedFromRemote).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
