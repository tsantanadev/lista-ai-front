import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingCart } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';

export function Compras() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header:    { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    title:     { color: theme.textPrimary, fontSize: 28, fontWeight: '700' },
    empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
    iconBadge: {
      width: 64,
      height: 64,
      borderRadius: 9999,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle:    { color: theme.textPrimary, fontSize: 16, fontWeight: '600' },
    emptySubtitle: { color: theme.neutral, fontSize: 13, textAlign: 'center' },
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t('shopping.title')}</Text>
      </View>
      <View style={s.empty}>
        <View style={s.iconBadge}>
          <ShoppingCart size={28} color={theme.neutral} strokeWidth={1.5} />
        </View>
        <Text style={s.emptyTitle}>{t('shopping.comingSoon')}</Text>
        <Text style={s.emptySubtitle}>{t('shopping.description')}</Text>
      </View>
    </SafeAreaView>
  );
}
