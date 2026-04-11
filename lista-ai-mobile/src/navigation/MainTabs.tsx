import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { List, ShoppingCart, User } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { RootTabParamList } from './types';
import { ListsStack } from './ListsStack';
import { Compras } from '../screens/Compras';
import { Perfil } from '../screens/Perfil';

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_CONFIG: Record<keyof RootTabParamList, { icon: LucideIcon; labelKey: string }> = {
  ListsTab:   { icon: List,         labelKey: 'navigation.lists'    },
  ComprasTab: { icon: ShoppingCart, labelKey: 'navigation.shopping' },
  PerfilTab:  { icon: User,         labelKey: 'navigation.profile'  },
};

function IconBoxTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || 16 }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const config = TAB_CONFIG[route.name as keyof RootTabParamList];
        if (!config) return null;
        const { icon: Icon, labelKey } = config;

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tab}
            onPress={() => { if (!isFocused) navigation.navigate(route.name); }}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, isFocused && styles.iconBoxActive]}>
              <Icon
                size={22}
                color={isFocused ? '#1D9E75' : '#888780'}
                strokeWidth={1.8}
              />
            </View>
            <Text style={[styles.label, isFocused && styles.labelActive]}>
              {t(labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <IconBoxTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="ListsTab"   component={ListsStack} />
      <Tab.Screen name="ComprasTab" component={Compras} />
      <Tab.Screen name="PerfilTab"  component={Perfil} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#161A18',
    borderTopWidth: 1,
    borderTopColor: '#1A2420',
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: 'rgba(29,158,117,0.15)',
    borderWidth: 1.5,
    borderColor: '#1D9E75',
  },
  label: {
    color: '#888780',
    fontSize: 11,
    fontWeight: '500',
  },
  labelActive: {
    color: '#EEF2F0',
    fontWeight: '700',
  },
});
