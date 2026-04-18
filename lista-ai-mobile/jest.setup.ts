import '@testing-library/jest-native/extend-expect';

// ── react-i18next ─────────────────────────────────────────────────────────────
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

// ── ThemeContext ───────────────────────────────────────────────────────────────
const mockTheme = {
  background: '#111210',
  surface: '#1A1C1A',
  surfaceElevated: '#161A18',
  border: '#0F2E28',
  borderSubtle: '#1A2420',
  progressTrack: '#222420',
  primary: '#1D9E75',
  accent: '#EF9F27',
  neutral: '#888780',
  textPrimary: '#EEF2F0',
  destructive: '#EF4444',
  dragHandle: '#333333',
  placeholder: '#888780',
};

jest.mock('./src/theme/ThemeContext', () => ({
  useTheme: () => ({ theme: mockTheme }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── react-native-safe-area-context ────────────────────────────────────────────
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      React.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

// ── expo-secure-store (in-memory, reset per test via jest.clearAllMocks) ──────
const secureStoreMap: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key: string, value: string) => {
    secureStoreMap[key] = value;
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key: string) =>
    Promise.resolve(secureStoreMap[key] ?? null),
  ),
  deleteItemAsync: jest.fn((key: string) => {
    delete secureStoreMap[key];
    return Promise.resolve();
  }),
}));

// ── lucide-react-native (icons render as plain Views in tests) ────────────────
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target: object, name: string) =>
        ({ testID, ...rest }: any) =>
          React.createElement(View, { testID: testID ?? name, ...rest }),
    },
  );
});

// ── expo-web-browser ──────────────────────────────────────────────────────────
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

// ── expo-auth-session/providers/google ────────────────────────────────────────
jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => [null, null, jest.fn()],
}));

// ── @react-native-community/netinfo ──────────────────────────────────────────
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true }),
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));
