import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBadge}>
        <Icon size={32} color="#71717A" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconBadge: {
    backgroundColor: '#27272A',
    borderRadius: 9999,
    padding: 18,
    marginBottom: 16,
  },
  title: { color: '#FAFAFA', fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#A1A1AA', fontSize: 14, textAlign: 'center' },
});
