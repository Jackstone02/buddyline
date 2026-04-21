import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, DiveSession, DiveType, Profile } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const DIVE_TYPE_LABELS: Record<DiveType, string> = {
  fun_dive: 'Fun Dive',
  line_training: 'Line Training',
  pool: 'Pool',
  dynamic: 'Dynamic',
  static: 'Static',
  spearfishing: 'Spearfishing',
  other: 'Other',
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ` at ${time}`;
}

export default function HomeCertifiedScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, setProfile } = useAuthStore();
  const [sessions, setSessions] = useState<(DiveSession & { member_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

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

  const fetchSessions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    // Auto-close expired sessions
    await supabase
      .from('dive_sessions')
      .update({ status: 'done' })
      .in('status', ['open', 'full'])
      .lt('scheduled_at', new Date().toISOString());

    const { data } = await supabase
      .from('dive_sessions')
      .select('*, creator:profiles!dive_sessions_creator_id_fkey(id, display_name, avatar_url, verification_status), dive_session_members(count)')
      .in('status', ['open', 'full'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(20);

    if (data) {
      const mapped = data.map((s: any) => ({
        ...s,
        member_count: s.dive_session_members?.[0]?.count ?? 0,
      }));
      const own = mapped.filter((s: any) => s.creator_id === profile?.id);
      const others = mapped.filter((s: any) => s.creator_id !== profile?.id);
      setSessions([...own, ...others]);
    }

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, [fetchSessions])
  );

  const spotsLeft = (s: DiveSession & { member_count: number }) =>
    Math.max(0, s.spots_needed - s.member_count);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroContent}>
            <View>
              <Text style={styles.heroTitle}>Home</Text>
              <Text style={styles.heroSub}>
                {profile?.city_region ? `Sessions near ${profile.city_region}` : 'Upcoming dive sessions'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate('CreateSession')}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate('Settings')}
                activeOpacity={0.85}
              >
                <Ionicons name="settings-outline" size={20} color={Colors.accentLight} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Availability toggle */}
          <TouchableOpacity
            style={styles.availRow}
            onPress={toggleAvailability}
            disabled={togglingAvailability}
            activeOpacity={0.8}
          >
            {togglingAvailability ? (
              <ActivityIndicator size="small" color="#fff" style={{ width: 32 }} />
            ) : (
              <View style={[styles.miniToggle, profile?.available_to_dive && styles.miniToggleOn]}>
                <View style={[styles.miniKnob, profile?.available_to_dive && styles.miniKnobOn]} />
              </View>
            )}
            <Text style={styles.availText}>
              {profile?.available_to_dive ? 'Visible in buddy search' : 'Hidden from buddy search'}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Open Dive Sessions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SessionsList')} activeOpacity={0.7}>
          <Text style={styles.sectionLink}>See all</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchSessions(true)} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="water-outline" size={44} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No open sessions nearby</Text>
              <Text style={styles.emptySub}>
                Post a dive to find buddies in your area.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('CreateSession')}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Post a Dive</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const left = spotsLeft(item);
            const isFull = item.status === 'full';
            const isOwner = item.creator_id === profile?.id;
            return (
              <TouchableOpacity
                style={[styles.card, isOwner && styles.cardOwner, isFull && !isOwner && styles.cardFull]}
                onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}
                activeOpacity={0.85}
              >
                <View style={styles.cardTop}>
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={15} color={Colors.primary} />
                    <Text style={styles.locationText} numberOfLines={1}>{item.location_name}</Text>
                  </View>
                  <View style={styles.cardTopRight}>
                    {isOwner && (
                      <View style={styles.ownerBadge}>
                        <Ionicons name="star" size={10} color={Colors.warning} />
                        <Text style={styles.ownerBadgeText}>Your session</Text>
                      </View>
                    )}
                    <View style={[styles.spotsBadge, isFull && styles.spotsBadgeFull]}>
                      <Text style={[styles.spotsText, isFull && styles.spotsTextFull]}>
                        {isFull ? 'Full' : `${left} spot${left !== 1 ? 's' : ''} left`}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.timeRow}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.timeText}>{formatDateTime(item.scheduled_at)}</Text>
                </View>

                <View style={styles.tagsRow}>
                  {item.dive_type && (
                    <View style={styles.tag}>
                      <Ionicons name="water-outline" size={12} color={Colors.primary} />
                      <Text style={styles.tagText}>{DIVE_TYPE_LABELS[item.dive_type] ?? item.dive_type}</Text>
                    </View>
                  )}
                  {item.max_depth_m && (
                    <View style={styles.tag}>
                      <Ionicons name="arrow-down-outline" size={12} color={Colors.primary} />
                      <Text style={styles.tagText}>Max {item.max_depth_m}m</Text>
                    </View>
                  )}
                  <View style={styles.tag}>
                    <Ionicons name="people-outline" size={12} color={Colors.primary} />
                    <Text style={styles.tagText}>{item.member_count} joined</Text>
                  </View>
                </View>

                <View style={styles.creatorRow}>
                  <Ionicons name="person-circle-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.creatorText}>
                    {isOwner ? 'You' : ((item as any).creator?.display_name ?? 'Unknown')}
                  </Text>
                  {!isOwner && (item as any).creator?.verification_status === 'verified' && (
                    <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { backgroundColor: Colors.primaryDeep, paddingBottom: Spacing.sm },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  availRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, paddingTop: Spacing.xs,
  },
  miniToggle: {
    width: 32, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', padding: 2,
  },
  miniToggleOn: { backgroundColor: Colors.primary },
  miniKnob: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff' },
  miniKnobOn: { alignSelf: 'flex-end' },
  availText: { fontSize: 11, color: Colors.accentLight, fontWeight: '600' },
  heroTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: FontSize.xs, color: Colors.accentLight, marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  sectionLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardOwner: { borderColor: Colors.warning + '60', backgroundColor: Colors.warning + '05' },
  cardFull: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardTopRight: { alignItems: 'flex-end', gap: 4 },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.warning + '20',
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  ownerBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.warning },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  locationText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, flex: 1 },
  spotsBadge: {
    backgroundColor: Colors.success + '18',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  spotsBadgeFull: { backgroundColor: Colors.textMuted + '15', borderColor: Colors.textMuted + '30' },
  spotsText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.success },
  spotsTextFull: { color: Colors.textMuted },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: 2 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '10',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  creatorText: { fontSize: FontSize.xs, color: Colors.textMuted },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    marginTop: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
});
