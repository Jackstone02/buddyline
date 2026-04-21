import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import AppModal from '../../components/AppModal';
import { useAppModal } from '../../hooks/useAppModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ROLE_COLORS: Record<string, string> = {
  beginner:   Colors.emerald,
  certified:  Colors.primary,
  instructor: Colors.purple,
  admin:      Colors.error,
};

const STATUS_COLORS: Record<string, string> = {
  none:     Colors.textMuted,
  pending:  Colors.warning,
  verified: Colors.success,
  rejected: Colors.error,
};

type RoleFilter = 'all' | 'beginner' | 'certified' | 'instructor';
const PAGE_SIZE = 20;

function fmtCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + 'k';
  return String(n);
}

export default function AdminOverviewScreen() {
  const navigation = useNavigation<Nav>();
  const { profile } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [openReportCount, setOpenReportCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { visible, isLoading, config, showModal, handleConfirm, handleCancel } = useAppModal();

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [profile])
  );

  const fetchUsers = async () => {
    if (!profile) return;
    setLoading(true);

    const [{ data: profilesData }, { count: reportCount }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .neq('id', profile.id)
        .order('created_at', { ascending: false }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ]);

    setUsers(profilesData || []);
    setOpenReportCount(reportCount ?? 0);
    setLoading(false);
  };

  const pendingCount     = users.filter((u) => u.verification_status === 'pending').length;
  const totalInstructors = users.filter((u) => u.role === 'instructor').length;
  const totalCertified   = users.filter((u) => u.role === 'certified').length;
  const totalBeginner    = users.filter((u) => u.role === 'beginner').length;

  const ROLE_TABS: { key: RoleFilter; label: string; count: number; color: string }[] = [
    { key: 'all',        label: 'All',        count: users.length,    color: Colors.text },
    { key: 'beginner',   label: 'Beginner',   count: totalBeginner,   color: Colors.emerald },
    { key: 'certified',  label: 'Certified',  count: totalCertified,  color: Colors.primary },
    { key: 'instructor', label: 'Instructor', count: totalInstructors, color: Colors.purple },
  ];

  const filtered = useMemo(() => {
    let list = roleFilter === 'all' ? users : users.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.display_name?.toLowerCase().includes(q) ||
          u.city_region?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, roleFilter, search]);

  const visible_users = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleSignOut = () => {
    showModal({
      type: 'confirm',
      title: 'Sign Out',
      message: 'Sign out of admin account?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      showCancel: true,
      onConfirm: async () => {
        await supabase.auth.signOut();
        useAuthStore.getState().clearAuth();
        navigation.replace('Welcome');
      },
    });
  };

  const STATS = [
    { label: 'Pending',     value: pendingCount,     color: Colors.warning, icon: 'time-outline' as const },
    { label: 'Reports',     value: openReportCount,  color: Colors.error,   icon: 'flag-outline' as const },
    { label: 'Instructors', value: totalInstructors, color: Colors.purple,  icon: 'school-outline' as const },
    { label: 'Certified',   value: totalCertified,   color: Colors.primary, icon: 'ribbon-outline' as const },
    { label: 'Beginners',   value: totalBeginner,    color: Colors.emerald, icon: 'water-outline' as const },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroContent}>
            <View>
              <Text style={styles.heroTitle}>Admin Panel</Text>
              <Text style={styles.heroSub}>Buddyline Management</Text>
            </View>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color={Colors.accentLight} />
            </TouchableOpacity>
          </View>

            </SafeAreaView>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        {STATS.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.statsDivider} />}
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: s.color }]}>{fmtCount(s.value)}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Alert banners */}
      <View style={styles.banners}>
        {pendingCount > 0 && (
          <TouchableOpacity
            style={[styles.alertBanner, { borderColor: Colors.warning + '60', backgroundColor: Colors.warning + '12' }]}
            onPress={() => (navigation as any).navigate('Verifications')}
            activeOpacity={0.85}
          >
            <Ionicons name="time-outline" size={15} color={Colors.warning} />
            <Text style={[styles.alertText, { color: Colors.warning }]}>
              {pendingCount} verification{pendingCount > 1 ? 's' : ''} pending
            </Text>
            <Ionicons name="chevron-forward" size={13} color={Colors.warning} />
          </TouchableOpacity>
        )}
        {openReportCount > 0 && (
          <TouchableOpacity
            style={[styles.alertBanner, { borderColor: Colors.error + '60', backgroundColor: Colors.error + '12' }]}
            onPress={() => (navigation as any).navigate('Reports')}
            activeOpacity={0.85}
          >
            <Ionicons name="flag-outline" size={15} color={Colors.error} />
            <Text style={[styles.alertText, { color: Colors.error }]}>
              {openReportCount} open report{openReportCount > 1 ? 's' : ''}
            </Text>
            <Ionicons name="chevron-forward" size={13} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={(t) => { setSearch(t); setVisibleCount(PAGE_SIZE); }}
          placeholder="Search name or location..."
          placeholderTextColor={Colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Role filter tabs */}
      <View style={styles.tabs}>
        {ROLE_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, roleFilter === t.key && { borderBottomColor: t.color, borderBottomWidth: 2 }]}
            onPress={() => { setRoleFilter(t.key); setVisibleCount(PAGE_SIZE); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, roleFilter === t.key && { color: t.color, fontWeight: '700' }]}>
              {t.label}
            </Text>
            <View style={[styles.tabBadge, { backgroundColor: t.color + '20' }]}>
              <Text style={[styles.tabBadgeText, { color: t.color }]}>{t.count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* User list */}
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={visible_users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                style={styles.loadMore}
                onPress={() => setVisibleCount((c) => c + PAGE_SIZE)}
                activeOpacity={0.8}
              >
                <Text style={styles.loadMoreText}>
                  Load more ({filtered.length - visibleCount} remaining)
                </Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item: u }) => {
            const roleColor   = ROLE_COLORS[u.role] ?? Colors.textMuted;
            const statusColor = STATUS_COLORS[u.verification_status] ?? Colors.textMuted;
            const initials    = u.display_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
            return (
              <TouchableOpacity
                style={styles.userRow}
                onPress={() => navigation.navigate('AdminUserDetail', { userId: u.id })}
                activeOpacity={0.85}
              >
                <View style={[styles.avatar, { backgroundColor: roleColor }]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.userBody}>
                  <Text style={styles.userName}>{u.display_name}</Text>
                  <Text style={styles.userSub}>{u.city_region || 'No location'}</Text>
                </View>
                <View style={styles.userRight}>
                  <View style={[styles.pill, { backgroundColor: roleColor + '18', borderColor: roleColor + '50' }]}>
                    <Text style={[styles.pillText, { color: roleColor }]}>{u.role}</Text>
                  </View>
                  {u.verification_status && u.verification_status !== 'none' && (
                    <View style={[styles.pill, { backgroundColor: statusColor + '18', borderColor: statusColor + '50' }]}>
                      <Text style={[styles.pillText, { color: statusColor }]}>{u.verification_status}</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            );
          }}
        />
      )}

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

  // Hero
  hero: { backgroundColor: Colors.primaryDeep },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  heroTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: FontSize.xs, color: Colors.accentLight, marginTop: 2 },
  signOutBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF15', alignItems: 'center', justifyContent: 'center',
  },

  // Stats bar (below hero)
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statsDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  statNum: { fontSize: FontSize.lg, fontWeight: '800' },
  statLabel: { fontSize: 9, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },

  // Banners
  banners: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.xs },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  alertText: { flex: 1, fontSize: FontSize.xs, fontWeight: '700' },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, padding: 0 },

  // Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted },
  tabBadge: { borderRadius: Radius.full, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  tabBadgeText: { fontSize: 9, fontWeight: '800' },

  // List
  list: { padding: Spacing.md, gap: Spacing.xs, paddingBottom: Spacing.xxl },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.xs },
  userBody: { flex: 1 },
  userName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  userSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  userRight: { alignItems: 'flex-end', gap: 3 },
  pill: { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  pillText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },

  // Load more
  loadMore: {
    alignItems: 'center',
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  loadMoreText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },

  // Empty
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textMuted },
});
