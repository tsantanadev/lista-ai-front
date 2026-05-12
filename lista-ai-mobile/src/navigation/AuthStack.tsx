import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { Login }               from '../screens/Login';
import { Register }            from '../screens/Register';
import { VerifyEmailPending }  from '../screens/VerifyEmailPending';
import { VerifyEmail }         from '../screens/VerifyEmail';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Login"              component={Login} />
      <Stack.Screen name="Register"           component={Register} />
      <Stack.Screen name="VerifyEmailPending" component={VerifyEmailPending} />
      <Stack.Screen name="VerifyEmail"        component={VerifyEmail} />
    </Stack.Navigator>
  );
}
