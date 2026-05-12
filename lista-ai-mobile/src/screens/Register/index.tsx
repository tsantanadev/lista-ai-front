import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, Eye, EyeOff, Mail, Lock, User } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/store';
import type { RegisterProps } from '../../navigation/types';
import i18n from '../../i18n';
import { useTheme } from '../../theme/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

export function Register({ navigation }: RegisterProps) {
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { theme } = useTheme();

  const { register, loginGoogle, error, clearError } = useAuthStore();
  const { t } = useTranslation();

  const [_req, response, promptAsync] = Google.useAuthRequest({
    webClientId:     process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId:     process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    scopes:          ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (idToken) {
        setGoogleLoading(true);
        loginGoogle(idToken).finally(() => setGoogleLoading(false));
      }
    } else if (response?.type === 'error') {
      useAuthStore.setState({ error: i18n.t('auth.login.googleError') });
    }
  }, [response]);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) return;
    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      await register(trimmedEmail, password, name.trim());
      // If email verification is required the store sets pendingVerificationEmail
      // without authenticating; navigate to the pending screen.
      const pending = useAuthStore.getState().pendingVerificationEmail;
      if (pending) {
        navigation.navigate('VerifyEmailPending', { email: pending });
      }
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && password.length >= 6;

  const s = StyleSheet.create({
    safe:   { flex: 1, backgroundColor: theme.background },
    flex:   { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },
    logoArea: { alignItems: 'center', marginBottom: 40 },
    logoBox: {
      width: 72, height: 72, borderRadius: 20,
      backgroundColor: `${theme.primary}1E`,
      borderWidth: 1.5, borderColor: `${theme.primary}4D`,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 12,
    },
    appName: { color: theme.textPrimary, fontSize: 26, fontWeight: '700' },
    errorBanner: {
      backgroundColor: `${theme.destructive}1E`,
      borderWidth: 1, borderColor: `${theme.destructive}4D`,
      borderRadius: 10, padding: 12, marginBottom: 16,
    },
    errorText: { color: theme.destructive, fontSize: 13, textAlign: 'center' },
    googleBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: theme.borderSubtle, borderRadius: 12,
      paddingVertical: 14, gap: 10, backgroundColor: theme.surfaceElevated,
    },
    googleG:     { color: theme.textPrimary, fontSize: 16, fontWeight: '700' },
    googleLabel: { color: theme.textPrimary, fontSize: 15, fontWeight: '500' },
    divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
    dividerLine: { flex: 1, height: 1, backgroundColor: theme.borderSubtle },
    dividerText: { color: theme.neutral, fontSize: 12, marginHorizontal: 12 },
    label: { color: theme.neutral, fontSize: 13, fontWeight: '500', marginBottom: 8 },
    inputRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.surfaceElevated, borderWidth: 1.5, borderColor: theme.borderSubtle,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, gap: 10,
    },
    input: { flex: 1, color: theme.textPrimary, fontSize: 15 },
    primaryBtn: {
      backgroundColor: theme.primary, borderRadius: 12,
      paddingVertical: 16, alignItems: 'center', marginTop: 28,
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
    terms: { color: theme.neutral, fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18 },
    termsLink: { color: theme.primary },
    linkRow:   { flexDirection: 'row', justifyContent: 'center' },
    mutedText: { color: theme.neutral, fontSize: 13 },
    link:      { color: theme.primary, fontSize: 13, fontWeight: '600' },
  });

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.logoArea}>
            <View style={s.logoBox}>
              <ShoppingBag size={36} color={theme.primary} strokeWidth={1.6} />
            </View>
            <Text style={s.appName}>Lista AI</Text>
          </View>
          {error ? (
            <TouchableOpacity style={s.errorBanner} onPress={clearError}>
              <Text style={s.errorText}>{error}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={s.googleBtn} onPress={() => promptAsync()} disabled={googleLoading} activeOpacity={0.8}>
            {googleLoading ? (
              <ActivityIndicator size="small" color={theme.textPrimary} />
            ) : (
              <>
                <Text style={s.googleG}>G</Text>
                <Text style={s.googleLabel}>{t('auth.continueWithGoogle')}</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>{t('common.or')}</Text>
            <View style={s.dividerLine} />
          </View>
          <Text style={s.label}>{t('auth.register.fullName')}</Text>
          <View style={s.inputRow}>
            <User size={16} color={theme.neutral} />
            <TextInput style={s.input} placeholder={t('auth.register.namePlaceholder')} placeholderTextColor={theme.neutral} value={name} onChangeText={setName} autoCapitalize="words" onFocus={clearError} />
          </View>
          <Text style={[s.label, { marginTop: 16 }]}>{t('auth.email')}</Text>
          <View style={s.inputRow}>
            <Mail size={16} color={theme.neutral} />
            <TextInput style={s.input} placeholder={t('auth.emailPlaceholder')} placeholderTextColor={theme.neutral} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" onFocus={clearError} />
          </View>
          <Text style={[s.label, { marginTop: 16 }]}>{t('auth.password')}</Text>
          <View style={s.inputRow}>
            <Lock size={16} color={theme.neutral} />
            <TextInput style={s.input} placeholder={t('auth.passwordPlaceholder')} placeholderTextColor={theme.neutral} value={password} onChangeText={setPassword} secureTextEntry={!showPass} autoComplete="new-password" onFocus={clearError} />
            <TouchableOpacity onPress={() => setShowPass((v) => !v)}>
              {showPass ? <Eye size={18} color={theme.neutral} /> : <EyeOff size={18} color={theme.neutral} />}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[s.primaryBtn, !canSubmit && s.primaryBtnDisabled]} onPress={handleRegister} disabled={loading || !canSubmit} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>{t('auth.register.createAccount')}</Text>}
          </TouchableOpacity>
          <Text style={s.terms}>
            {t('auth.register.terms')}{' '}
            <Text style={s.termsLink}>{t('auth.register.termsLink')}</Text>
          </Text>
          <View style={[s.linkRow, { marginTop: 12 }]}>
            <Text style={s.mutedText}>{t('auth.register.alreadyHaveAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={s.link}>{t('auth.register.signIn')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
