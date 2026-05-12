import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../auth/store';
import type { RootStackParamList } from './types';
import { AuthStack }  from './AuthStack';
import { MainTabs }   from './MainTabs';
import { PerfilInfo } from '../screens/PerfilInfo';
import { Settings }  from '../screens/Settings';

const Stack = createNativeStackNavigator<RootStackParamList>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const linking: any = {
  prefixes: ['https://app.lista-ai.com', 'listai://'],
  config: {
    screens: {
      Auth: {
        screens: {
          VerifyEmail: {
            path: 'verify-email',
            parse: { token: (token: string) => token },
          },
        },
      },
    },
  },
};

export function RootStack() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="MainTabs"  component={MainTabs} />
            <Stack.Screen
              name="PerfilInfo"
              component={PerfilInfo}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Settings"
              component={Settings}
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
