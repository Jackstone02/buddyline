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
import { RootStackParamList, DiveSession, DiveType } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PAGE_SIZE = 20;

const DIVE_TYPE_LABELS: Record<DiveType, string> = {
  fun_dive: 'Fun Dive',
  line_training: 'Line Training',
  pool: 'Pool',
  dynamic: 'Dynamic',
  static: 'Static',
  spearfishing: 'Spearfishing',
  other: 'Other',
};

const TYPE_FILTERS: { key: DiveType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'fun_dive', label: 'Fun Dive' },
  { key: 'line_training', label: 'Line Training' },
  { key: 'pool', label: 'Pool' },
  { key: 'dynamic', label: 'Dynamic' },
  { key: 'static', label: 'Static' },
  { key: 'spearfishing', label: 'Spearfishing' },
];

type DateFilter = 'all' | 'today' | 'tomorrow' | 'week';
const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'all', label: 'Any date' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'This week' },
];

function getDateRange(filter: DateFilter): { from: string; to?: string } {
  const now = new Date();
  if (filter === 'today') {
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { from: now.toISOString(), to: end.toISOString() };
  }
  if (filter === 'tomorrow') {
    const start = new Date(now); start.setDate(now.getDate() + 1); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  if (filter === 'week') {
    const end = new Date(now); end.setDate(now.getDate() + 7); end.setHours(23, 59, 59, 999);
    return { from: now.toISOString(), to: end.toISOString() };
  }
  return { from: now.toISOString() };
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ` at ${time}`;
}

// Mark expired open/full sessions as completed ('completed' = valid per schema check constraint)
async function markExpiredSessions() {
  await supabase
    .from('dive_sessions')
    .update({ status: 'completed' })
    .in('status', ['open', 'full'])
    .lt('scheduled_at', new Date().toISOString());
}

export default function SessionsListScreen() {
  const navigation = useNavigation<Nav>();
  const { profile } = useAuthStore();
  const [sessions, setSessions] = useState<(DiveSession & { member_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [activeTypeFilter, setActiveTypeFilter] = useState<DiveType | 'all'>('all');
  const [activeDateFilter, setActiveDateFilter] = useState<DateFilter>('all');

  const fetchSessions = useCallback(async (isRefresh = false) => {
    if (isRefresh) { setRefreshing(true); setPage(0); setHasMore(true); }
    else setLoading(true);

    await markExpiredSessions();

    const { from, to } = getDateRange(activeDateFilter);

    let query = supabase
      .from('dive_sessions')
      .select('*, creator:profiles!dive_sessions_creator_id_fkey(id, display_name, avatar_url, verification_status), dive_session_members(count)')
      .in('status', ['open', 'full'])
      .gte('scheduled_at', from)
      .order('scheduled_at', { ascending: true })
      .range(0, PAGE_SIZE - 1);

    if (to) query = query.lte('scheduled_at', to);
    if (activeTypeFilter !== 'all') query = query.eq('dive_type', activeTypeFilter);

    const { data } = await query;

    if (data) {
      const mapped = data.map((s: any) => ({
        ...s,
        member_count: s.dive_session_members?.[0]?.count ?? 0,
      }));
      const own = mapped.filter((s: any) => s.creator_id === profile?.id);
      const others = mapped.filter((s: any) => s.creator_id !== profile?.id);
      setSessions([...own, ...others]);
      setHasMore(data.length === PAGE_SIZE);
      setPage(1);
    }

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, [activeTypeFilter, activeDateFilter]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const { from, to } = getDateRange(activeDateFilter);
    let query = supabase
      .from('dive_sessions')
      .select('*, creator:profiles!dive_sessions_creator_id_fkey(id, display_name, avatar_url, verification_status), dive_session_members(count)')
      .in('status', ['open', 'full'])
      .gte('scheduled_at', from)
      .order('scheduled_at', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (to) query = query.lte('scheduled_at', to);
    if (activeTypeFilter !== 'all') query = query.eq('dive_type', activeTypeFilter);

    const { data } = await query;
    if (data) {
      const mapped = data.map((s: any) => ({
        ...s,
        member_count: s.dive_session_members?.[0]?.count ?? 0,
      }));
      setSessions((prev) => [...prev, ...mapped]);
      setHasMore(data.length === PAGE_SIZE);
      setPage((p) => p + 1);
    }
    setLoadingMore(false);
  };

  useFocusEffect(useCallback(() => { fetchSessions(); }, [fetchSessions]));

  const spotsLeft = (s: DiveSession & { member_count: number }) =>
    Math.max(0, s.spots_needed - s.member_count);

  const ownCount = sessions.filter((s) => s.creator_id === profile?.id).length;

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroContent}>
            {navigation.canGoBack() && (
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Dive Sessions</Text>
              <Text style={styles.heroSub}>
                {profile?.city_region ? `Open sessions near ${profile.city_region}` : 'Open sessions near you'}
              </Text>
            </View>
            <TouchableOpacity style={styles.postBtn} onPress={() => navigation.navigate('CreateSession')} activeOpacity={0.85}>
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Dive type filters */}
          <FlatList
            horizontal data={TYPE_FILTERS} keyExtractor={(i) => i.key}
            showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterChip, activeTypeFilter === item.key && styles.filterChipActive]}
                onPress={() => setActiveTypeFilter(item.key)} activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, activeTypeFilter === item.key && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />

          {/* Date filters */}
          <FlatList
            horizontal data={DATE_FILTERS} keyExtractor={(i) => i.key}
            showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterList, { paddingTop: 0 }]}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterChip, styles.dateChip, activeDateFilter === item.key && styles.dateChipActive]}
                onPress={() => setActiveDateFilter(item.key)} activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, activeDateFilter === item.key && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchSessions(true)} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="water-outline" size={44} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No open sessions</Text>
              <Text style={styles.emptySub}>Be the first to post a dive in your area!</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreateSession')} activeOpacity={0.85}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Post a Dive</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={Colors.primary} style={{ paddingVertical: Spacing.lg }} />
              : hasMore && sessions.length > 0
                ? <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} activeOpacity={0.8}>
                    <Text style={styles.loadMoreText}>Load more</Text>
                  </TouchableOpacity>
                : null
          }
          renderItem={({ item, index }) => {
            const left = spotsLeft(item);
            const isFull = item.status === 'full';
            const isOwner = item.creator_id === profile?.id;
            const isLastOwner = isOwner && index === ownCount - 1 && sessions.length > ownCount;

            return (
              <>
                <TouchableOpacity
                  style={[styles.card, isOwner && styles.cardOwner, isFull && !isOwner && styles.cardFull]}
                  onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={15} color={isFull && !isOwner ? Colors.textMuted : Colors.primary} />
                      <Text style={[styles.locationText, isFull && !isOwner && styles.locationTextMuted]} numberOfLines={1}>
                        {item.location_name}
                      </Text>
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
                      <View style={[styles.tag, isFull && !isOwner && styles.tagMuted]}>
                        <Ionicons name="water-outline" size={12} color={isFull && !isOwner ? Colors.textMuted : Colors.primary} />
                        <Text style={[styles.tagText, isFull && !isOwner && styles.tagTextMuted]}>
                          {DIVE_TYPE_LABELS[item.dive_type] ?? item.dive_type}
                        </Text>
                      </View>
                    )}
                    {item.max_depth_m && (
                      <View style={[styles.tag, isFull && !isOwner && styles.tagMuted]}>
                        <Ionicons name="arrow-down-outline" size={12} color={isFull && !isOwner ? Colors.textMuted : Colors.primary} />
                        <Text style={[styles.tagText, isFull && !isOwner && styles.tagTextMuted]}>Max {item.max_depth_m}m</Text>
                      </View>
                    )}
                    <View style={[styles.tag, isFull && !isOwner && styles.tagMuted]}>
                      <Ionicons name="people-outline" size={12} color={isFull && !isOwner ? Colors.textMuted : Colors.primary} />
                      <Text style={[styles.tagText, isFull && !isOwner && styles.tagTextMuted]}>{item.member_count} joined</Text>
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

                {isLastOwner && (
                  <View style={styles.pinnedDivider}>
                    <View style={styles.pinnedDividerLine} />
                    <Text style={styles.pinnedDividerText}>Other sessions</Text>
                    <View style={styles.pinnedDividerLine} />
                  </View>
                )}
              </>
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  heroTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: FontSize.xs, color: Colors.accentLight, marginTop: 3 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  postBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  filterList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, paddingTop: Spacing.xs, gap: Spacing.xs },
  filterChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.1)', marginRight: Spacing.xs,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: FontSize.xs, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  filterChipTextActive: { color: '#fff' },
  dateChip: { borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.07)' },
  dateChipActive: { backgroundColor: Colors.accentLight + 'CC', borderColor: Colors.accentLight },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.xs,
    shadowColor: Colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardOwner: { borderColor: Colors.warning + '60', backgroundColor: Colors.warning + '05' },
  cardFull: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardTopRight: { alignItems: 'flex-end', gap: 4 },
  ownerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.warning + '20', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3,
  },
  ownerBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.warning },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  locationText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, flex: 1 },
  locationTextMuted: { color: Colors.textMuted },
  spotsBadge: {
    backgroundColor: Colors.success + '18', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: Colors.success + '40',
  },
  spotsBadgeFull: { backgroundColor: Colors.textMuted + '15', borderColor: Colors.textMuted + '30' },
  spotsText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.success },
  spotsTextFull: { color: Colors.textMuted },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: 2 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary + '10', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  tagMuted: { backgroundColor: Colors.border },
  tagText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  tagTextMuted: { color: Colors.textMuted },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  creatorText: { fontSize: FontSize.xs, color: Colors.textMuted },
  pinnedDivider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.sm },
  pinnedDividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  pinnedDividerText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  loadMoreBtn: { alignItems: 'center', paddingVertical: Spacing.md, marginBottom: Spacing.md },
  loadMoreText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: Spacing.xxl, paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.primary,
    borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: 12, marginTop: Spacing.md,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
});
