// src/theme/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, type Colors } from './colors';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = '@theme_preference';

interface ThemeContextValue {
  theme: Colors;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkColors,
  preference: 'system',
  setPreference: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .finally(() => setReady(true));
  }, []);

  const setPreference = async (p: ThemePreference) => {
    setPreferenceState(p);
    await AsyncStorage.setItem(STORAGE_KEY, p);
  };

  const resolvedScheme =
    preference === 'system' ? (deviceScheme ?? 'dark') : preference;
  const theme = resolvedScheme === 'dark' ? darkColors : lightColors;

  // Don't render until preference is loaded to avoid a flash
  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
