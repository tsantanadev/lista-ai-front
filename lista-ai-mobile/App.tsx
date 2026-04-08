import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootStack } from './src/navigation/RootStack';
import { runMigrations } from './src/db/migrate';
import { useConnectivity } from './src/hooks/useConnectivity';
import { useAuthStore } from './src/auth/store';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: Infinity,
    },
  },
});

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
