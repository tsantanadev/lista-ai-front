import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

export function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  const { theme } = useTheme();
  const s = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
    badge: {
      width: 68,
      height: 68,
      borderRadius: 9999,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title:    { color: theme.textPrimary, fontSize: 16, fontWeight: '600' },
    subtitle: { color: theme.neutral, fontSize: 13, textAlign: 'center' },
  });

  return (
    <View style={s.container}>
      <View style={s.badge}>
        <Icon size={32} color={theme.neutral} strokeWidth={1.5} />
      </View>
      <Text style={s.title}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>
    </View>
  );
}
