import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Check, Globe, RefreshCw, Monitor, Moon, Sun } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SyncStatusBar } from '../../components/SyncStatusBar';
import { useSync } from '../../hooks/useSync';
import { executeSync } from '../../sync/executor';
import { useStore } from '../../store';
import { SUPPORTED_LOCALES, type Locale } from '../../store/languageSlice';
import { useTheme, type ThemePreference } from '../../theme/ThemeContext';

const THEME_OPTIONS: { value: ThemePreference; icon: typeof Monitor; labelKey: string }[] = [
  { value: 'system', icon: Monitor, labelKey: 'settings.theme.system' },
  { value: 'dark',   icon: Moon,    labelKey: 'settings.theme.dark'   },
  { value: 'light',  icon: Sun,     labelKey: 'settings.theme.light'  },
];

export function Settings() {
  const { t } = useTranslation();
  const { theme, preference, setPreference } = useTheme();
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

  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.container}>
      <SyncStatusBar />

      <View style={s.header}>
        <Text style={s.title}>{t('settings.title')}</Text>
      </View>

      {/* Appearance section */}
      <Text style={s.sectionLabel}>{t('settings.appearance.title').toUpperCase()}</Text>
      <View style={s.card}>
        <Text style={s.cardTitle}>{t('settings.appearance.theme')}</Text>
        <Text style={s.cardSubtitle}>{t('settings.appearance.themeSubtitle')}</Text>
        <View style={s.toggleRow}>
          {THEME_OPTIONS.map(({ value, icon: Icon, labelKey }) => {
            const isActive = preference === value;
            return (
              <TouchableOpacity
                key={value}
                style={[s.toggleBtn, isActive && s.toggleBtnActive]}
                onPress={() => setPreference(value)}
                activeOpacity={0.8}
              >
                <Icon
                  size={20}
                  color={isActive ? theme.primary : theme.neutral}
                  strokeWidth={1.8}
                />
                <Text style={[s.toggleLabel, isActive && s.toggleLabelActive]}>
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Language section */}
      <Text style={s.sectionLabel}>{t('settings.language.title').toUpperCase()}</Text>
      <View style={s.card}>
        <TouchableOpacity
          style={s.row}
          onPress={() => setSheetVisible(true)}
          activeOpacity={0.75}
        >
          <View style={s.rowIcon}>
            <Globe size={18} color={theme.primary} strokeWidth={1.8} />
          </View>
          <Text style={s.rowLabel}>{t('settings.language.title')}</Text>
          <Text style={s.rowValue}>
            {t(`settings.languages.${language}` as const)}
          </Text>
          <ChevronRight size={16} color={theme.neutral} />
        </TouchableOpacity>
      </View>

      {/* Sync section */}
      {(lastSyncError || pendingCount > 0) && (
        <>
          <Text style={s.sectionLabel}>{t('settings.sync.retrySync').toUpperCase()}</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.row} onPress={handleRetry} activeOpacity={0.75}>
              <View style={s.rowIcon}>
                <RefreshCw size={18} color={theme.primary} strokeWidth={1.8} />
              </View>
              <Text style={s.rowLabel}>{t('settings.sync.retrySync')}</Text>
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
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setSheetVisible(false)}
        />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>{t('settings.language.sheetTitle')}</Text>
          {SUPPORTED_LOCALES.map((locale) => (
            <TouchableOpacity
              key={locale}
              style={s.localeRow}
              onPress={() => handleSelectLanguage(locale)}
              activeOpacity={0.75}
            >
              <Text style={[s.localeName, locale === language && s.localeNameActive]}>
                {t(`settings.languages.${locale}` as const)}
              </Text>
              {locale === language && (
                <Check size={18} color={theme.primary} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header:    { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    title:     { color: theme.textPrimary, fontSize: 28, fontWeight: '700' },

    sectionLabel: {
      color: theme.neutral,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.8,
      marginHorizontal: 16,
      marginTop: 24,
      marginBottom: 8,
    },
    card: {
      marginHorizontal: 16,
      backgroundColor: theme.surfaceElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      overflow: 'hidden',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    cardTitle:    { color: theme.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 2 },
    cardSubtitle: { color: theme.neutral, fontSize: 13, marginBottom: 14 },

    toggleRow: { flexDirection: 'row', gap: 8 },
    toggleBtn: {
      flex: 1,
      backgroundColor: theme.background,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    toggleBtnActive: {
      borderColor: theme.primary,
      borderWidth: 2,
      backgroundColor: `${theme.primary}1A`,
    },
    toggleLabel:       { color: theme.neutral, fontSize: 11 },
    toggleLabelActive: { color: theme.primary, fontWeight: '600' },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: `${theme.primary}1A`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: { flex: 1, color: theme.textPrimary, fontSize: 15, fontWeight: '500' },
    rowValue: { color: theme.neutral, fontSize: 14, marginRight: 4 },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: theme.surfaceElevated,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 32,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      backgroundColor: theme.progressTrack,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 8,
    },
    sheetTitle: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderSubtle,
    },
    localeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderSubtle,
    },
    localeName:       { color: theme.neutral, fontSize: 16 },
    localeNameActive: { color: theme.textPrimary, fontWeight: '600' },
  });
}
