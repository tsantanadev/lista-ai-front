import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Camera, Pencil, Lock, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/store';
import { saveAuth, loadAuth } from '../../auth/storage';
import type { PerfilInfoProps } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { getActivePendingCount } from '../../sync/queue';
import { executeSync } from '../../sync/executor';

const LOCAL_PROFILE_KEY = 'local.profile';
type LocalProfile = { phone: string; address: string };

type SyncPhase = 'idle' | 'syncing' | 'done' | 'failed';

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export function PerfilInfo({ navigation }: PerfilInfoProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { theme } = useTheme();

  const [name, setName]       = useState(user?.name ?? '');
  const [phone, setPhone]     = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving]   = useState(false);

  const [syncModalVisible, setSyncModalVisible]   = useState(false);
  const [syncPhase, setSyncPhase]                 = useState<SyncPhase>('idle');
  const [syncProgress, setSyncProgress]           = useState({ done: 0, total: 0 });
  const [syncFailures, setSyncFailures]           = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(LOCAL_PROFILE_KEY)
      .then((raw) => {
        if (raw) {
          const local: LocalProfile = JSON.parse(raw);
          setPhone(local.phone ?? '');
          setAddress(local.address ?? '');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (syncPhase === 'done') {
      const timer = setTimeout(() => logout(), 800);
      return () => clearTimeout(timer);
    }
  }, [syncPhase, logout]);

  async function handleSave() {
    setSaving(true);
    try {
      const stored = await loadAuth();
      if (stored && user) {
        const updatedUser = { ...user, name: name.trim() || user.name };
        await saveAuth(stored.tokens, updatedUser);
        useAuthStore.setState({ user: updatedUser });
      }
      const local: LocalProfile = { phone: phone.trim(), address: address.trim() };
      await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(local));
      navigation.goBack();
    } catch {
      Alert.alert(t('common.error'), t('profile.info.errorSaving'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmLogout() {
    const pending = await getActivePendingCount();
    if (pending === 0) {
      Alert.alert(
        t('profile.info.signOutTitle'),
        t('profile.info.signOutMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profile.info.signOutConfirm'), style: 'destructive', onPress: () => logout() },
        ],
      );
    } else {
      setSyncProgress({ done: 0, total: pending });
      setSyncPhase('idle');
      setSyncModalVisible(true);
    }
  }

  async function handleSyncAndLogout() {
    setSyncPhase('syncing');
    const result = await executeSync((done, total) => {
      setSyncProgress({ done, total });
    });
    if (result.failed > 0) {
      setSyncFailures(result.failed);
      setSyncPhase('failed');
    } else {
      setSyncPhase('done');
    }
  }

  function handleSignOutAnyway() {
    setSyncModalVisible(false);
    logout();
  }

  const isSyncing = syncPhase === 'syncing';

  const displayName = user?.name ?? '';

  const s = StyleSheet.create({
    safe:   { flex: 1, backgroundColor: theme.background },
    flex:   { flex: 1 },
    scroll: { paddingBottom: 40 },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: theme.borderSubtle,
      backgroundColor: theme.background,
    },
    headerTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '600' },
    saveBtn:     { color: theme.primary, fontSize: 16, fontWeight: '600' },
    avatarArea: { alignItems: 'center', paddingVertical: 32 },
    avatarRing: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: `${theme.primary}1E`,
      borderWidth: 2, borderColor: theme.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: theme.primary, fontSize: 26, fontWeight: '700' },
    cameraBtn: {
      position: 'absolute', bottom: 28, right: '32%',
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    fields: {
      marginHorizontal: 16,
      backgroundColor: theme.surfaceElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      overflow: 'hidden',
    },
    fieldRow:       { paddingHorizontal: 16, paddingVertical: 14 },
    fieldLabel:     { color: theme.neutral, fontSize: 12, fontWeight: '500', marginBottom: 6 },
    fieldInput:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
    fieldText:      { flex: 1, color: theme.textPrimary, fontSize: 15 },
    fieldTextMuted: { color: theme.neutral },
    divider:        { height: 1, backgroundColor: theme.borderSubtle, marginLeft: 16 },
    deleteBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, marginTop: 32,
    },
    deleteText: { color: theme.destructive, fontSize: 14, fontWeight: '600' },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 24,
    },
    modalCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 24,
      width: '100%' as const,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 12,
    },
    modalTitle: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    },
    modalBody: {
      color: theme.neutral,
      fontSize: 14,
      textAlign: 'center' as const,
      lineHeight: 20,
    },
    progressTrack: {
      height: 4,
      backgroundColor: theme.progressTrack,
      borderRadius: 2,
      overflow: 'hidden' as const,
    },
    progressFill: {
      height: 4,
      backgroundColor: theme.primary,
      borderRadius: 2,
    },
    primaryBtn: {
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center' as const,
    },
    primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
    destructiveBtn: {
      backgroundColor: theme.destructive,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center' as const,
    },
    destructiveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
    ghostBtn: { paddingVertical: 10, alignItems: 'center' as const },
    ghostBtnText: { color: theme.neutral, fontSize: 14 },
  });

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
            <ChevronLeft size={26} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('profile.info.title')}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={theme.primary} /> : <Text style={s.saveBtn}>{t('common.save')}</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.avatarArea}>
            <View style={s.avatarRing}>
              <Text style={s.avatarText}>{getInitials(displayName)}</Text>
            </View>
            <View style={s.cameraBtn}>
              <Camera size={14} color={theme.background} />
            </View>
          </View>
          <View style={s.fields}>
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>{t('profile.info.name')}</Text>
              <View style={s.fieldInput}>
                <TextInput style={s.fieldText} value={name} onChangeText={setName} placeholderTextColor={theme.neutral} autoCapitalize="words" />
                <Pencil size={16} color={theme.neutral} />
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>{t('profile.info.email')}</Text>
              <View style={s.fieldInput}>
                <TextInput style={[s.fieldText, s.fieldTextMuted]} value={user?.email ?? ''} editable={false} placeholderTextColor={theme.neutral} />
                <Lock size={16} color={theme.neutral} />
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>{t('profile.info.phone')}</Text>
              <View style={s.fieldInput}>
                <TextInput style={s.fieldText} value={phone} onChangeText={setPhone} placeholder={t('profile.info.phonePlaceholder')} placeholderTextColor={theme.neutral} keyboardType="phone-pad" />
                <Pencil size={16} color={theme.neutral} />
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>{t('profile.info.address')}</Text>
              <View style={s.fieldInput}>
                <TextInput style={s.fieldText} value={address} onChangeText={setAddress} placeholder={t('profile.info.addressPlaceholder')} placeholderTextColor={theme.neutral} />
                <Pencil size={16} color={theme.neutral} />
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>{t('profile.info.password')}</Text>
              <View style={s.fieldInput}>
                <TextInput style={[s.fieldText, s.fieldTextMuted]} value="••••••••" editable={false} secureTextEntry={false} />
                <Pencil size={16} color={theme.neutral} />
              </View>
            </View>
          </View>
          <TouchableOpacity style={s.deleteBtn} onPress={confirmLogout} activeOpacity={0.8}>
            <Trash2 size={16} color={theme.destructive} />
            <Text style={s.deleteText}>{t('profile.info.signOut')}</Text>
          </TouchableOpacity>
        </ScrollView>
        <Modal
          visible={syncModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => syncPhase !== 'syncing' && setSyncModalVisible(false)}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>{t('profile.info.syncWarningTitle')}</Text>

              {syncPhase === 'idle' && (
                <>
                  <Text style={s.modalBody}>
                    {t('profile.info.syncWarningMessage', { count: syncProgress.total })}
                  </Text>
                  <TouchableOpacity style={s.primaryBtn} onPress={handleSyncAndLogout} activeOpacity={0.8} disabled={isSyncing}>
                    <Text style={s.primaryBtnText}>{t('profile.info.syncAndSignOut')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.ghostBtn} onPress={handleSignOutAnyway} activeOpacity={0.8}>
                    <Text style={s.ghostBtnText}>{t('profile.info.signOutAnyway')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.ghostBtn} onPress={() => setSyncModalVisible(false)} activeOpacity={0.8}>
                    <Text style={s.ghostBtnText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                </>
              )}

              {syncPhase === 'syncing' && (
                <>
                  <Text style={s.modalBody}>
                    {t('profile.info.syncingProgress', { done: syncProgress.done, total: syncProgress.total })}
                  </Text>
                  <View style={s.progressTrack}>
                    <View
                      style={[
                        s.progressFill,
                        { width: `${syncProgress.total > 0 ? Math.round((syncProgress.done / syncProgress.total) * 100) : 0}%` },
                      ]}
                    />
                  </View>
                </>
              )}

              {syncPhase === 'done' && (
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: '100%' }]} />
                </View>
              )}

              {syncPhase === 'failed' && (
                <>
                  <Text style={s.modalBody}>
                    {t('profile.info.syncFailedMessage', { count: syncFailures })}
                  </Text>
                  <TouchableOpacity style={s.destructiveBtn} onPress={handleSignOutAnyway} activeOpacity={0.8}>
                    <Text style={s.destructiveBtnText}>{t('profile.info.signOutAnyway')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.ghostBtn} onPress={() => setSyncModalVisible(false)} activeOpacity={0.8}>
                    <Text style={s.ghostBtnText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
