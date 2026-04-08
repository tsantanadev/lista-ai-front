import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../auth/store';
import type { RootStackParamList } from './types';
import { AuthStack }  from './AuthStack';
import { MainTabs }   from './MainTabs';
import { PerfilInfo } from '../screens/PerfilInfo';

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
