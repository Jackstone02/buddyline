import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, BookingStatus } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import AppModal from '../../components/AppModal';
import { useAppModal } from '../../hooks/useAppModal';
import { formatTimeRange } from '../../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = RouteProp<RootStackParamList, 'InstructorBookingDetail'>;

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: '#F59E0B',
  confirmed: Colors.success,
  completed: Colors.primary,
  cancelled: '#EF4444',
};

export default function InstructorBookingDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const { bookingId } = route.params;
  const { profile } = useAuthStore();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { visible, isLoading, config, showModal, handleConfirm, handleCancel } = useAppModal();

  const fetchBooking = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('*, customer:profiles!customer_id(id, display_name, city_region, bio), lesson_type:lesson_types(*), slot:availability_slots!availability_slot_id(start_time, end_time)')
      .eq('id', bookingId)
      .single();
    setBooking(data);
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();

    const channel = supabase
      .channel(`booking-instructor-${bookingId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'buddyline',
        table: 'bookings',
        filter: `id=eq.${bookingId}`,
      }, (payload) => setBooking((prev: any) => prev ? { ...prev, ...(payload.new as any) } : prev))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchBooking, bookingId]);

  const updateStatus = async (newStatus: BookingStatus) => {
    setActionLoading(true);
    await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);

    if (newStatus === 'cancelled' && booking?.availability_slot_id) {
      await supabase.from('availability_slots').update({ is_booked: false }).eq('id', booking.availability_slot_id);
    }

    setBooking((b: any) => ({ ...b, status: newStatus }));
    setActionLoading(false);
  };

  const handleDecline = () => {
    showModal({
      type: 'confirm',
      title: 'Decline Booking',
      message: 'Are you sure you want to decline this booking request?',
      confirmText: 'Decline',
      cancelText: 'Keep',
      showCancel: true,
      onConfirm: () => updateStatus('cancelled'),
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading || !booking) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;
  }

  const status: BookingStatus = booking.status;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Detail</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status */}
        <View style={[styles.statusBanner, { backgroundColor: STATUS_COLORS[status] + '15', borderColor: STATUS_COLORS[status] + '40' }]}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
          <Text style={[styles.statusLabel, { color: STATUS_COLORS[status] }]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </View>

        {/* Session details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{booking.lesson_type?.name ?? 'Session'}</Text>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.rowText}>{formatDate(booking.booking_date)}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.rowText}>
              {booking.slot
                ? formatTimeRange(booking.slot.start_time, booking.slot.end_time)
                : booking.start_time}
              {' · '}{booking.lesson_type?.duration_minutes} min
            </Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="water-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.rowText}>{booking.lesson_type?.session_format}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="people-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.rowText}>{booking.participants_count} participant(s)</Text>
          </View>
          {booking.notes && (
            <View style={[styles.row, { alignItems: 'flex-start' }]}>
              <Ionicons name="chatbubble-outline" size={16} color={Colors.textMuted} style={{ marginTop: 2 }} />
              <Text style={styles.rowText}>{booking.notes}</Text>
            </View>
          )}
        </View>

        {/* Student card */}
        {booking.customer && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Student</Text>
            <View style={styles.studentRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {booking.customer.display_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                </Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{booking.customer.display_name}</Text>
                <Text style={styles.studentLocation}>{booking.customer.city_region}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.msgBtn}
              onPress={() => navigation.navigate('Messaging', {
                otherUserId: booking.customer.id,
                otherUserName: booking.customer.display_name,
              })}
            >
              <Ionicons name="chatbubble-outline" size={16} color={Colors.primary} />
              <Text style={styles.msgBtnText}>Message Student</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Actions */}
        {actionLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.lg }} />
        ) : (
          <>
            {status === 'pending' && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => updateStatus('confirmed')}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={styles.acceptBtnText}>Confirm Booking</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
                  <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}
            {status === 'confirmed' && (
              <TouchableOpacity style={styles.completeBtn} onPress={() => updateStatus('completed')}>
                <Ionicons name="trophy-outline" size={18} color="#fff" />
                <Text style={styles.completeBtnText}>Mark as Completed</Text>
              </TouchableOpacity>
            )}
          </>
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
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryDeep,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: '#fff' },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: FontSize.md, fontWeight: '700' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowText: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.sm },
  studentInfo: { flex: 1 },
  studentName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  studentLocation: { fontSize: FontSize.sm, color: Colors.textSecondary },
  msgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  msgBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
  },
  acceptBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff' },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  declineBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: '#EF4444' },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  completeBtnText: { fontSize: FontSize.md, fontWeight: '700', color: '#fff' },
});
