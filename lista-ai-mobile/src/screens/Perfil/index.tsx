import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings as SettingsIcon, UserCircle, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/store';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export function Perfil() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { theme } = useTheme();

  const displayName  = user?.name ?? user?.email?.split('@')[0] ?? t('profile.defaultName');
  const displayEmail = user?.email ?? '';

  const s = StyleSheet.create({
    safe:   { flex: 1, backgroundColor: theme.background },
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: theme.background },
    title:  { color: theme.textPrimary, fontSize: 28, fontWeight: '700' },
    avatarArea: { alignItems: 'center', paddingTop: 32, paddingBottom: 36 },
    avatarRing: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: `${theme.primary}1E`,
      borderWidth: 2, borderColor: theme.primary,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 16,
    },
    avatarText:  { color: theme.primary, fontSize: 26, fontWeight: '700' },
    userName:    { color: theme.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 4 },
    userEmail:   { color: theme.neutral, fontSize: 14 },
    menu: {
      marginHorizontal: 16,
      backgroundColor: theme.surfaceElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      overflow: 'hidden',
    },
    menuRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 16, gap: 12,
    },
    menuIcon: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: `${theme.primary}1A`,
      alignItems: 'center', justifyContent: 'center',
    },
    menuLabel:  { flex: 1, color: theme.textPrimary, fontSize: 15, fontWeight: '500' },
    separator:  { height: 1, backgroundColor: theme.borderSubtle, marginLeft: 64 },
  });

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>{t('profile.title')}</Text>
      </View>
      <View style={s.avatarArea}>
        <View style={s.avatarRing}>
          <Text style={s.avatarText}>{getInitials(displayName)}</Text>
        </View>
        <Text style={s.userName}>{displayName}</Text>
        <Text style={s.userEmail}>{displayEmail}</Text>
      </View>
      <View style={s.menu}>
        <TouchableOpacity style={s.menuRow} activeOpacity={0.75} onPress={() => navigation.navigate('PerfilInfo')}>
          <View style={s.menuIcon}>
            <UserCircle size={20} color={theme.primary} strokeWidth={1.6} />
          </View>
          <Text style={s.menuLabel}>{t('profile.profileInfo')}</Text>
          <ChevronRight size={18} color={theme.neutral} />
        </TouchableOpacity>
        <View style={s.separator} />
        <TouchableOpacity style={s.menuRow} activeOpacity={0.75} onPress={() => navigation.navigate('Settings')}>
          <View style={s.menuIcon}>
            <SettingsIcon size={20} color={theme.primary} strokeWidth={1.6} />
          </View>
          <Text style={s.menuLabel}>{t('profile.settingsLabel')}</Text>
          <ChevronRight size={18} color={theme.neutral} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
