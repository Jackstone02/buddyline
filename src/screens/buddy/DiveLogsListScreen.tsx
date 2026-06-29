import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, DiveLog } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

const DISCIPLINE_LABELS: Record<string, string> = {
  pool: 'Pool', depth: 'Depth', dynamic: 'Dynamic',
  static: 'Static', spearfishing: 'Spearfishing', other: 'Other',
};

export default function DiveLogsListScreen() {
  const navigation = useNavigation<Nav>();
  const { profile } = useAuthStore();
  const [logs, setLogs] = useState<DiveLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('diver_id', profile.id)
      .order('log_date', { ascending: false });
    setLogs((data as DiveLog[]) ?? []);
    setLoading(false);
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { fetchLogs(); }, [fetchLogs]));

  // Personal-best depth across all logs (nice summary stat)
  const bestDepth = logs.reduce((m, l) => Math.max(m, l.max_depth_m ?? 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Dive Log</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('DiveLogForm')}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          {logs.length > 0 && (
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{logs.length}</Text>
                <Text style={styles.summaryLabel}>Dives Logged</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{bestDepth || '–'}{bestDepth ? 'm' : ''}</Text>
                <Text style={styles.summaryLabel}>Personal Best</Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="book-outline" size={40} color={Colors.primary} />
              </View>
              <Text style={styles.emptyText}>No dives logged yet</Text>
              <Text style={styles.emptySub}>Tap + to record your first dive.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('DiveLogForm')}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Log a Dive</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('DiveLogForm', { logId: item.id })}
              activeOpacity={0.85}
            >
              <View style={styles.depthBadge}>
                <Text style={styles.depthValue}>{item.max_depth_m ?? '–'}</Text>
                <Text style={styles.depthUnit}>m</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardLocation} numberOfLines={1}>
                  {item.location_name || 'Untitled dive'}
                </Text>
                <Text style={styles.cardDate}>{formatDate(item.log_date)}</Text>
                <View style={styles.cardMeta}>
                  {item.discipline && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{DISCIPLINE_LABELS[item.discipline] ?? item.discipline}</Text>
                    </View>
                  )}
                  {item.duration_min != null && (
                    <Text style={styles.metaText}>{item.duration_min} min</Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primaryDeep, paddingBottom: Spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: '#fff' },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF22', alignItems: 'center', justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    backgroundColor: '#FFFFFF12',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
  },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: FontSize.lg, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.accentLight, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: '#FFFFFF25' },
  list: { padding: Spacing.md, gap: Spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  depthBadge: {
    width: 54, height: 54, borderRadius: Radius.md,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row',
  },
  depthValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  depthUnit: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, marginTop: 4 },
  cardBody: { flex: 1, gap: 2 },
  cardLocation: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardDate: { fontSize: FontSize.xs, color: Colors.textMuted },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
  tag: {
    backgroundColor: Colors.primary + '12',
    borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  tagText: { fontSize: 10, color: Colors.primary, fontWeight: '700' },
  metaText: { fontSize: FontSize.xs, color: Colors.textMuted },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.sm },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  emptyText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginTop: Spacing.sm,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
});
