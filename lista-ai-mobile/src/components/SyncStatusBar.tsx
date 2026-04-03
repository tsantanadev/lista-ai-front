import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RefreshCw, AlertCircle } from 'lucide-react-native';
import { useSync } from '../hooks/useSync';
import { executeSync } from '../sync/executor';

export function SyncStatusBar() {
  const { pendingCount, lastSyncError } = useSync();

  if (!lastSyncError && pendingCount === 0) return null;

  const isError = lastSyncError !== null;

  const handleRetry = async () => {
    try {
      await executeSync();
    } catch {
      // handled by sync layer
    }
  };

  return (
    <TouchableOpacity
      style={[styles.bar, isError ? styles.barError : styles.barPending]}
      onPress={isError ? handleRetry : undefined}
      activeOpacity={isError ? 0.8 : 1}
    >
      {isError
        ? <AlertCircle size={14} color="#FAFAFA" strokeWidth={2} />
        : <RefreshCw size={14} color="#FAFAFA" strokeWidth={2} />}
      <Text style={styles.text}>
        {isError
          ? `Sync error — tap to retry`
          : `Syncing ${pendingCount} item${pendingCount !== 1 ? 's' : ''}…`}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  barPending: { backgroundColor: '#D97706' },
  barError: { backgroundColor: '#EF4444' },
  text: { color: '#FAFAFA', fontSize: 13, fontWeight: '500' },
});
