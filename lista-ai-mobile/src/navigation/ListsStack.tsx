import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ListsStackParamList } from './types';
import { ListsHome } from '../screens/ListsHome';
import { ListDetail } from '../screens/ListDetail';
import { AddEditList } from '../screens/AddEditList';
import { AddEditItem } from '../screens/AddEditItem';
import { useTheme } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator<ListsStackParamList>();

export function ListsStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: theme.background },
        animation: 'none',
      }}
    >
      <Stack.Screen name="ListsHome"  component={ListsHome}    options={{ headerShown: false }} />
      <Stack.Screen name="ListDetail" component={ListDetail}   options={{ headerShown: false }} />
      <Stack.Screen
        name="AddEditList"
        component={AddEditList}
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="AddEditItem"
        component={AddEditItem}
        options={{
          presentation: 'formSheet',
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack.Navigator>
  );
}
