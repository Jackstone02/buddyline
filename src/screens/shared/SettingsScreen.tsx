import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { RootStackParamList } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import AppModal from '../../components/AppModal';
import { useAppModal } from '../../hooks/useAppModal';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SAFETY_KEY = '@buddyup:safetyAccepted';

export default function SettingsScreen({ navigation }: Props) {
  const { profile, clearAuth, setSafetyAccepted } = useAuthStore();
  const { visible, isLoading, config, showModal, handleConfirm, handleCancel } = useAppModal();

  const handleSignOut = () => {
    showModal({
      type: 'confirm',
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      showCancel: true,
      onConfirm: async () => {
        await supabase.auth.signOut();
        clearAuth();
        navigation.replace('Welcome');
      },
    });
  };

  const handleViewSafety = async () => {
    await AsyncStorage.removeItem(SAFETY_KEY);
    setSafetyAccepted(false);
    const role = profile?.role;
    const nextRoute =
      role === 'beginner' ? 'BeginnerTabs' :
      role === 'instructor' ? 'InstructorTabs' : 'CertifiedTabs';
    navigation.navigate('Safety', { nextRoute });
  };

  const ROWS = [
    {
      icon: 'person-outline',
      label: 'Edit Profile',
      onPress: () => navigation.navigate('ProfileEdit'),
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Safety Guidelines',
      onPress: handleViewSafety,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Profile info */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {(profile?.display_name ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.display_name ?? 'User'}</Text>
            <Text style={styles.profileRole}>
              {profile?.role === 'beginner' ? 'Beginner' :
               profile?.role === 'certified' ? 'Certified Freediver' : 'Instructor'}
            </Text>
            {profile?.verification_status === 'verified' && (
              <View style={styles.verifiedPill}>
                <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          {ROWS.map((row, i) => (
            <TouchableOpacity
              key={row.label}
              style={[
                styles.row,
                i === 0 && styles.rowFirst,
                i === ROWS.length - 1 && styles.rowLast,
              ]}
              onPress={row.onPress}
              activeOpacity={0.85}
            >
              <View style={styles.rowIconWrap}>
                <Ionicons name={row.icon as any} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.row, styles.rowFirst, styles.rowLast, styles.signOutRow]}
            onPress={handleSignOut}
            activeOpacity={0.85}
          >
            <View style={[styles.rowIconWrap, { backgroundColor: Colors.error + '15' }]}>
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            </View>
            <Text style={[styles.rowLabel, { color: Colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          Buddy Up — Never Dive Alone{'\n'}
          This app connects people only. It does not supervise dives.
        </Text>

        <Text style={styles.version}>Version {APP_VERSION}</Text>
      </ScrollView>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800', color: '#FFFFFF' },
  body: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
    flexGrow: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  profileRole: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  verifiedText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '700' },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  rowFirst: { borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  rowLast: { borderBottomWidth: 0, borderBottomLeftRadius: Radius.lg, borderBottomRightRadius: Radius.lg },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  signOutRow: {},
  disclaimer: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingTop: Spacing.md,
    fontStyle: 'italic',
  },
  version: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    opacity: 0.6,
  },
});
