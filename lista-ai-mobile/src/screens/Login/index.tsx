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
import { ShoppingBag, Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/store';
import type { LoginProps } from '../../navigation/types';
import i18n from '../../i18n';

WebBrowser.maybeCompleteAuthSession();

const C = {
  bg:      '#111210',
  surface: '#161A18',
  border:  '#1A2420',
  primary: '#1D9E75',
  text:    '#EEF2F0',
  textSub: '#888780',
  danger:  '#EF4444',
} as const;

export function Login({ navigation }: LoginProps) {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { loginLocal, loginGoogle, error, clearError } = useAuthStore();
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

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      await loginLocal(email.trim().toLowerCase(), password);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={s.logoArea}>
            <View style={s.logoBox}>
              <ShoppingBag size={36} color={C.primary} strokeWidth={1.6} />
            </View>
            <Text style={s.appName}>Lista AI</Text>
          </View>

          {/* Error banner */}
          {error ? (
            <TouchableOpacity style={s.errorBanner} onPress={clearError}>
              <Text style={s.errorText}>{error}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Google button */}
          <TouchableOpacity
            style={s.googleBtn}
            onPress={() => promptAsync()}
            disabled={googleLoading}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={C.text} />
            ) : (
              <>
                <Text style={s.googleG}>G</Text>
                <Text style={s.googleLabel}>{t('auth.continueWithGoogle')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>{t('common.or')}</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Email */}
          <Text style={s.label}>{t('auth.email')}</Text>
          <View style={s.inputRow}>
            <Mail size={16} color={C.textSub} />
            <TextInput
              style={s.input}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={C.textSub}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              onFocus={clearError}
            />
          </View>

          {/* Password */}
          <Text style={[s.label, { marginTop: 16 }]}>{t('auth.password')}</Text>
          <View style={s.inputRow}>
            <Lock size={16} color={C.textSub} />
            <TextInput
              style={s.input}
              placeholder={t('auth.passwordPlaceholder')}
              placeholderTextColor={C.textSub}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoComplete="current-password"
              onFocus={clearError}
            />
            <TouchableOpacity onPress={() => setShowPass((v) => !v)}>
              {showPass
                ? <Eye size={18} color={C.textSub} />
                : <EyeOff size={18} color={C.textSub} />}
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.primaryBtn, (loading || !email || !password) && s.primaryBtnDisabled]}
            onPress={handleLogin}
            disabled={loading || !email || !password}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>{t('auth.login.signIn')}</Text>}
          </TouchableOpacity>

          {/* Forgot */}
          <TouchableOpacity style={s.linkRow}>
            <Text style={s.linkText}>{t('auth.login.forgotPassword')}</Text>
          </TouchableOpacity>

          {/* Register */}
          <View style={[s.linkRow, { marginTop: 4 }]}>
            <Text style={s.mutedText}>{t('auth.login.noAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={s.link}>{t('auth.login.signUp')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  flex:   { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },

  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(29,158,117,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(29,158,117,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  appName: { color: C.text, fontSize: 26, fontWeight: '700' },

  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorText: { color: C.danger, fontSize: 13, textAlign: 'center' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingVertical: 14, gap: 10, backgroundColor: C.surface,
  },
  googleG:     { color: C.text, fontSize: 16, fontWeight: '700' },
  googleLabel: { color: C.text, fontSize: 15, fontWeight: '500' },

  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { color: C.textSub, fontSize: 12, marginHorizontal: 12 },

  label: { color: C.textSub, fontSize: 13, fontWeight: '500', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, gap: 10,
  },
  input: { flex: 1, color: C.text, fontSize: 15 },

  primaryBtn: {
    backgroundColor: C.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 28,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },

  linkRow:   { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  linkText:  { color: C.textSub, fontSize: 13 },
  mutedText: { color: C.textSub, fontSize: 13 },
  link:      { color: C.primary, fontSize: 13, fontWeight: '600' },
});
