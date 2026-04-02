import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import type { RootTabParamList } from './types';
import { ListsStack } from './ListsStack';

// Placeholder Settings screen
const Settings = () => null;

const Tab = createBottomTabNavigator<RootTabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <Text style={{ color: focused ? '#3B82F6' : '#71717A', fontSize: 20 }}>
      {name === 'list' ? '📋' : '⚙️'}
    </Text>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#18181B',
          borderTopColor: '#27272A',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#71717A',
      }}
    >
      <Tab.Screen
        name="ListsTab"
        component={ListsStack}
        options={{
          tabBarLabel: 'Lists',
          tabBarIcon: ({ focused }) => <TabIcon name="list" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={Settings}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
