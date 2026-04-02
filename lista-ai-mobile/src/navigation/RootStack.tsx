import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { MainTabs } from './MainTabs';

export function RootStack() {
  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
}
