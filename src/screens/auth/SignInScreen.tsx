import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import { RootStackParamList } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { signInWithGoogle } from '../../lib/googleAuth';
import { useAuthStore } from '../../store/authStore';
import AppModal from '../../components/AppModal';
import { useAppModal } from '../../hooks/useAppModal';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

const SAFETY_KEY = '@buddyline:safetyAccepted';

export default function SignInScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const { setSession, setProfile } = useAuthStore();
  const { visible, isLoading, config, showModal, handleConfirm, handleCancel } = useAppModal();

  // Shared post-sign-in routing
  const routeAfterSignIn = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) {
      navigation.replace('RoleSelection');
      return;
    }

    setProfile(profile);

    // Incomplete onboarding — send back to finish it
    if (!profile.age_confirmed) {
      navigation.replace('SocialOnboarding');
      return;
    }

    const safetyVal = await AsyncStorage.getItem(SAFETY_KEY);
    const safetyOk = safetyVal === 'true';
    const tosOk = !!profile.tos_accepted_at;
    const verified = profile.verification_status === 'verified';

    if (profile.role === 'admin') {
      navigation.replace('AdminTabs');
    } else if (profile.role === 'beginner') {
      if (!tosOk) navigation.replace('TermsOfService', { nextRoute: 'BeginnerTabs' });
      else if (!safetyOk) navigation.replace('Safety', { nextRoute: 'BeginnerTabs' });
      else navigation.replace('BeginnerTabs');
    } else if (profile.role === 'certified') {
      if (!verified) {
        if (!tosOk) navigation.replace('TermsOfService', { nextRoute: 'VerificationPending' });
        else navigation.replace('VerificationPending');
      } else {
        if (!tosOk) navigation.replace('TermsOfService', { nextRoute: 'CertifiedTabs' });
        else if (!safetyOk) navigation.replace('Safety', { nextRoute: 'CertifiedTabs' });
        else navigation.replace('CertifiedTabs');
      }
    } else if (profile.role === 'instructor') {
      if (!verified) {
        if (!tosOk) navigation.replace('TermsOfService', { nextRoute: 'VerificationPending' });
        else navigation.replace('VerificationPending');
      } else {
        if (!tosOk) navigation.replace('TermsOfService', { nextRoute: 'InstructorTabs' });
        else if (!safetyOk) navigation.replace('Safety', { nextRoute: 'InstructorTabs' });
        else navigation.replace('InstructorTabs');
      }
    } else {
      // Role not set — user abandoned onboarding, resume it
      navigation.replace('SocialOnboarding');
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      showModal({ type: 'error', title: 'Error', message: 'Please fill in all fields.' });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showModal({ type: 'error', title: 'Sign In Failed', message: error.message });
      setLoading(false);
      return;
    }

    setSession(data.session);
    await routeAfterSignIn(data.user.id);
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    try {
      const { data, error } = await signInWithGoogle();
      if (error) {
        showModal({ type: 'error', title: 'Google Sign In Failed', message: (error as Error).message ?? 'Could not complete sign in.' });
        setSocialLoading(null);
        return;
      }
      if (data?.session) {
        setSession(data.session);
        await routeAfterSignIn(data.session.user.id);
      }
    } catch (e) {
      showModal({ type: 'error', title: 'Error', message: 'Google sign in failed. Please try again.' });
    }
    setSocialLoading(null);
  };

  const handleAppleSignIn = async () => {
    setSocialLoading('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        showModal({ type: 'error', title: 'Apple Sign In Failed', message: 'No identity token received.' });
        setSocialLoading(null);
        return;
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error || !data.session) {
        showModal({ type: 'error', title: 'Apple Sign In Failed', message: error?.message ?? 'Could not complete sign in.' });
        setSocialLoading(null);
        return;
      }

      setSession(data.session);
      await routeAfterSignIn(data.session.user.id);
    } catch (e: any) {
      // ERR_CANCELED means user dismissed — don't show error
      if (e?.code !== 'ERR_CANCELED') {
        showModal({ type: 'error', title: 'Error', message: 'Apple sign in failed. Please try again.' });
      }
    }
    setSocialLoading(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Welcome back</Text>
          <Text style={styles.headerSub}>Never dive alone.</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.formCard} keyboardShouldPersistTaps="handled">

          {/* Social sign-in */}
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={handleGoogleSignIn}
            disabled={!!socialLoading || loading}
            activeOpacity={0.85}
          >
            {socialLoading === 'google' ? (
              <ActivityIndicator color={Colors.text} size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#EA4335" />
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialBtn, styles.appleSocialBtn]}
              onPress={handleAppleSignIn}
              disabled={!!socialLoading || loading}
              activeOpacity={0.85}
            >
              {socialLoading === 'apple' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={22} color="#fff" />
                  <Text style={[styles.socialBtnText, { color: '#fff' }]}>Continue with Apple</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>or sign in with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email / password */}
          <Text style={styles.label}>Email address</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="you@email.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={[styles.label, { marginTop: Spacing.md }]}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Your password"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, (loading || !!socialLoading) && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading || !!socialLoading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotLink} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signUpLink} onPress={() => navigation.goBack()}>
            <Text style={styles.signUpText}>
              New here? <Text style={styles.signUpBold}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <AppModal
        visible={visible}
        isLoading={isLoading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        {...config}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryDeep },
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    overflow: 'hidden',
  },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  headerContent: {},
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  headerSub: { fontSize: FontSize.sm, color: Colors.accentLight, marginTop: 4 },
  formCard: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl, gap: Spacing.xs },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  appleSocialBtn: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  socialBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.xs, marginTop: Spacing.xs },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, paddingVertical: 14, fontSize: FontSize.md, color: Colors.text },
  eyeBtn: { padding: Spacing.xs },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 16,
    marginTop: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6, shadowOpacity: 0 },
  buttonText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700', letterSpacing: 0.5 },
  forgotLink: { alignItems: 'center', paddingTop: Spacing.md },
  forgotText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  signUpLink: { alignItems: 'center', paddingVertical: Spacing.lg },
  signUpText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  signUpBold: { color: Colors.primary, fontWeight: '700' },
});
