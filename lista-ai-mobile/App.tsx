import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { RootStack } from './src/navigation/RootStack';
import { runMigrations } from './src/db/migrate';
import { useConnectivity } from './src/hooks/useConnectivity';
import { useAuthStore } from './src/auth/store';
import { useStore } from './src/store';
import { ThemeProvider } from './src/theme/ThemeContext';
import { queryClient } from './src/queryClient';
import './src/i18n';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  useConnectivity();
  return <RootStack />;
}

export default function App() {
  const [migrationsReady, setMigrationsReady] = useState(false);
  const [authReady, setAuthReady]             = useState(false);
  const [langReady, setLangReady]             = useState(false);
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
    useStore.getState()
      .initLanguage()
      .finally(() => setLangReady(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded && migrationsReady && authReady && langReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, migrationsReady, authReady, langReady]);

  if (!fontsLoaded || !migrationsReady || !authReady || !langReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#111210', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#1D9E75" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
