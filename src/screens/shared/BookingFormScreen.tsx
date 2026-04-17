import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import AppModal from '../../components/AppModal';
import { useAppModal } from '../../hooks/useAppModal';
import { formatTimeRange } from '../../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = RouteProp<RootStackParamList, 'BookingForm'>;

export default function BookingFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const { instructorId, lessonTypeId } = route.params;
  const { profile } = useAuthStore();

  const [lessonType, setLessonType] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { visible, isLoading, config, showModal, handleConfirm, handleCancel } = useAppModal();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const [{ data: lt }, { data: availSlots }] = await Promise.all([
      supabase.from('lesson_types').select('*').eq('id', lessonTypeId).single(),
      supabase
        .from('availability_slots')
        .select('*')
        .eq('instructor_id', instructorId)
        .eq('is_booked', false)
        .gte('slot_date', new Date().toISOString().split('T')[0])
        .order('slot_date')
        .order('start_time'),
    ]);

    // Fetch existing booking counts per slot for this lesson type
    const slotIds = (availSlots || []).map((s: any) => s.id);
    let bookingCounts: Record<string, number> = {};
    if (slotIds.length > 0) {
      const { data: existing } = await supabase
        .from('bookings')
        .select('availability_slot_id')
        .in('availability_slot_id', slotIds)
        .eq('lesson_type_id', lessonTypeId)
        .in('status', ['pending', 'confirmed']);
      (existing || []).forEach((b: any) => {
        bookingCounts[b.availability_slot_id] = (bookingCounts[b.availability_slot_id] || 0) + 1;
      });
    }

    const maxParticipants = lt?.max_participants || 1;
    const enrichedSlots = (availSlots || [])
      .map((s: any) => ({
        ...s,
        booked_count: bookingCounts[s.id] || 0,
        spots_left: maxParticipants - (bookingCounts[s.id] || 0),
      }))
      .filter((s: any) => s.spots_left > 0);

    setLessonType(lt);
    setSlots(enrichedSlots);
    setLoading(false);
  };

  const handleBook = async () => {
    if (!selectedSlot) {
      showModal({ type: 'info', title: 'Select a time slot', message: 'Please choose an available time slot to continue.' });
      return;
    }
    if (!profile) return;
    setSubmitting(true);

    const slot = slots.find((s) => s.id === selectedSlot)!;

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        customer_id: profile.id,
        instructor_id: instructorId,
        lesson_type_id: lessonTypeId,
        availability_slot_id: selectedSlot,
        booking_date: slot.slot_date,
        start_time: slot.start_time,
        participants_count: 1,
        notes: notes.trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      showModal({ type: 'error', title: 'Booking failed', message: error.message });
      setSubmitting(false);
      return;
    }

    // Mark slot as fully booked only when max participants is reached
    if ((slot.booked_count || 0) + 1 >= (lessonType?.max_participants || 1)) {
      await supabase.from('availability_slots').update({ is_booked: true }).eq('id', selectedSlot);
    }

    setSubmitting(false);
    navigation.replace('BookingConfirmation', { bookingId: data.id });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };


  // Group slots by date
  const slotsByDate: Record<string, any[]> = {};
  slots.forEach((s) => {
    if (!slotsByDate[s.slot_date]) slotsByDate[s.slot_date] = [];
    slotsByDate[s.slot_date].push(s);
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Session</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Lesson summary */}
        {lessonType && (
          <View style={styles.lessonCard}>
            <Text style={styles.lessonName}>{lessonType.name}</Text>
            <View style={styles.lessonMeta}>
              <View style={styles.metaPill}>
                <Ionicons name="time-outline" size={13} color={Colors.primary} />
                <Text style={styles.metaPillText}>{lessonType.duration_minutes} min</Text>
              </View>
              <View style={styles.metaPill}>
                <Ionicons name="bar-chart-outline" size={13} color={Colors.primary} />
                <Text style={styles.metaPillText}>{lessonType.skill_level}</Text>
              </View>
              <View style={styles.metaPill}>
                <Ionicons name="water-outline" size={13} color={Colors.primary} />
                <Text style={styles.metaPillText}>{lessonType.session_format}</Text>
              </View>
            </View>
            <Text style={styles.price}>₱{lessonType.price}</Text>
          </View>
        )}

        {/* Slot selection */}
        <Text style={styles.sectionTitle}>Choose a Time Slot</Text>
        {Object.keys(slotsByDate).length === 0 ? (
          <View style={styles.noSlots}>
            <Ionicons name="calendar-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.noSlotsText}>No available slots at the moment.</Text>
          </View>
        ) : (
          Object.entries(slotsByDate).map(([date, dateSlots]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateLabel}>{formatDate(date)}</Text>
              <View style={styles.slotRow}>
                {dateSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot.id}
                    style={[styles.slotChip, selectedSlot === slot.id && styles.slotChipActive]}
                    onPress={() => setSelectedSlot(slot.id)}
                  >
                    <Text style={[styles.slotTime, selectedSlot === slot.id && styles.slotTimeActive]}>
                      {formatTimeRange(slot.start_time, slot.end_time)}
                    </Text>
                    {(lessonType?.max_participants ?? 1) > 1 && (
                      <Text style={[styles.slotSpots, selectedSlot === slot.id && styles.slotSpotsActive]}>
                        {slot.spots_left} spot{slot.spots_left !== 1 ? 's' : ''} left
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}

        {/* Notes */}
        <Text style={styles.sectionTitle}>Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Any questions or special requests for the instructor..."
          placeholderTextColor={Colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Confirm button */}
        <TouchableOpacity
          style={[styles.confirmBtn, (!selectedSlot || submitting) && styles.confirmBtnDisabled]}
          onPress={handleBook}
          disabled={!selectedSlot || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Bookings are pending until the instructor confirms. You will be notified by message.
        </Text>
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
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 40 },
  lessonCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  lessonName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  lessonMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '15',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  metaPillText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  price: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  noSlots: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  noSlotsText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  dateGroup: { gap: Spacing.xs },
  dateLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  slotChip: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  slotChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  slotTime: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  slotTimeActive: { color: '#fff' },
  slotSpots: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  slotSpotsActive: { color: 'rgba(255,255,255,0.75)' },
  notesInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.text,
    minHeight: 100,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { fontSize: FontSize.md, fontWeight: '700', color: '#fff' },
  disclaimer: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: Spacing.md,
  },
});
