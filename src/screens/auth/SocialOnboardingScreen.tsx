import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, UserRole } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { nameFromUserMetadata } from '../../lib/profile';
import { useAuthStore } from '../../store/authStore';
import AppModal from '../../components/AppModal';
import { useAppModal } from '../../hooks/useAppModal';

type Props = NativeStackScreenProps<RootStackParamList, 'SocialOnboarding'>;

const ROLES: { key: UserRole; icon: any; title: string; desc: string; color: string; requiresVerification: boolean }[] = [
  {
    key: 'beginner',
    icon: 'person-outline',
    title: 'Beginner / New Diver',
    desc: "I'm new to freediving or not yet certified",
    color: Colors.emerald,
    requiresVerification: false,
  },
  {
    key: 'certified',
    icon: 'people-outline',
    title: 'Certified Freediver',
    desc: 'I hold a recognized freediving certification',
    color: Colors.primary,
    requiresVerification: true,
  },
  {
    key: 'instructor',
    icon: 'school-outline',
    title: 'Freediving Instructor',
    desc: 'I teach freediving and hold instructor credentials',
    color: Colors.purple,
    requiresVerification: true,
  },
];

export default function SocialOnboardingScreen({ navigation }: Props) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('beginner');
  const [displayName, setDisplayName] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [tosConfirmed, setTosConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setProfile, clearAuth } = useAuthStore();
  const { visible, isLoading, config, showModal, handleConfirm, handleCancel } = useAppModal();

  // Prefill the name: existing profile value first (e.g. Apple name captured at
  // sign-in, or email signup), then the social provider's user_metadata (Google).
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      const existing = prof?.display_name?.trim();
      setDisplayName(existing || nameFromUserMetadata(user.user_metadata));
    })();
  }, []);

  const handleContinue = async () => {
    if (!displayName.trim()) {
      showModal({ type: 'warning', title: 'Name Required', message: 'Please enter your name or nickname.' });
      return;
    }
    if (!ageConfirmed) {
      showModal({ type: 'warning', title: 'Age Requirement', message: 'You must be 18 or older to use Buddyline.' });
      return;
    }
    if (!tosConfirmed) {
      showModal({ type: 'warning', title: 'Terms of Service', message: 'You must agree to the Terms of Service to continue.' });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), role: selectedRole, age_confirmed: true, tos_accepted_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) {
      showModal({ type: 'error', title: 'Error', message: 'Failed to save. Please try again.' });
      setLoading(false);
      return;
    }
    navigation.replace('ProfileSetup', { role: selectedRole });
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity
          style={styles.switchAccountBtn}
          onPress={async () => {
            await supabase.auth.signOut();
            clearAuth();
            navigation.replace('Welcome');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-horizontal-outline" size={13} color="#fff" />
          <Text style={styles.switchAccountText}>Use a different account</Text>
        </TouchableOpacity>
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotDone]} />
          <View style={[styles.stepLine, styles.stepLineDone]} />
          <View style={[styles.stepDot, styles.stepDotDone]} />
          <View style={styles.stepLine} />
          <View style={styles.stepDot} />
        </View>
        <Text style={styles.stepLabel}>Step 2 of 3</Text>
        <Text style={styles.headerTitle}>Set Up Your Profile</Text>
        <Text style={styles.headerSub}>Choose your role and confirm a few things</Text>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

          {/* Display name */}
          <Text style={[styles.label, { marginTop: Spacing.lg }]}>Your Name *</Text>
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

          {/* Role selector */}
          <Text style={[styles.label, { marginTop: Spacing.lg }]}>I am a...</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => {
              const active = selectedRole === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.roleCard, active && { borderColor: r.color, backgroundColor: r.color + '08' }]}
                  onPress={() => setSelectedRole(r.key)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.roleIconWrap, { backgroundColor: r.color + '18' }]}>
                    <Ionicons name={r.icon} size={22} color={r.color} />
                  </View>
                  <View style={styles.roleBody}>
                    <Text style={[styles.roleTitle, active && { color: r.color }]}>{r.title}</Text>
                    <Text style={styles.roleDesc}>{r.desc}</Text>
                    {r.requiresVerification && (
                      <View style={styles.verifyNote}>
                        <Ionicons name="information-circle-outline" size={12} color={Colors.warning} />
                        <Text style={styles.verifyNoteText}>Requires credential verification</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.radio, active && { borderColor: r.color }]}>
                    {active && <View style={[styles.radioDot, { backgroundColor: r.color }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Age + ToS */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setAgeConfirmed(!ageConfirmed)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, ageConfirmed && styles.checkboxChecked]}>
              {ageConfirmed && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.checkText}>
              I confirm I am <Text style={styles.checkBold}>18 years or older</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setTosConfirmed(!tosConfirmed)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, tosConfirmed && styles.checkboxChecked]}>
              {tosConfirmed && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.checkText}>
              I agree to the{' '}
              <Text
                style={styles.checkLink}
                onPress={() => navigation.navigate('TermsOfService', {})}
              >
                Terms of Service
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Set Up Profile</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
              </>
            )}
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
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, paddingTop: Spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotDone: { backgroundColor: Colors.accent },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', maxWidth: 28 },
  stepLineDone: { backgroundColor: Colors.accent },
  stepLabel: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: '700', marginBottom: Spacing.sm },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  headerSub: { fontSize: FontSize.sm, color: Colors.accentLight, marginTop: 4 },
  form: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.xs },
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
  roleRow: { gap: Spacing.sm },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    gap: Spacing.md,
  },
  roleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  roleBody: { flex: 1, gap: 2 },
  roleTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  roleDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  verifyNote: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  verifyNoteText: { fontSize: 11, color: Colors.warning, fontWeight: '600' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkText: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  checkBold: { color: Colors.text, fontWeight: '700' },
  checkLink: { color: Colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 16,
    marginTop: Spacing.xl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6, shadowOpacity: 0 },
  buttonText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700', letterSpacing: 0.5 },
  switchAccountBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
  },
  switchAccountText: { fontSize: FontSize.xs, color: '#fff', fontWeight: '600' },
});
