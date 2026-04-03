import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { List, Settings as SettingsIcon } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootTabParamList } from './types';
import { ListsStack } from './ListsStack';
import { Settings as SettingsScreen } from '../screens/Settings';

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  ListsTab: { icon: List, label: 'Lists' },
  SettingsTab: { icon: SettingsIcon, label: 'Settings' },
};

function PillTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || 12 }]}>
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name];
          if (!config) return null;
          const { icon: Icon, label } = config;

          const onPress = () => {
            if (!isFocused) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.tab, isFocused && styles.tabActive]}
              onPress={onPress}
              activeOpacity={0.85}
            >
              <Icon
                size={16}
                color={isFocused ? '#FFFFFF' : '#71717A'}
                strokeWidth={2}
              />
              <Text style={[styles.label, isFocused && styles.labelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="ListsTab" component={ListsStack} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#18181B',
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    paddingTop: 10,
    paddingHorizontal: 24,
  },
  inner: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  label: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '500',
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
