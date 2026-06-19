import React, { useEffect, useState, useCallback } from 'react';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, DiveRequestStatus } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import UserAvatar from '../../components/UserAvatar';
import AppModal from '../../components/AppModal';
import { useAppModal } from '../../hooks/useAppModal';

type Props = NativeStackScreenProps<RootStackParamList, 'DiveRequestDetail'>;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const STATUS_CONFIG: Record<DiveRequestStatus, { label: string; color: string; icon: string }> = {
  pending:   { label: 'Pending',   color: Colors.warning,   icon: 'time-outline' },
  accepted:  { label: 'Accepted',  color: Colors.success,   icon: 'checkmark-circle-outline' },
  declined:  { label: 'Declined',  color: Colors.error,     icon: 'close-circle-outline' },
  cancelled: { label: 'Cancelled', color: Colors.textMuted, icon: 'ban-outline' },
  completed: { label: 'Completed', color: Colors.primary,   icon: 'trophy-outline' },
};

export default function DiveRequestDetailScreen({ navigation, route }: Props) {
  const { requestId } = route.params;
  const { profile } = useAuthStore();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const { visible, isLoading, config, showModal, handleConfirm: modalConfirm, handleCancel: modalCancel } = useAppModal();

  const fetchRequest = useCallback(async () => {
    const { data } = await supabase
      .from('dive_requests')
      .select(`
        *,
        requester:profiles!dive_requests_requester_id_fkey(id, display_name, avatar_url, city_region),
        buddy:profiles!dive_requests_buddy_id_fkey(id, display_name, avatar_url, city_region)
      `)
      .eq('id', requestId)
      .single();
    setRequest(data);
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    fetchRequest();

    const channel = supabase
      .channel(`dive-request-${requestId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'buddyline',
        table: 'dive_requests',
        filter: `id=eq.${requestId}`,
      }, (payload) => setRequest((prev: any) => prev ? { ...prev, ...(payload.new as any) } : prev))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchRequest, requestId]);

  const updateStatus = async (status: DiveRequestStatus) => {
    setActionLoading(true);
    const { error } = await supabase
      .from('dive_requests')
      .update({ status })
      .eq('id', requestId);
    setActionLoading(false);

    if (error) {
      showModal({ type: 'error', title: 'Error', message: 'Could not update request. Please try again.' });
      return;
    }
    setRequest((prev: any) => ({ ...prev, status }));
  };

  const handleAccept = () => {
    showModal({
      type: 'confirm',
      title: 'Accept Request',
      message: `Accept dive request from ${request?.requester?.display_name}?`,
      confirmText: 'Accept',
      cancelText: 'Cancel',
      showCancel: true,
      onConfirm: () => updateStatus('accepted'),
    });
  };

  const handleDecline = () => {
    showModal({
      type: 'confirm',
      title: 'Decline Request',
      message: 'Decline this dive request?',
      confirmText: 'Decline',
      cancelText: 'Cancel',
      showCancel: true,
      onConfirm: () => updateStatus('declined'),
    });
  };

  const handleCancel = () => {
    showModal({
      type: 'confirm',
      title: 'Cancel Request',
      message: 'Cancel your dive request?',
      confirmText: 'Cancel Request',
      cancelText: 'Keep',
      showCancel: true,
      onConfirm: () => updateStatus('cancelled'),
    });
  };

  const handleMessage = () => {
    if (!request || !profile) return;
    const other = profile.id === request.requester_id ? request.buddy : request.requester;
    navigation.navigate('Messaging', { otherUserId: other.id, otherUserName: other.display_name });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!request || !profile) return null;

  const isRequester = profile.id === request.requester_id;
  const other = isRequester ? request.buddy : request.requester;
  const statusCfg = STATUS_CONFIG[request.status as DiveRequestStatus] ?? STATUS_CONFIG.pending;
  const isPending = request.status === 'pending';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dive Request</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '18', borderColor: statusCfg.color + '40' }]}>
          <Ionicons name={statusCfg.icon as any} size={16} color={statusCfg.color} />
          <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>

        {/* Other user */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{isRequester ? 'Requested buddy' : 'Request from'}</Text>
          <View style={styles.userRow}>
            <UserAvatar avatarUrl={other?.avatar_url} name={other?.display_name} size={52} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{other?.display_name}</Text>
              {other?.city_region ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.locationText}>{other.city_region}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Dive details */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Dive Details</Text>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <View>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(request.requested_date)}</Text>
            </View>
          </View>

          <View style={[styles.detailRow, { marginTop: Spacing.md }]}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
            <View>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{request.location_name}</Text>
            </View>
          </View>

          {request.disciplines?.length > 0 && (
            <View style={[styles.detailRow, { marginTop: Spacing.md, alignItems: 'flex-start' }]}>
              <Ionicons name="layers-outline" size={18} color={Colors.primary} style={{ marginTop: 2 }} />
              <View>
                <Text style={styles.detailLabel}>Disciplines</Text>
                <View style={styles.chipRow}>
                  {request.disciplines.map((d: string) => (
                    <View key={d} style={styles.chip}>
                      <Text style={styles.chipText}>{d.replace('_', ' ')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {request.notes ? (
            <View style={[styles.detailRow, { marginTop: Spacing.md, alignItems: 'flex-start' }]}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Message</Text>
                <Text style={styles.detailValue}>{request.notes}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Actions */}
        {actionLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.lg }} />
        ) : (
          <View style={styles.actions}>
            {/* Buddy receives request → can accept or decline */}
            {!isRequester && isPending && (
              <>
                <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} activeOpacity={0.85}>
                  <Ionicons name="checkmark-outline" size={18} color="#fff" />
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} activeOpacity={0.85}>
                  <Ionicons name="close-outline" size={18} color={Colors.error} />
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Requester can cancel while pending */}
            {isRequester && isPending && (
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.85}>
                <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
                <Text style={styles.cancelBtnText}>Cancel Request</Text>
              </TouchableOpacity>
            )}

            {/* Message button when accepted */}
            {request.status === 'accepted' && (
              <TouchableOpacity style={styles.messageBtn} onPress={handleMessage} activeOpacity={0.85}>
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                <Text style={styles.messageBtnText}>Message {other?.display_name}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <AppModal
        visible={visible}
        isLoading={isLoading}
        onConfirm={modalConfirm}
        onCancel={modalCancel}
        {...config}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryDeep },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800', color: '#fff' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, backgroundColor: Colors.background, flexGrow: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  statusText: { fontSize: FontSize.sm, fontWeight: '700' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.md },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  userInfo: { flex: 1 },
  userName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  locationText: { fontSize: FontSize.xs, color: Colors.textMuted },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  detailLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: FontSize.md, color: Colors.text, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: 4 },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
  },
  chipText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600', textTransform: 'capitalize' },
  actions: { gap: Spacing.sm, marginTop: Spacing.md },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 14,
  },
  acceptBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
  },
  declineBtnText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '700' },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
  },
  cancelBtnText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '700' },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  messageBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
