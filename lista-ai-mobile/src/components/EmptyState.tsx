import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

export function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Icon size={32} color="#888780" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  badge: {
    width: 68,
    height: 68,
    borderRadius: 9999,
    backgroundColor: '#1A1C1A',
    borderWidth: 1,
    borderColor: '#0F2E28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#EEF2F0', fontSize: 16, fontWeight: '600' },
  subtitle: { color: '#888780', fontSize: 13, textAlign: 'center' },
});
