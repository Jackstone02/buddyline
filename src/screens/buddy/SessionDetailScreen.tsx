import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, DiveSession, DiveSessionMember } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import UserAvatar from '../../components/UserAvatar';
import AppModal from '../../components/AppModal';
import { useAppModal } from '../../hooks/useAppModal';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionDetail'>;

const DIVE_TYPE_LABELS: Record<string, string> = {
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
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    + ' at '
    + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function SessionDetailScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const { profile } = useAuthStore();
  const [session, setSession] = useState<DiveSession | null>(null);
  const [members, setMembers] = useState<DiveSessionMember[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { visible, isLoading, config, showModal, handleConfirm, handleCancel } = useAppModal();

  const fetchSession = useCallback(async () => {
    const [{ data: s }, { data: m }] = await Promise.all([
      supabase
        .from('dive_sessions')
        .select('*, creator:profiles(id, display_name, avatar_url, city_region, verification_status)')
        .eq('id', sessionId)
        .single(),
      supabase
        .from('dive_session_members')
        .select('*, user:profiles(id, display_name, avatar_url, verification_status)')
        .eq('session_id', sessionId),
    ]);
    if (s) setSession(s as DiveSession);
    if (m) {
      setMembers(m as DiveSessionMember[]);
      setIsMember(m.some((mem: any) => mem.user_id === profile?.id));
    }
    setLoading(false);
  }, [sessionId, profile?.id]);

  useEffect(() => {
    fetchSession();

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'buddyline',
        table: 'dive_session_members',
        filter: `session_id=eq.${sessionId}`,
      }, fetchSession)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'buddyline',
        table: 'dive_sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => setSession((prev) => prev ? { ...prev, ...(payload.new as any) } : prev))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchSession, sessionId]);

  const handleJoin = async () => {
    if (!profile || !session) return;
    if (members.length >= session.spots_needed) {
      showModal({ type: 'info', title: 'Session Full', message: 'This dive session is already full.' });
      return;
    }
    setActionLoading(true);
    const { error } = await supabase.from('dive_session_members').insert({
      session_id: sessionId,
      user_id: profile.id,
    });
    if (error) {
      showModal({ type: 'error', title: 'Error', message: 'Could not join session. Please try again.' });
    } else {
      const newCount = members.length + 1;
      if (newCount >= session.spots_needed) {
        await supabase.from('dive_sessions').update({ status: 'full' }).eq('id', sessionId);
      }
      await fetchSession();
    }
    setActionLoading(false);
  };

  const handleLeave = () => {
    showModal({
      type: 'confirm',
      title: 'Leave Session',
      message: 'Are you sure you want to leave this dive session?',
      confirmText: 'Leave',
      cancelText: 'Cancel',
      showCancel: true,
      onConfirm: async () => {
        setActionLoading(true);
        await supabase
          .from('dive_session_members')
          .delete()
          .eq('session_id', sessionId)
          .eq('user_id', profile!.id);
        await fetchSession();
        setActionLoading(false);
      },
    });
  };

  const handleCancel_ = () => {
    showModal({
      type: 'confirm',
      title: 'Cancel Session',
      message: 'Are you sure you want to cancel this dive? All members will be notified.',
      confirmText: 'Cancel Session',
      cancelText: 'Keep it',
      showCancel: true,
      onConfirm: async () => {
        setActionLoading(true);
        await supabase.from('dive_sessions').update({ status: 'cancelled' }).eq('id', sessionId);
        await fetchSession();
        setActionLoading(false);
      },
    });
  };

  const isCreator = profile?.id === session?.creator_id;
  const isOpen = session?.status === 'open';

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Session not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dive Session</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchSession} />}
      >
        {/* Status badge */}
        <View style={[styles.statusBadge, session.status !== 'open' && styles.statusBadgeClosed]}>
          <Text style={styles.statusText}>
            {session.status === 'open' ? 'Open — looking for buddies' :
             session.status === 'full' ? 'Full' :
             session.status === 'cancelled' ? 'Cancelled' : 'Completed'}
          </Text>
        </View>

        {/* Session details card */}
        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
            <Text style={styles.detailText}>{session.location_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.detailText}>{formatDateTime(session.scheduled_at)}</Text>
          </View>
          {session.dive_type && (
            <View style={styles.detailRow}>
              <Ionicons name="water-outline" size={18} color={Colors.primary} />
              <Text style={styles.detailText}>{DIVE_TYPE_LABELS[session.dive_type] ?? session.dive_type}</Text>
            </View>
          )}
          {session.max_depth_m && (
            <View style={styles.detailRow}>
              <Ionicons name="arrow-down-outline" size={18} color={Colors.primary} />
              <Text style={styles.detailText}>Max {session.max_depth_m}m</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={18} color={Colors.primary} />
            <Text style={styles.detailText}>
              {members.length} joined · {session.spots_needed} buddy{session.spots_needed !== 1 ? 's' : ''} needed
            </Text>
          </View>
          {session.notes && (
            <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} style={{ marginTop: 2 }} />
              <Text style={[styles.detailText, { flex: 1 }]}>{session.notes}</Text>
            </View>
          )}
        </View>

        {/* Creator */}
        <Text style={styles.sectionTitle}>Posted by</Text>
        <TouchableOpacity
          style={styles.personCard}
          onPress={() => navigation.navigate('BuddyProfile', { buddyId: session.creator_id })}
          activeOpacity={0.85}
        >
          <UserAvatar
            avatarUrl={session.creator?.avatar_url}
            name={session.creator?.display_name ?? '?'}
            size={44}
          />
          <View style={styles.personInfo}>
            <Text style={styles.personName}>{session.creator?.display_name ?? 'Unknown'}</Text>
            <Text style={styles.personSub}>{session.creator?.city_region}</Text>
          </View>
          {session.creator?.verification_status === 'verified' && (
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
          )}
        </TouchableOpacity>

        {/* Members */}
        {members.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Who's coming ({members.length})</Text>
            {members.map((m) => (
              <TouchableOpacity
                key={m.user_id}
                style={styles.personCard}
                onPress={() => navigation.navigate('BuddyProfile', { buddyId: m.user_id })}
                activeOpacity={0.85}
              >
                <UserAvatar
                  avatarUrl={m.user?.avatar_url}
                  name={m.user?.display_name ?? '?'}
                  size={40}
                />
                <Text style={styles.personName}>{m.user?.display_name ?? 'Diver'}</Text>
                {m.user?.verification_status === 'verified' && (
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                )}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Actions */}
        {isOpen && !isCreator && (
          isMember ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline]}
              onPress={handleLeave}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              {actionLoading
                ? <ActivityIndicator color={Colors.error} />
                : <Text style={[styles.actionBtnText, { color: Colors.error }]}>Leave Session</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleJoin}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name="add-circle-outline" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Join Session</Text>
                  </>}
            </TouchableOpacity>
          )
        )}

        {isCreator && isOpen && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={handleCancel_}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            <Text style={[styles.actionBtnText, { color: Colors.error }]}>Cancel Session</Text>
          </TouchableOpacity>
        )}

        {/* Message a member */}
        {isMember && members.length > 0 && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => navigation.navigate('Messaging', {
              otherUserId: session.creator_id,
              otherUserName: session.creator?.display_name ?? 'Organiser',
            })}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
            <Text style={[styles.actionBtnText, { color: Colors.primary }]}>Message Organiser</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <AppModal
        visible={visible}
        isLoading={isLoading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        {...config}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryDeep },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  errorText: { color: Colors.error, textAlign: 'center', marginTop: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF18', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800', color: '#fff' },
  body: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  statusBadge: {
    backgroundColor: Colors.success + '18',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  statusBadgeClosed: { backgroundColor: Colors.textMuted + '15', borderColor: Colors.textMuted + '30' },
  statusText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.success },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  detailText: { fontSize: FontSize.md, color: Colors.text, flex: 1 },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary, marginTop: Spacing.sm },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  personInfo: { flex: 1 },
  personName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  personSub: { fontSize: FontSize.sm, color: Colors.textSecondary },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 15,
    marginTop: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.error,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionBtnSecondary: {
    backgroundColor: Colors.primary + '12',
    borderWidth: 1.5,
    borderColor: Colors.primary + '30',
    shadowOpacity: 0,
    elevation: 0,
  },
  actionBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
