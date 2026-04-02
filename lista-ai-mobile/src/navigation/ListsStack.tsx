import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ListsStackParamList } from './types';
import { ListsHome } from '../screens/ListsHome';
import { ListDetail } from '../screens/ListDetail';
import { AddEditList } from '../screens/AddEditList';
import { AddEditItem } from '../screens/AddEditItem';

const Stack = createNativeStackNavigator<ListsStackParamList>();

export function ListsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#18181B' },
        headerTintColor: '#FAFAFA',
        headerTitleStyle: { color: '#FAFAFA' },
        contentStyle: { backgroundColor: '#09090B' },
      }}
    >
      <Stack.Screen name="ListsHome" component={ListsHome} options={{ headerShown: false }} />
      <Stack.Screen name="ListDetail" component={ListDetail} options={({ route }) => ({ title: route.params.listName })} />
      <Stack.Screen
        name="AddEditList"
        component={AddEditList}
        options={{ presentation: 'modal', title: 'List' }}
      />
      <Stack.Screen
        name="AddEditItem"
        component={AddEditItem}
        options={{ presentation: 'modal', title: 'Item' }}
      />
    </Stack.Navigator>
  );
}
