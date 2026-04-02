import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ListsStackParamList } from './types';

// Placeholder screen components — will be replaced when screens are created
const ListsHome = () => null;
const ListDetail = () => null;
const AddEditList = () => null;
const AddEditItem = () => null;

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
