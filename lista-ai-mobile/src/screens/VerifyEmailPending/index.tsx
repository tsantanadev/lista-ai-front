import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { apiResendVerification } from '../../api/auth';
import type { AxiosError } from 'axios';
import type { VerifyEmailPendingProps } from '../../navigation/types';

type ResendResult = 'success' | 'cooldown' | 'error' | null;

export function VerifyEmailPending({ route, navigation }: VerifyEmailPendingProps) {
  const { email } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [emailValue, setEmailValue] = useState(email);
  const [resending, setResending]   = useState(false);
  const [resendResult, setResendResult] = useState<ResendResult>(null);

  async function handleResend() {
    setResending(true);
    setResendResult(null);
    try {
      await apiResendVerification(emailValue);
      setResendResult('success');
    } catch (e: unknown) {
      const status = (e as AxiosError)?.response?.status;
      setResendResult(status === 429 ? 'cooldown' : 'error');
    } finally {
      setResending(false);
    }
  }

  const s = StyleSheet.create({
    safe:        { flex: 1, backgroundColor: theme.background },
    scroll:      { flexGrow: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32 },
    iconArea:    { alignItems: 'center', marginBottom: 32 },
    iconBox: {
      width: 80, height: 80, borderRadius: 24,
      backgroundColor: `${theme.primary}1E`,
      borderWidth: 1.5, borderColor: `${theme.primary}4D`,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 24,
    },
    title:       { color: theme.textPrimary, fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
    body:        { color: theme.neutral, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
    email:       { color: theme.textPrimary, fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 32 },
    emailInput: {
      color: theme.textPrimary, fontSize: 15, fontWeight: '600', textAlign: 'center',
      backgroundColor: theme.surfaceElevated, borderWidth: 1.5, borderColor: theme.borderSubtle,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 32,
    },
    primaryBtn: {
      backgroundColor: theme.primary, borderRadius: 12,
      paddingVertical: 16, alignItems: 'center', marginBottom: 16,
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    feedbackBanner: {
      borderRadius: 10, padding: 12, marginBottom: 16,
      borderWidth: 1,
    },
    feedbackSuccess: {
      backgroundColor: `${theme.primary}1E`,
      borderColor: `${theme.primary}4D`,
    },
    feedbackCooldown: {
      backgroundColor: `${theme.accent}1E`,
      borderColor: `${theme.accent}4D`,
    },
    feedbackError: {
      backgroundColor: `${theme.destructive}1E`,
      borderColor: `${theme.destructive}4D`,
    },
    feedbackText:         { fontSize: 13, textAlign: 'center' },
    feedbackTextSuccess:  { color: theme.primary },
    feedbackTextCooldown: { color: theme.accent },
    feedbackTextError:    { color: theme.destructive },
    linkRow:    { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
    link:       { color: theme.primary, fontSize: 14, fontWeight: '600' },
  });

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.iconArea}>
          <View style={s.iconBox}>
            <Mail size={40} color={theme.primary} strokeWidth={1.6} />
          </View>
          <Text style={s.title}>{t('auth.verification.pending.title')}</Text>
          <Text style={s.body}>{t('auth.verification.pending.instructions')}</Text>
          {email ? (
            <Text style={s.email}>{emailValue}</Text>
          ) : (
            <TextInput
              style={s.emailInput}
              value={emailValue}
              onChangeText={setEmailValue}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={theme.neutral}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          )}
        </View>

        {resendResult === 'success' && (
          <View style={[s.feedbackBanner, s.feedbackSuccess]}>
            <Text style={[s.feedbackText, s.feedbackTextSuccess]}>
              {t('auth.verification.pending.resendSuccess')}
            </Text>
          </View>
        )}
        {resendResult === 'cooldown' && (
          <View style={[s.feedbackBanner, s.feedbackCooldown]}>
            <Text style={[s.feedbackText, s.feedbackTextCooldown]}>
              {t('auth.verification.pending.resendCooldown')}
            </Text>
          </View>
        )}
        {resendResult === 'error' && (
          <View style={[s.feedbackBanner, s.feedbackError]}>
            <Text style={[s.feedbackText, s.feedbackTextError]}>
              {t('auth.verification.pending.resendError')}
            </Text>
          </View>
        )}

        <TouchableOpacity style={s.primaryBtn} onPress={handleResend} disabled={resending} activeOpacity={0.85}>
          {resending
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.primaryBtnText}>{t('auth.verification.pending.resendButton')}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={s.linkRow} onPress={() => navigation.navigate('Login')}>
          <Text style={s.link}>{t('auth.verification.pending.backToLogin')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
