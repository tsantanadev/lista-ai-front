import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Check, Globe, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SyncStatusBar } from '../../components/SyncStatusBar';
import { useSync } from '../../hooks/useSync';
import { executeSync } from '../../sync/executor';
import { useStore } from '../../store';
import { SUPPORTED_LOCALES, type Locale } from '../../store/languageSlice';

export function Settings() {
  const { t } = useTranslation();
  const { lastSyncError, pendingCount } = useSync();
  const language    = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);
  const [sheetVisible, setSheetVisible] = useState(false);

  const handleRetry = async () => {
    try { await executeSync(); } catch { /* handled by sync layer */ }
  };

  const handleSelectLanguage = async (lang: Locale) => {
    await setLanguage(lang);
    setSheetVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <SyncStatusBar />

      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
      </View>

      {/* Language section */}
      <Text style={styles.sectionLabel}>
        {t('settings.language.title').toUpperCase()}
      </Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => setSheetVisible(true)}
          activeOpacity={0.75}
        >
          <View style={styles.rowIcon}>
            <Globe size={18} color="#1D9E75" strokeWidth={1.8} />
          </View>
          <Text style={styles.rowLabel}>{t('settings.language.title')}</Text>
          <Text style={styles.rowValue}>
            {t(`settings.languages.${language}` as const)}
          </Text>
          <ChevronRight size={16} color="#888780" />
        </TouchableOpacity>
      </View>

      {/* Sync section — only shown when there's something to act on */}
      {(lastSyncError || pendingCount > 0) && (
        <>
          <Text style={styles.sectionLabel}>
            {t('settings.sync.retrySync').toUpperCase()}
          </Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={handleRetry}
              activeOpacity={0.75}
            >
              <View style={styles.rowIcon}>
                <RefreshCw size={18} color="#1D9E75" strokeWidth={1.8} />
              </View>
              <Text style={styles.rowLabel}>{t('settings.sync.retrySync')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Language bottom sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setSheetVisible(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {t('settings.language.sheetTitle')}
          </Text>
          {SUPPORTED_LOCALES.map((locale) => (
            <TouchableOpacity
              key={locale}
              style={styles.localeRow}
              onPress={() => handleSelectLanguage(locale)}
              activeOpacity={0.75}
            >
              <Text style={[
                styles.localeName,
                locale === language && styles.localeNameActive,
              ]}>
                {t(`settings.languages.${locale}` as const)}
              </Text>
              {locale === language && (
                <Check size={18} color="#1D9E75" strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111210' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title:  { color: '#EEF2F0', fontSize: 28, fontWeight: '700' },

  sectionLabel: {
    color: '#888780',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#161A18',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1A2420',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(29,158,117,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, color: '#EEF2F0', fontSize: 15, fontWeight: '500' },
  rowValue: { color: '#888780', fontSize: 14, marginRight: 4 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#161A18',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  sheetTitle: {
    color: '#EEF2F0',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2420',
  },
  localeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2420',
  },
  localeName:       { color: '#888780', fontSize: 16 },
  localeNameActive: { color: '#EEF2F0', fontWeight: '600' },
});
