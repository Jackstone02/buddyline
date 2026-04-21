import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import AppModal from '../../components/AppModal';
import UserAvatar from '../../components/UserAvatar';
import { useAppModal } from '../../hooks/useAppModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ROLE_LABELS: Record<string, string> = {
  beginner: 'Beginner / New Diver',
  certified: 'Certified Freediver',
  instructor: 'Freediving Instructor',
};

const ROLE_COLORS: Record<string, string> = {
  beginner:   Colors.emerald,
  certified:  Colors.primary,
  instructor: Colors.purple,
  admin:      Colors.error,
};

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, certifiedProfile, instructorProfile, clearAuth } = useAuthStore();
  const { visible, isLoading, config, showModal, handleConfirm, handleCancel } = useAppModal();

  const roleColor = ROLE_COLORS[profile?.role ?? 'beginner'];

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

  return (
    <View style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Profile</Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('ProfileEdit')}
            >
              <Ionicons name="create-outline" size={20} color={Colors.accentLight} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <View style={styles.avatarCard}>
          <UserAvatar avatarUrl={profile?.avatar_url} name={profile?.display_name ?? ''} size={80} color={roleColor} />
          <Text style={styles.name}>{profile?.display_name ?? 'User'}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '18', borderColor: roleColor + '40' }]}>
            <Ionicons
              name={profile?.role === 'instructor' ? 'school-outline' : profile?.role === 'certified' ? 'people-outline' : 'person-outline'}
              size={13}
              color={roleColor}
            />
            <Text style={[styles.roleText, { color: roleColor }]}>
              {ROLE_LABELS[profile?.role ?? 'beginner']}
            </Text>
          </View>
          {profile?.verification_status === 'verified' && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          {[
            { icon: 'location-outline', label: 'Location', val: profile?.city_region || 'Not set' },
            { icon: 'chatbubble-ellipses-outline', label: 'Bio', val: profile?.bio || 'No bio yet' },
          ].map(({ icon, label, val }) => (
            <View key={label} style={styles.infoRow}>
              <Ionicons name={icon as any} size={16} color={Colors.textMuted} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoVal}>{val}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Certified details */}
        {profile?.role === 'certified' && certifiedProfile && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Certification</Text>
            {[
              { icon: 'ribbon-outline', label: 'Level', val: certifiedProfile.cert_level },
              { icon: 'business-outline', label: 'Agency', val: certifiedProfile.agency },
              { icon: 'time-outline', label: 'Experience', val: `${certifiedProfile.years_experience} years` },
              { icon: 'water-outline', label: 'Disciplines', val: (certifiedProfile.disciplines || []).join(', ') || 'None set' },
            ].map(({ icon, label, val }) => (
              <View key={label} style={styles.infoRow}>
                <Ionicons name={icon as any} size={16} color={Colors.textMuted} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>{label}</Text>
                  <Text style={styles.infoVal}>{val}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Instructor details */}
        {profile?.role === 'instructor' && instructorProfile && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Teaching Info</Text>
            {[
              { icon: 'location-outline', label: 'Teaching Location', val: instructorProfile.teaching_location },
              { icon: 'business-outline', label: 'Agencies', val: (instructorProfile.agencies || []).join(', ') },
              { icon: 'ribbon-outline', label: 'Certs Offered', val: (instructorProfile.certs_offered || []).join(', ') },
              { icon: 'time-outline', label: 'Years Teaching', val: `${instructorProfile.years_teaching} years` },
            ].map(({ icon, label, val }) => (
              <View key={label} style={styles.infoRow}>
                <Ionicons name={icon as any} size={16} color={Colors.textMuted} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>{label}</Text>
                  <Text style={styles.infoVal}>{val || 'Not set'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('RoleChange')}>
            <Ionicons name="swap-horizontal-outline" size={20} color={Colors.primary} />
            <Text style={styles.actionText}>Change Role</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={[styles.actionText, { color: Colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          This app connects people only — it does not supervise dives.
        </Text>
      </ScrollView>

      <AppModal
        visible={visible}
        isLoading={isLoading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        {...config}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { backgroundColor: Colors.primaryDeep, paddingBottom: Spacing.lg },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  heroTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: '#FFFFFF' },
  editBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  avatarCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  avatarText: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '800' },
  name: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
  },
  roleText: { fontSize: FontSize.sm, fontWeight: '700' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success + '15',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  verifiedText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '700' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  infoText: { flex: 1 },
  infoLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  infoVal: { fontSize: FontSize.sm, color: Colors.text, marginTop: 1 },
  actionsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  actionText: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  disclaimer: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: Spacing.lg,
  },
});
