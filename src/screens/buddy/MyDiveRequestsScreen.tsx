import React, { useState, useCallback, useEffect } from 'react';
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
import { RootStackParamList, DiveRequestStatus } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import UserAvatar from '../../components/UserAvatar';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const STATUS_CONFIG: Record<DiveRequestStatus, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: Colors.warning },
  accepted:  { label: 'Accepted',  color: Colors.success },
  declined:  { label: 'Declined',  color: Colors.error },
  cancelled: { label: 'Cancelled', color: Colors.textMuted },
  completed: { label: 'Completed', color: Colors.primary },
};

const TABS = ['Incoming', 'Outgoing'] as const;
type Tab = typeof TABS[number];

export default function MyDiveRequestsScreen() {
  const navigation = useNavigation<Nav>();
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('Incoming');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [activeTab])
  );

  // Real-time: refresh when a dive request is created or its status changes
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('dive-requests-list')
      .on('postgres_changes', {
        event: '*',
        schema: 'buddyline',
        table: 'dive_requests',
        filter: `buddy_id=eq.${profile.id}`,
      }, () => fetchRequests())
      .on('postgres_changes', {
        event: '*',
        schema: 'buddyline',
        table: 'dive_requests',
        filter: `requester_id=eq.${profile.id}`,
      }, () => fetchRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, activeTab]);

  const fetchRequests = async (isRefresh = false) => {
    if (!profile) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const column = activeTab === 'Incoming' ? 'buddy_id' : 'requester_id';
    const otherColumn = activeTab === 'Incoming' ? 'requester' : 'buddy';
    const otherFk = activeTab === 'Incoming'
      ? 'profiles!dive_requests_requester_id_fkey'
      : 'profiles!dive_requests_buddy_id_fkey';

    const { data } = await supabase
      .from('dive_requests')
      .select(`*, ${otherColumn}:${otherFk}(id, display_name, avatar_url, city_region)`)
      .eq(column, profile.id)
      .order('created_at', { ascending: false });

    setRequests(data ?? []);
    setLoading(false);
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: any }) => {
    const other = activeTab === 'Incoming' ? item.requester : item.buddy;
    const statusCfg = STATUS_CONFIG[item.status as DiveRequestStatus] ?? STATUS_CONFIG.pending;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DiveRequestDetail', { requestId: item.id })}
        activeOpacity={0.85}
      >
        <UserAvatar avatarUrl={other?.avatar_url} name={other?.display_name} size={46} />
        <View style={styles.cardBody}>
          <Text style={styles.cardName}>{other?.display_name ?? 'Unknown'}</Text>
          <View style={styles.cardMeta}>
            <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.cardMetaText}>{formatDate(item.requested_date)}</Text>
            <Text style={styles.dot}>·</Text>
            <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.cardMetaText} numberOfLines={1}>{item.location_name}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '18' }]}>
          <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dive Requests</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRequests(true)}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} requests</Text>
              <Text style={styles.emptySub}>
                {activeTab === 'Incoming'
                  ? 'When someone requests to dive with you, it will appear here.'
                  : 'Find a buddy and send them a dive request.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textMuted },
  tabTextActive: { color: '#fff' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' },
  cardMetaText: { fontSize: FontSize.xs, color: Colors.textMuted, flexShrink: 1 },
  dot: { fontSize: FontSize.xs, color: Colors.textMuted },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: { fontSize: FontSize.xs, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginTop: Spacing.md },
  emptySub: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20 },
});
