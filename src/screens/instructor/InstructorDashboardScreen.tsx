import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Profile } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function InstructorDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, setProfile } = useAuthStore();
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (profile) fetchRecentMessages();
    }, [profile])
  );

  const fetchRecentMessages = async () => {
    if (!profile) return;

    const [msgResult, bookingResult] = await Promise.all([
      supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(id, display_name)')
        .eq('receiver_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('bookings')
        .select('*, lesson_type:lesson_types(*)')
        .eq('instructor_id', profile.id),
    ]);

    // deduplicate by sender
    const seen = new Set<string>();
    const unique: any[] = [];
    (msgResult.data || []).forEach((m: any) => {
      if (!seen.has(m.sender_id)) {
        seen.add(m.sender_id);
        unique.push(m);
      }
    });

    setRecentMessages(unique);
    setBookings(bookingResult.data || []);
    setLoading(false);
  };

  const toggleAvailability = async () => {
    if (!profile) return;
    setTogglingAvailability(true);
    const newVal = !profile.available_to_dive;
    const { data: updated } = await supabase
      .from('profiles')
      .update({ available_to_dive: newVal })
      .eq('id', profile.id)
      .select('*')
      .single();
    if (updated) setProfile(updated as Profile);
    setTogglingAvailability(false);
  };

  const isVerified = profile?.verification_status === 'verified';
  const isPending = profile?.verification_status === 'pending';

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const upcomingCount = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.booking_date) >= new Date()
  ).length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;

  const initials = (name: string) =>
    name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroContent}>
            <View>
              <Text style={styles.heroTitle}>Dashboard</Text>
              <Text style={styles.heroSub}>
                {profile?.display_name ?? 'Instructor'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={22} color={Colors.accentLight} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Verification status banner */}
        {!isVerified && (
          <View style={[styles.statusBanner, isPending ? styles.statusPending : styles.statusNone]}>
            <Ionicons
              name={isPending ? 'time-outline' : 'alert-circle-outline'}
              size={20}
              color={isPending ? Colors.warning : Colors.textMuted}
            />
            <View style={styles.statusText}>
              <Text style={styles.statusTitle}>
                {isPending ? 'Verification Pending' : 'Not Yet Verified'}
              </Text>
              <Text style={styles.statusDesc}>
                {isPending
                  ? 'Your profile is under review. You will not appear in instructor search until verified.'
                  : 'Complete your profile setup to appear in instructor search.'}
              </Text>
            </View>
          </View>
        )}

        {isVerified && (
          <View style={styles.verifiedBanner}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.verifiedText}>You appear in instructor search</Text>
          </View>
        )}

        {/* Buddy availability toggle */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Available as buddy</Text>
            <Text style={styles.toggleDesc}>
              {profile?.available_to_dive
                ? 'You appear in buddy search for certified divers'
                : 'Toggle on to also be findable as a dive buddy'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, profile?.available_to_dive && styles.toggleOn]}
            onPress={toggleAvailability}
            disabled={togglingAvailability}
          >
            {togglingAvailability ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={[styles.toggleKnob, profile?.available_to_dive && styles.toggleKnobOn]} />
            )}
          </TouchableOpacity>
        </View>

        {/* Post a Dive */}
        <TouchableOpacity
          style={styles.postDiveCard}
          onPress={() => navigation.navigate('CreateSession')}
          activeOpacity={0.85}
        >
          <View style={styles.postDiveIcon}>
            <Ionicons name="water-outline" size={22} color="#fff" />
          </View>
          <View style={styles.postDiveInfo}>
            <Text style={styles.postDiveTitle}>Post a Dive</Text>
            <Text style={styles.postDiveDesc}>Create an open dive session for certified divers to join</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: Colors.warning + '60' }]}>
            <Text style={[styles.statNum, { color: Colors.warning }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, { borderColor: Colors.primary + '60' }]}>
            <Text style={[styles.statNum, { color: Colors.primary }]}>{upcomingCount}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={[styles.statCard, { borderColor: Colors.success + '60' }]}>
            <Text style={[styles.statNum, { color: Colors.success }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Recent inquiries */}
        <Text style={styles.sectionTitle}>Recent Inquiries</Text>
        {loading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : recentMessages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="chatbubble-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No inquiries yet</Text>
            <Text style={styles.emptySub}>When students message you, they'll appear here.</Text>
          </View>
        ) : (
          recentMessages.map((msg) => (
            <TouchableOpacity
              key={msg.id}
              style={styles.msgCard}
              onPress={() =>
                navigation.navigate('Messaging', {
                  otherUserId: msg.sender_id,
                  otherUserName: msg.sender?.display_name ?? 'Student',
                })
              }
              activeOpacity={0.85}
            >
              <View style={styles.msgAvatar}>
                <Text style={styles.msgAvatarText}>{initials(msg.sender?.display_name ?? '?')}</Text>
              </View>
              <View style={styles.msgBody}>
                <Text style={styles.msgName}>{msg.sender?.display_name ?? 'Student'}</Text>
                <Text style={styles.msgContent} numberOfLines={1}>{msg.content}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
  heroSub: { fontSize: FontSize.xs, color: Colors.accentLight, marginTop: 3 },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  statusBanner: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  statusPending: {
    backgroundColor: Colors.warning + '15',
    borderColor: Colors.warning + '40',
  },
  statusNone: {
    backgroundColor: Colors.border,
    borderColor: Colors.border,
  },
  statusText: { flex: 1 },
  statusTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  statusDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success + '15',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  verifiedText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.success },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  toggleInfo: { flex: 1 },
  toggleTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  toggleDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
  toggle: {
    width: 52, height: 30, borderRadius: 15,
    backgroundColor: Colors.border, justifyContent: 'center', padding: 3,
  },
  toggleOn: { backgroundColor: Colors.primary },
  toggleKnob: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
  },
  toggleKnobOn: { alignSelf: 'flex-end' },
  postDiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    gap: Spacing.md,
  },
  postDiveIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postDiveInfo: { flex: 1 },
  postDiveTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  postDiveDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    gap: 2,
  },
  statNum: { fontSize: FontSize.xxl, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: -Spacing.xs },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  msgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  msgAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgAvatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.sm },
  msgBody: { flex: 1 },
  msgName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  msgContent: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
});
