import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import AppModal from '../../components/AppModal';
import { useAppModal } from '../../hooks/useAppModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type StatusFilter = 'pending' | 'verified' | 'rejected';

const STATUS_TABS: { key: StatusFilter; label: string; color: string; icon: string }[] = [
  { key: 'pending',  label: 'Pending',  color: Colors.warning, icon: 'time-outline' },
  { key: 'verified', label: 'Verified', color: Colors.success, icon: 'checkmark-circle-outline' },
  { key: 'rejected', label: 'Rejected', color: Colors.error,   icon: 'close-circle-outline' },
];

function parseCredentialUrls(raw: string | null | undefined): string[] {
  if (!raw) return [];
  if (raw.startsWith('[')) {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [raw];
}

export default function AdminVerificationsScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [rejectTarget, setRejectTarget] = useState<{ userId: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const { visible, isLoading, config, showModal, handleConfirm, handleCancel } = useAppModal();

  useFocusEffect(
    useCallback(() => {
      fetchItems(statusFilter);
    }, [statusFilter])
  );

  const fetchItems = async (status: StatusFilter) => {
    setLoading(true);

    const [{ data: instructorRows }, { data: certifiedRows }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*, instructor_profile:instructor_profiles(*)')
        .eq('verification_status', status)
        .eq('role', 'instructor'),
      supabase
        .from('profiles')
        .select('*, certified_profile:certified_profiles(*)')
        .eq('verification_status', status)
        .eq('role', 'certified'),
    ]);

    const combined = [
      ...(instructorRows || []).map((r: any) => ({ profile: r, instructor_profile: r.instructor_profile, type: 'instructor' })),
      ...(certifiedRows || []).map((r: any) => ({ profile: r, certified_profile: r.certified_profile, type: 'certified' })),
    ].sort(
      (a, b) =>
        new Date(b.profile?.created_at ?? 0).getTime() -
        new Date(a.profile?.created_at ?? 0).getTime()
    );

    setItems(combined);
    setLoading(false);
  };

  const handleApprove = (userId: string, name: string) => {
    showModal({
      type: 'confirm',
      title: 'Approve User',
      message: `Verify ${name}? They will appear in search results.`,
      confirmText: 'Verify',
      cancelText: 'Cancel',
      showCancel: true,
      onConfirm: () => applyDecision(userId, 'verified', null),
    });
  };

  const handleReject = (userId: string, name: string) => {
    setRejectReason('');
    setRejectTarget({ userId, name });
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    await applyDecision(rejectTarget.userId, 'rejected', rejectReason.trim() || null);
    setRejectTarget(null);
  };

  const applyDecision = async (userId: string, decision: 'verified' | 'rejected', reason: string | null) => {
    const update: any = { verification_status: decision };
    if (decision === 'rejected' && reason) update.rejection_reason = reason;

    const { error } = await supabase.from('profiles').update(update).eq('id', userId);

    if (error) {
      showModal({ type: 'error', title: 'Error', message: 'Could not update verification status.' });
      return;
    }

    setItems((prev) => prev.filter((i) => i.profile?.id !== userId));
    showModal({
      type: decision === 'verified' ? 'success' : 'info',
      title: decision === 'verified' ? 'Approved' : 'Rejected',
      message: decision === 'verified'
        ? 'User is now verified and will appear in search.'
        : 'User has been rejected.',
    });
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const pendingCount = items.length;
  const activeTab = STATUS_TABS.find((t) => t.key === statusFilter)!;

  const renderItem = ({ item }: { item: any }) => {
    const p = item.profile;
    const isInstructor = item.type === 'instructor';
    const subProfile = isInstructor ? item.instructor_profile : item.certified_profile;
    const initials = p?.display_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
    const roleColor = p?.role === 'instructor' ? Colors.purple : p?.role === 'certified' ? Colors.primary : Colors.emerald;

    const credUrls = parseCredentialUrls(subProfile?.credentials_url || subProfile?.cert_card_url);

    return (
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: roleColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.cardHeaderBody}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardName}>{p?.display_name ?? 'Unknown'}</Text>
              <View style={[styles.pill, { backgroundColor: roleColor + '18', borderColor: roleColor + '40' }]}>
                <Text style={[styles.pillText, { color: roleColor }]}>{p?.role}</Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>
              {p?.city_region || 'No location'} · {formatDate(p?.created_at)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileLink}
            onPress={() => navigation.navigate('AdminUserDetail', { userId: p?.id })}
          >
            <Ionicons name="open-outline" size={15} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Compact details grid */}
        {subProfile && (
          <View style={styles.detailsGrid}>
            {isInstructor ? (
              <>
                <DetailChip icon="location-outline" val={subProfile.teaching_location} />
                <DetailChip icon="business-outline" val={(subProfile.agencies || []).join(', ')} />
                <DetailChip icon="ribbon-outline" val={(subProfile.certs_offered || []).join(', ')} />
                <DetailChip icon="time-outline" val={`${subProfile.years_teaching} yrs`} />
              </>
            ) : (
              <>
                <DetailChip icon="ribbon-outline" val={subProfile.cert_level} />
                <DetailChip icon="business-outline" val={subProfile.agency} />
                <DetailChip icon="time-outline" val={`${subProfile.years_experience} yrs exp`} />
                <DetailChip icon="water-outline" val={(subProfile.disciplines || []).join(', ')} />
              </>
            )}
          </View>
        )}

        {/* Footer: credentials + actions */}
        <View style={styles.cardFooter}>
          {credUrls.length > 0 && (
            <TouchableOpacity
              style={styles.credBtn}
              onPress={() => navigation.navigate('AdminUserDetail', { userId: p?.id })}
            >
              <Ionicons name="document-attach-outline" size={14} color={Colors.primary} />
              <Text style={styles.credBtnText}>{credUrls.length} file{credUrls.length !== 1 ? 's' : ''}</Text>
            </TouchableOpacity>
          )}
          {statusFilter === 'pending' && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => handleReject(p?.id, p?.display_name ?? 'this user')}
              >
                <Ionicons name="close-outline" size={15} color={Colors.error} />
                <Text style={[styles.actionBtnText, { color: Colors.error }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={() => handleApprove(p?.id, p?.display_name ?? 'this user')}
              >
                <Ionicons name="checkmark-outline" size={15} color="#fff" />
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroContent}>
            <View>
              <Text style={styles.heroTitle}>Verifications</Text>
              <Text style={styles.heroSub}>Review credential submissions</Text>
            </View>
            {statusFilter === 'pending' && pendingCount > 0 && (
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>

      {/* Status tabs */}
      <View style={styles.tabs}>
        {STATUS_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, statusFilter === t.key && { borderBottomColor: t.color, borderBottomWidth: 2 }]}
            onPress={() => setStatusFilter(t.key)}
            activeOpacity={0.7}
          >
            <Ionicons name={t.icon as any} size={13} color={statusFilter === t.key ? t.color : Colors.textMuted} />
            <Text style={[styles.tabText, statusFilter === t.key && { color: t.color, fontWeight: '700' }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name={statusFilter === 'pending' ? 'checkmark-done-circle-outline' : statusFilter === 'verified' ? 'ribbon-outline' : 'close-circle-outline'}
            size={48}
            color={activeTab.color}
          />
          <Text style={styles.emptyTitle}>
            {statusFilter === 'pending' ? 'All caught up!' : `No ${statusFilter} users`}
          </Text>
          <Text style={styles.emptySub}>
            {statusFilter === 'pending' ? 'No pending verifications.' : `Nobody has been ${statusFilter} yet.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.profile?.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Rejection reason modal */}
      <Modal
        visible={!!rejectTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectTarget(null)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.rejectModal}>
            <Text style={styles.rejectModalTitle}>Reject {rejectTarget?.name}?</Text>
            <Text style={styles.rejectModalSub}>Optional reason shown to the user:</Text>
            <TextInput
              style={styles.rejectInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Credentials unclear, please resubmit"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              autoFocus
            />
            <View style={styles.rejectModalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRejectTarget(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmReject}>
                <Text style={styles.confirmBtnText}>Confirm Rejection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

function DetailChip({ icon, val }: { icon: string; val: string }) {
  if (!val) return null;
  return (
    <View style={styles.detailChip}>
      <Ionicons name={icon as any} size={11} color={Colors.textMuted} />
      <Text style={styles.detailChipText} numberOfLines={1}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  hero: { backgroundColor: Colors.primaryDeep, paddingBottom: Spacing.md },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  heroTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: FontSize.xs, color: Colors.accentLight, marginTop: 2 },
  heroBadge: {
    backgroundColor: Colors.warning,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  heroBadgeText: { fontSize: FontSize.sm, fontWeight: '800', color: '#fff' },

  // Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted },

  // List
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.xs },
  cardHeaderBody: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, flex: 1 },
  cardMeta: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  pill: { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  pillText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  profileLink: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },

  // Details grid
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '48%',
  },
  detailChipText: { fontSize: 10, color: Colors.textSecondary, flex: 1 },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  credBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary + '12',
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary + '30',
    paddingHorizontal: 10, paddingVertical: 5,
  },
  credBtnText: { fontSize: 10, color: Colors.primary, fontWeight: '700' },

  // Actions
  actions: { flex: 1, flexDirection: 'row', gap: Spacing.xs },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, borderRadius: Radius.md, paddingVertical: 7,
  },
  rejectBtn: { backgroundColor: Colors.error + '12', borderWidth: 1, borderColor: Colors.error + '40' },
  approveBtn: { backgroundColor: Colors.success },
  actionBtnText: { fontSize: FontSize.xs, fontWeight: '700' },

  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  emptySub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },

  // Reject modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: Spacing.lg,
  },
  rejectModal: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, width: '100%', gap: Spacing.md,
  },
  rejectModalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  rejectModalSub: { fontSize: FontSize.sm, color: Colors.textSecondary },
  rejectInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    backgroundColor: Colors.background, padding: Spacing.md,
    fontSize: FontSize.sm, color: Colors.text, minHeight: 80, textAlignVertical: 'top',
  },
  rejectModalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  cancelBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  confirmBtn: {
    flex: 2, paddingVertical: 12, borderRadius: Radius.md,
    backgroundColor: Colors.error, alignItems: 'center',
  },
  confirmBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff' },
});
