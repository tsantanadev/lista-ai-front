import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, Clock, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';
import { useTheme } from '../../theme/ThemeContext';
import { apiVerifyEmail } from '../../api/auth';
import type { VerifyEmailProps } from '../../navigation/types';

type VerifyState = 'loading' | 'success' | 'invalid' | 'expired' | 'networkError';

export function VerifyEmail({ route, navigation }: VerifyEmailProps) {
  const { token } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [state, setState] = useState<VerifyState>('loading');

  const verify = useCallback(() => {
    setState('loading');
    apiVerifyEmail(token)
      .then(() => setState('success'))
      .catch((e: AxiosError) => {
        if (!e.response) {
          setState('networkError');
        } else if (e.response.status === 410) {
          setState('expired');
        } else {
          setState('invalid');
        }
      });
  }, [token]);

  useEffect(() => {
    verify();
  }, [verify]);

  const s = StyleSheet.create({
    safe:     { flex: 1, backgroundColor: theme.background },
    scroll:   { flexGrow: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32, alignItems: 'center' },
    iconBox: {
      width: 80, height: 80, borderRadius: 24,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 24,
    },
    title:    { color: theme.textPrimary, fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
    body:     { color: theme.neutral, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
    primaryBtn: {
      backgroundColor: theme.primary, borderRadius: 12,
      paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center',
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    secondaryBtn: {
      borderWidth: 1.5, borderColor: theme.borderSubtle, borderRadius: 12,
      paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center', marginTop: 12,
    },
    secondaryBtnText: { color: theme.textPrimary, fontSize: 16, fontWeight: '600' },
  });

  if (state === 'loading') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[s.body, { marginTop: 16, marginBottom: 0 }]}>
            {t('auth.verification.verify.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'success') {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={[s.iconBox, { backgroundColor: `${theme.primary}1E` }]}>
            <CheckCircle size={44} color={theme.primary} strokeWidth={1.6} />
          </View>
          <Text style={s.title}>{t('auth.verification.verify.successTitle')}</Text>
          <Text style={s.body}>{t('auth.verification.verify.successBody')}</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={s.primaryBtnText}>{t('auth.verification.verify.goToLogin')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (state === 'expired') {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={[s.iconBox, { backgroundColor: `${theme.accent}1E` }]}>
            <Clock size={44} color={theme.accent} strokeWidth={1.6} />
          </View>
          <Text style={s.title}>{t('auth.verification.verify.expiredTitle')}</Text>
          <Text style={s.body}>{t('auth.verification.verify.expiredBody')}</Text>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => navigation.navigate('VerifyEmailPending', { email: '' })}
            activeOpacity={0.85}
          >
            <Text style={s.primaryBtnText}>{t('auth.verification.verify.requestNewLink')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={s.secondaryBtnText}>{t('auth.verification.pending.backToLogin')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (state === 'networkError') {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={[s.iconBox, { backgroundColor: `${theme.neutral}1E` }]}>
            <WifiOff size={44} color={theme.neutral} strokeWidth={1.6} />
          </View>
          <Text style={s.title}>{t('auth.verification.verify.networkErrorTitle')}</Text>
          <Text style={s.body}>{t('auth.verification.verify.networkErrorBody')}</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={verify} activeOpacity={0.85}>
            <Text style={s.primaryBtnText}>{t('auth.verification.verify.retry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={s.secondaryBtnText}>{t('auth.verification.pending.backToLogin')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // invalid (400 or unexpected status)
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.iconBox, { backgroundColor: `${theme.destructive}1E` }]}>
          <XCircle size={44} color={theme.destructive} strokeWidth={1.6} />
        </View>
        <Text style={s.title}>{t('auth.verification.verify.invalidTitle')}</Text>
        <Text style={s.body}>{t('auth.verification.verify.invalidBody')}</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
          <Text style={s.primaryBtnText}>{t('auth.verification.pending.backToLogin')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
