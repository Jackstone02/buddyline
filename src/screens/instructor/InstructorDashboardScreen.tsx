import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList, InstructorTabParamList } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Profile } from '../../types';

// Dashboard lives inside InstructorTabs (a tab navigator) nested in the root stack,
// so it navigates both to sibling tabs (e.g. 'Schedule') and root routes.
type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<InstructorTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function InstructorDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, setProfile } = useAuthStore();
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (profile) fetchDashboard();
    }, [profile])
  );

  const fetchDashboard = async (isRefresh = false) => {
    if (!profile) return;
    if (isRefresh) setRefreshing(true);

    // Auto-close past-due sessions. Status must match the schema check
    // constraint (open/full/cancelled/completed) — 'done' was silently rejected.
    await supabase
      .from('dive_sessions')
      .update({ status: 'completed' })
      .in('status', ['open', 'full'])
      .lt('scheduled_at', new Date().toISOString());

    const [msgResult, bookingResult, sessionResult] = await Promise.all([
      supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(id, display_name), receiver:profiles!receiver_id(id, display_name)')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('bookings')
        .select('*, lesson_type:lesson_types(*)')
        .eq('instructor_id', profile.id),
      supabase
        .from('dive_sessions')
        .select('*, creator:profiles!dive_sessions_creator_id_fkey(id, display_name), dive_session_members(count)')
        .in('status', ['open', 'full'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5),
    ]);

    const seen = new Set<string>();
    const unique: any[] = [];
    (msgResult.data || []).forEach((m: any) => {
      const otherId = m.sender_id === profile.id ? m.receiver_id : m.sender_id;
      const otherName = m.sender_id === profile.id
        ? (m.receiver?.display_name ?? 'Student')
        : (m.sender?.display_name ?? 'Student');
      if (!seen.has(otherId)) {
        seen.add(otherId);
        unique.push({ ...m, _otherId: otherId, _otherName: otherName });
      }
    });

    const mappedSessions = (sessionResult.data || []).map((s: any) => ({
      ...s,
      member_count: s.dive_session_members?.[0]?.count ?? 0,
    }));
    const own = mappedSessions.filter((s: any) => s.creator_id === profile.id);
    const others = mappedSessions.filter((s: any) => s.creator_id !== profile.id);

    setRecentMessages(unique);
    setBookings(bookingResult.data || []);
    setSessions([...own, ...others]);
    setLoading(false);
    if (isRefresh) setRefreshing(false);
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
            <View style={styles.heroLeft}>
              <Text style={styles.heroTitle}>Dashboard</Text>
              <Text style={styles.heroSub}>{profile?.display_name ?? 'Instructor'}</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={20} color={Colors.accentLight} />
            </TouchableOpacity>
          </View>

          {/* Status + availability row inside hero */}
          <View style={styles.heroMeta}>
            <View style={[styles.verifyPill, isVerified ? styles.verifyPillOk : isPending ? styles.verifyPillWarn : styles.verifyPillNone]}>
              <Ionicons
                name={isVerified ? 'checkmark-circle' : isPending ? 'time-outline' : 'alert-circle-outline'}
                size={12}
                color={isVerified ? Colors.success : isPending ? Colors.warning : Colors.textMuted}
              />
              <Text style={[styles.verifyPillText, isVerified ? { color: Colors.success } : isPending ? { color: Colors.warning } : { color: Colors.textMuted }]}>
                {isVerified ? 'Verified' : isPending ? 'Pending review' : 'Not verified'}
              </Text>
            </View>

            <TouchableOpacity style={styles.availRow} onPress={toggleAvailability} disabled={togglingAvailability} activeOpacity={0.8}>
              {togglingAvailability ? (
                <ActivityIndicator size="small" color="#fff" style={{ width: 32 }} />
              ) : (
                <View style={[styles.miniToggle, profile?.available_to_dive && styles.miniToggleOn]}>
                  <View style={[styles.miniKnob, profile?.available_to_dive && styles.miniKnobOn]} />
                </View>
              )}
              <Text style={styles.availText}>
                {profile?.available_to_dive ? 'Available as buddy' : 'Unavailable as buddy'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboard(true)} />}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={[styles.statCard, { borderColor: Colors.warning + '50' }]} onPress={() => navigation.navigate('Schedule')} activeOpacity={0.8}>
            <Text style={[styles.statNum, { color: Colors.warning }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, { borderColor: Colors.primary + '50' }]} onPress={() => navigation.navigate('Schedule')} activeOpacity={0.8}>
            <Text style={[styles.statNum, { color: Colors.primary }]}>{upcomingCount}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, { borderColor: Colors.success + '50' }]} onPress={() => navigation.navigate('Schedule')} activeOpacity={0.8}>
            <Text style={[styles.statNum, { color: Colors.success }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CreateSession')} activeOpacity={0.85}>
            <Ionicons name="water-outline" size={18} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Post a Dive</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => (navigation as any).navigate('Schedule')} activeOpacity={0.85}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Availability</Text>
          </TouchableOpacity>
        </View>

        {/* Dive Sessions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Open Sessions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SessionsList')} activeOpacity={0.7}>
            <Text style={styles.sectionLink}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />
        ) : sessions.length === 0 ? (
          <TouchableOpacity style={styles.emptyRow} onPress={() => navigation.navigate('CreateSession')} activeOpacity={0.85}>
            <Ionicons name="water-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.emptyRowText}>No open sessions — tap to post one</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : (
          sessions.slice(0, 3).map((s) => {
            const isOwner = s.creator_id === profile?.id;
            const isFull = s.status === 'full';
            const left = Math.max(0, s.spots_needed - s.member_count);
            const d = new Date(s.scheduled_at);
            const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.sessionRow, isOwner && styles.sessionRowOwner, isFull && !isOwner && { opacity: 0.55 }]}
                onPress={() => navigation.navigate('SessionDetail', { sessionId: s.id })}
                activeOpacity={0.85}
              >
                <View style={styles.sessionRowLeft}>
                  <Text style={styles.sessionLoc} numberOfLines={1}>{s.location_name}</Text>
                  <Text style={styles.sessionDate}>{dateStr} · {timeStr}</Text>
                </View>
                <View style={styles.sessionRowRight}>
                  {isOwner && <Text style={styles.yourTag}>Yours</Text>}
                  <Text style={[styles.spotsTag, isFull && styles.spotsTagFull]}>
                    {isFull ? 'Full' : `${left} left`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Recent Inquiries */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.sm }]}>
          <Text style={styles.sectionTitle}>Recent Inquiries</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />
        ) : recentMessages.length === 0 ? (
          <View style={styles.emptyRow}>
            <Ionicons name="chatbubble-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.emptyRowText}>No inquiries yet</Text>
          </View>
        ) : (
          recentMessages.slice(0, 3).map((msg) => (
            <TouchableOpacity
              key={msg.id}
              style={styles.msgRow}
              onPress={() =>
                navigation.navigate('Messaging', {
                  otherUserId: msg._otherId,
                  otherUserName: msg._otherName,
                })
              }
              activeOpacity={0.85}
            >
              <View style={styles.msgAvatar}>
                <Text style={styles.msgAvatarText}>{initials(msg._otherName)}</Text>
              </View>
              <View style={styles.msgBody}>
                <Text style={styles.msgName}>{msg._otherName}</Text>
                <Text style={styles.msgContent} numberOfLines={1}>
                  {msg.sender_id === profile?.id ? 'You: ' : ''}{msg.content}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color={Colors.textMuted} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Hero
  hero: { backgroundColor: Colors.primaryDeep, paddingBottom: Spacing.md },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  heroLeft: {},
  heroTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: FontSize.xs, color: Colors.accentLight, marginTop: 2 },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF15', alignItems: 'center', justifyContent: 'center',
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    gap: Spacing.md,
  },
  verifyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  verifyPillOk: { backgroundColor: Colors.success + '25' },
  verifyPillWarn: { backgroundColor: Colors.warning + '25' },
  verifyPillNone: { backgroundColor: '#FFFFFF15' },
  verifyPillText: { fontSize: 11, fontWeight: '700' },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  miniToggle: {
    width: 32, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', padding: 2,
  },
  miniToggleOn: { backgroundColor: Colors.primary },
  miniKnob: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff' },
  miniKnobOn: { alignSelf: 'flex-end' },
  availText: { fontSize: 11, color: Colors.accentLight, fontWeight: '600' },

  // Content
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1, gap: 2,
  },
  statNum: { fontSize: FontSize.xl, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Quick actions
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingVertical: 12, borderWidth: 1, borderColor: Colors.primary + '30',
  },
  actionBtnText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },

  // Section
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: Spacing.xs, marginBottom: 2,
  },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  sectionLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },

  // Empty row
  emptyRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  emptyRowText: { flex: 1, fontSize: FontSize.sm, color: Colors.textMuted },

  // Session rows
  sessionRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  sessionRowOwner: { borderColor: Colors.warning + '50', backgroundColor: Colors.warning + '05' },
  sessionRowLeft: { flex: 1 },
  sessionLoc: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  sessionDate: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  sessionRowRight: { alignItems: 'flex-end', gap: 3 },
  yourTag: { fontSize: 9, fontWeight: '800', color: Colors.warning, textTransform: 'uppercase', letterSpacing: 0.5 },
  spotsTag: { fontSize: 10, fontWeight: '700', color: Colors.success },
  spotsTagFull: { color: Colors.textMuted },

  // Message rows
  msgRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  msgAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  msgAvatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.xs },
  msgBody: { flex: 1 },
  msgName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  msgContent: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
});
