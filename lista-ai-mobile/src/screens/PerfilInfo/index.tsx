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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Camera, Pencil, Lock, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/store';
import { saveAuth, loadAuth } from '../../auth/storage';
import type { PerfilInfoProps } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';

const LOCAL_PROFILE_KEY = 'local.profile';
type LocalProfile = { phone: string; address: string };

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

  function confirmLogout() {
    Alert.alert(
      t('profile.info.signOutTitle'),
      t('profile.info.signOutMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.info.signOutConfirm'), style: 'destructive', onPress: () => logout() },
      ],
    );
  }

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
