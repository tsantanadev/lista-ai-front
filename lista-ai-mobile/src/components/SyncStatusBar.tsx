import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RefreshCw, AlertCircle } from 'lucide-react-native';
import { useSync } from '../hooks/useSync';
import { executeSync } from '../sync/executor';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';

export function SyncStatusBar() {
  const { pendingCount, lastSyncError } = useSync();
  const { t } = useTranslation();
  const { theme } = useTheme();

  if (!lastSyncError && pendingCount === 0) return null;

  const isError = !!lastSyncError;

  const handleRetry = async () => {
    try { await executeSync(); } catch { /* handled by sync layer */ }
  };

  const s = StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 6,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    barError: { backgroundColor: theme.destructive },
    text: { color: theme.neutral, fontSize: 12, fontWeight: '500' },
  });

  return (
    <TouchableOpacity
      style={[s.bar, isError && s.barError]}
      onPress={isError ? handleRetry : undefined}
      activeOpacity={isError ? 0.8 : 1}
    >
      {isError
        ? <AlertCircle size={14} color={theme.textPrimary} strokeWidth={2} />
        : <RefreshCw size={14} color={theme.textPrimary} strokeWidth={2} />}
      <Text style={s.text}>
        {isError
          ? t('sync.error')
          : t('sync.syncing', { count: pendingCount })}
      </Text>
    </TouchableOpacity>
  );
}
