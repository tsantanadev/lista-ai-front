import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SyncStatusBar } from '../../components/SyncStatusBar';
import { useSync } from '../../hooks/useSync';
import { executeSync } from '../../sync/executor';

export function Settings() {
  const { lastSyncError, pendingCount } = useSync();

  const handleRetry = async () => {
    try {
      await executeSync();
    } catch {
      // handled by sync layer
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <SyncStatusBar />
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
        {(lastSyncError || pendingCount > 0) && (
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
            <Text style={styles.retryText}>Retry Sync</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111210' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#EEF2F0', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#888780', fontSize: 16, marginBottom: 32 },
  retryButton: {
    backgroundColor: '#1D9E75',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: '#EEF2F0', fontWeight: '600' },
});
