import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { signInWithGoogle } from '../../lib/googleAuth';
import { formatAppleName, setDisplayNameIfEmpty } from '../../lib/profile';
import { useAuthStore } from '../../store/authStore';
import AppModal from '../../components/AppModal';
import { useAppModal } from '../../hooks/useAppModal';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const { setSession } = useAuthStore();
  const { visible, isLoading, config, showModal, handleConfirm, handleCancel } = useAppModal();

  // After social auth: new users go to onboarding, returning users go to Sign In
  const routeAfterSocialAuth = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('age_confirmed')
      .eq('id', userId)
      .single();

    if (!profile?.age_confirmed) {
      navigation.replace('SocialOnboarding');
    } else {
      showModal({
        type: 'info',
        title: 'Account Already Exists',
        message: 'You already have an account. Please use Sign In to continue.',
        onConfirm: () => navigation.replace('SignIn'),
      });
    }
  };

  const handleGoogleSignUp = async () => {
    setSocialLoading('google');
    try {
      const { data, error } = await signInWithGoogle();
      if (error) {
        showModal({ type: 'error', title: 'Google Sign Up Failed', message: (error as Error).message ?? 'Could not complete sign up.' });
        setSocialLoading(null);
        return;
      }
      if (data?.session) {
        setSession(data.session);
        await routeAfterSocialAuth(data.session.user.id);
      }
    } catch {
      showModal({ type: 'error', title: 'Error', message: 'Google sign up failed. Please try again.' });
    }
    setSocialLoading(null);
  };

  const handleAppleSignUp = async () => {
    setSocialLoading('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        showModal({ type: 'error', title: 'Apple Sign Up Failed', message: 'No identity token received.' });
        setSocialLoading(null);
        return;
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error || !data.session) {
        showModal({ type: 'error', title: 'Apple Sign Up Failed', message: error?.message ?? 'Could not complete sign up.' });
        setSocialLoading(null);
        return;
      }

      setSession(data.session);
      // Apple returns the name only on first sign-in — capture it if we have it.
      await setDisplayNameIfEmpty(data.session.user.id, formatAppleName(credential.fullName));
      await routeAfterSocialAuth(data.session.user.id);
    } catch (e: any) {
      if (e?.code !== 'ERR_CANCELED') {
        showModal({ type: 'error', title: 'Error', message: 'Apple sign up failed. Please try again.' });
      }
    }
    setSocialLoading(null);
  };

  const handleSignUp = async () => {
    if (!displayName.trim() || !email || !password || !confirmPassword) {
      showModal({ type: 'error', title: 'Error', message: 'Please fill in all fields.' });
      return;
    }
    if (password !== confirmPassword) {
      showModal({ type: 'error', title: 'Error', message: 'Passwords do not match.' });
      return;
    }
    if (password.length < 6) {
      showModal({ type: 'error', title: 'Error', message: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      showModal({ type: 'error', title: 'Sign Up Failed', message: error.message });
      setLoading(false);
      return;
    }

    // Save display_name to profile stub created by trigger
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', data.user.id);
    }

    setLoading(false);

    // Branch on whether signUp returned a session:
    //   - session present  => email confirmation is OFF (auto-confirmed) -> onboard now
    //   - session null     => email confirmation is ON  -> user must confirm via email first
    // The live project currently has confirmation ON (mailer_autoconfirm = false),
    // so the `else` branch is what runs today.
    if (data.session) {
      setSession(data.session);
      navigation.replace('SocialOnboarding');
    } else {
      showModal({
        type: 'success',
        title: 'Check Your Email',
        message: `We sent a confirmation link to ${email}. Please confirm it then sign in to continue.`,
        confirmText: 'Go to Sign In',
        onConfirm: () => navigation.replace('SignIn'),
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotDone]} />
          <View style={styles.stepLine} />
          <View style={styles.stepDot} />
          <View style={styles.stepLine} />
          <View style={styles.stepDot} />
        </View>
        <Text style={styles.stepLabel}>Step 1 of 3</Text>
        <Text style={styles.headerTitle}>Create Account</Text>
        <Text style={styles.headerSub}>Never dive alone.</Text>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.formCard} keyboardShouldPersistTaps="handled">

          {/* Social sign-up */}
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={handleGoogleSignUp}
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
              onPress={handleAppleSignUp}
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

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>or sign up with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email sign-up fields */}
          <Text style={styles.label}>Your Name *</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Your name or nickname"
              placeholderTextColor={Colors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          <Text style={[styles.label, { marginTop: Spacing.md }]}>Email address *</Text>
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

          <Text style={[styles.label, { marginTop: Spacing.md }]}>Password *</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="At least 6 characters"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { marginTop: Spacing.md }]}>Confirm Password *</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Repeat your password"
              placeholderTextColor={Colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, (loading || !!socialLoading) && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading || !!socialLoading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.signInLink} onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.signInText}>
              Already have an account? <Text style={styles.signInBold}>Sign In</Text>
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
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotDone: { backgroundColor: Colors.accent },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', maxWidth: 28 },
  stepLabel: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: '700', marginBottom: Spacing.sm },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  headerSub: { fontSize: FontSize.sm, color: Colors.accentLight, marginTop: 4 },
  formCard: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl, gap: Spacing.xs },
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
  signInLink: { alignItems: 'center', paddingVertical: Spacing.lg },
  signInText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  signInBold: { color: Colors.primary, fontWeight: '700' },
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
  appleSocialBtn: { backgroundColor: '#000', borderColor: '#000' },
  socialBtnText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
});
