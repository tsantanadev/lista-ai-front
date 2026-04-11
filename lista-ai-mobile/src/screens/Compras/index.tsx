import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingCart } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export function Compras() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('shopping.title')}</Text>
      </View>
      <View style={styles.empty}>
        <View style={styles.iconBadge}>
          <ShoppingCart size={28} color="#888780" strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>{t('shopping.comingSoon')}</Text>
        <Text style={styles.emptySubtitle}>{t('shopping.description')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111210' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { color: '#EEF2F0', fontSize: 28, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    backgroundColor: '#1A1C1A',
    borderWidth: 1,
    borderColor: '#0F2E28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: '#EEF2F0', fontSize: 16, fontWeight: '600' },
  emptySubtitle: { color: '#888780', fontSize: 13, textAlign: 'center' },
});
