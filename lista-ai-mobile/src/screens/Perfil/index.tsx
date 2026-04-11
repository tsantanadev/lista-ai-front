import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, UserCircle, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/store';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

const C = {
  bg:      '#111210',
  surface: '#161A18',
  border:  '#1A2420',
  primary: '#1D9E75',
  text:    '#EEF2F0',
  textSub: '#888780',
} as const;

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function Perfil() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const displayName  = user?.name ?? user?.email?.split('@')[0] ?? t('profile.defaultName');
  const displayEmail = user?.email ?? '';

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>{t('profile.title')}</Text>
      </View>

      {/* Avatar */}
      <View style={s.avatarArea}>
        <View style={s.avatarRing}>
          <Text style={s.avatarText}>{getInitials(displayName)}</Text>
        </View>
        <Text style={s.userName}>{displayName}</Text>
        <Text style={s.userEmail}>{displayEmail}</Text>
      </View>

      {/* Menu rows */}
      <View style={s.menu}>
        <TouchableOpacity
          style={s.menuRow}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('PerfilInfo')}
        >
          <View style={s.menuIcon}>
            <UserCircle size={20} color={C.primary} strokeWidth={1.6} />
          </View>
          <Text style={s.menuLabel}>{t('profile.profileInfo')}</Text>
          <ChevronRight size={18} color={C.textSub} />
        </TouchableOpacity>

        <View style={s.separator} />

        <TouchableOpacity style={s.menuRow} activeOpacity={0.75}>
          <View style={s.menuIcon}>
            <Settings size={20} color={C.primary} strokeWidth={1.6} />
          </View>
          <Text style={s.menuLabel}>{t('profile.settingsLabel')}</Text>
          <ChevronRight size={18} color={C.textSub} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title:  { color: C.text, fontSize: 28, fontWeight: '700' },

  avatarArea: { alignItems: 'center', paddingTop: 32, paddingBottom: 36 },
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(29,158,117,0.12)',
    borderWidth: 2, borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText:  { color: C.primary, fontSize: 26, fontWeight: '700' },
  userName:    { color: C.text,    fontSize: 20, fontWeight: '700', marginBottom: 4 },
  userEmail:   { color: C.textSub, fontSize: 14 },

  menu: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, gap: 12,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(29,158,117,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel:  { flex: 1, color: C.text, fontSize: 15, fontWeight: '500' },
  separator:  { height: 1, backgroundColor: C.border, marginLeft: 64 },
});
