import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootStack } from './src/navigation/RootStack';
import { runMigrations } from './src/db/migrate';
import { useConnectivity } from './src/hooks/useConnectivity';

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
        setMigrationsReady(true); // proceed anyway to show UI
      });
  }, []);

  useEffect(() => {
    if (fontsLoaded && migrationsReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, migrationsReady]);

  if (!fontsLoaded || !migrationsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090B', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#3B82F6" />
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
