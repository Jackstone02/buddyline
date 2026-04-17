import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, AvailabilitySlot, Booking, BookingStatus } from '../../types';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import AppModal from '../../components/AppModal';
import { useAppModal } from '../../hooks/useAppModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const REQUEST_TABS: { key: BookingStatus; label: string }[] = [
  { key: 'pending',   label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending:   '#F59E0B',
  confirmed: Colors.success,
  completed: Colors.primary,
  cancelled: '#EF4444',
};

const todayStr = new Date().toISOString().split('T')[0];

const toDateStr = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export default function AvailabilityScreen() {
  const navigation = useNavigation<Nav>();
  const { profile } = useAuthStore();

  // View toggle: calendar vs requests vs lessons
  const [screenView, setScreenView] = useState<'calendar' | 'requests' | 'lessons'>('calendar');

  // Calendar state
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Requests state
  const [requestTab, setRequestTab] = useState<BookingStatus>('pending');
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Lesson types state
  const [lessonTypes, setLessonTypes] = useState<any[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [ltName, setLtName] = useState('');
  const [ltDuration, setLtDuration] = useState('60');
  const [ltSkillLevel, setLtSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [ltFormat, setLtFormat] = useState<'pool' | 'open_water' | 'theory'>('open_water');
  const [ltPrice, setLtPrice] = useState('');
  const [ltMaxPax, setLtMaxPax] = useState('1');
  const [ltSaving, setLtSaving] = useState(false);

  const { visible, isLoading, config, showModal, handleConfirm, handleCancel } = useAppModal();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  useEffect(() => {
    if (screenView === 'requests') fetchRequests();
    if (screenView === 'lessons') fetchLessonTypes();
  }, [screenView, requestTab]);

  const fetchData = async () => {
    if (!profile) return;

    const [{ data: slotsData }, { data: bookingsData }] = await Promise.all([
      supabase
        .from('availability_slots')
        .select('*')
        .eq('instructor_id', profile.id)
        .gte('slot_date', todayStr)
        .order('slot_date')
        .order('start_time'),
      supabase
        .from('bookings')
        .select('*, customer:profiles!customer_id(*), lesson_type:lesson_types(*)')
        .eq('instructor_id', profile.id)
        .gte('booking_date', todayStr)
        .order('booking_date'),
    ]);

    setSlots(slotsData || []);
    setBookings(bookingsData || []);
  };

  const fetchRequests = async () => {
    if (!profile) return;
    setRequestsLoading(true);

    const { data } = await supabase
      .from('bookings')
      .select('*, customer:profiles!customer_id(id, display_name, city_region), lesson_type:lesson_types(*)')
      .eq('instructor_id', profile.id)
      .eq('status', requestTab)
      .order('booking_date', { ascending: true });

    setRequests(data || []);
    setRequestsLoading(false);
  };

  const fetchLessonTypes = async () => {
    if (!profile) return;
    setLessonsLoading(true);
    const { data } = await supabase
      .from('lesson_types')
      .select('*')
      .eq('instructor_id', profile.id)
      .order('created_at', { ascending: true });
    setLessonTypes(data || []);
    setLessonsLoading(false);
  };

  const saveLessonType = async () => {
    if (!profile || !ltName.trim()) {
      showModal({ type: 'error', title: 'Name Required', message: 'Please enter a lesson name.' });
      return;
    }
    const max = Math.max(1, parseInt(ltMaxPax) || 1);
    setLtSaving(true);
    const { error } = await supabase.from('lesson_types').insert({
      instructor_id: profile.id,
      name: ltName.trim(),
      duration_minutes: parseInt(ltDuration) || 60,
      skill_level: ltSkillLevel,
      session_format: ltFormat,
      price: parseInt(ltPrice) || 0,
      max_participants: max,
    });
    setLtSaving(false);
    if (error) {
      showModal({ type: 'error', title: 'Error', message: 'Could not save lesson type.' });
    } else {
      setLtName(''); setLtDuration('60'); setLtSkillLevel('beginner');
      setLtFormat('open_water'); setLtPrice(''); setLtMaxPax('1');
      setShowLessonForm(false);
      fetchLessonTypes();
    }
  };

  const deleteLessonType = (id: string) => {
    showModal({
      type: 'confirm',
      title: 'Delete Lesson',
      message: 'Remove this lesson type? Existing bookings will not be affected.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      showCancel: true,
      onConfirm: async () => {
        await supabase.from('lesson_types').delete().eq('id', id);
        setLessonTypes((prev) => prev.filter((lt) => lt.id !== id));
      },
    });
  };

  const formatRequestDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // ── Calendar helpers ───────────────────────────────────────
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d);
  };
  const nextMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(d);
  };

  const openSlotDates  = new Set(slots.filter((s) => !s.is_booked).map((s) => s.slot_date));
  const pendingDates   = new Set((bookings as any[]).filter((b) => b.status === 'pending').map((b) => b.booking_date));
  const confirmedDates = new Set((bookings as any[]).filter((b) => b.status === 'confirmed').map((b) => b.booking_date));

  const selectedSlots    = slots.filter((s) => s.slot_date === selectedDate);
  const selectedBookings = (bookings as any[]).filter((b) => b.booking_date === selectedDate);

  // ── Add / Delete slot ──────────────────────────────────────
  const addSlot = async () => {
    if (!profile) return;
    const start = startTime.toTimeString().slice(0, 5);
    const end   = endTime.toTimeString().slice(0, 5);
    if (start >= end) {
      showModal({ type: 'error', title: 'Invalid Time', message: 'End time must be after start time.' });
      return;
    }

    const { error } = await supabase.from('availability_slots').insert({
      instructor_id: profile.id,
      slot_date: selectedDate,
      start_time: start,
      end_time: end,
      is_booked: false,
    });
    if (error) {
      showModal({ type: 'error', title: 'Error', message: 'Failed to add slot.' });
    } else {
      fetchData();
      setShowAddForm(false);
    }
  };

  const deleteSlot = (slotId: string, isBooked: boolean) => {
    if (isBooked) {
      showModal({ type: 'warning', title: 'Cannot Delete', message: 'This slot already has a booking.' });
      return;
    }
    showModal({
      type: 'confirm',
      title: 'Delete Slot',
      message: 'Remove this availability slot?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      showCancel: true,
      onConfirm: async () => {
        await supabase.from('availability_slots').delete().eq('id', slotId);
        setSlots((prev) => prev.filter((s) => s.id !== slotId));
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroContent}>
            <View>
              <Text style={styles.heroTitle}>My Schedule</Text>
              <Text style={styles.heroSub}>Calendar & booking requests</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="calendar" size={26} color={Colors.accent} />
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* View toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewToggleBtn, screenView === 'calendar' && styles.viewToggleBtnActive]}
          onPress={() => setScreenView('calendar')}
        >
          <Ionicons name="calendar-outline" size={15} color={screenView === 'calendar' ? '#fff' : Colors.primary} />
          <Text style={[styles.viewToggleText, screenView === 'calendar' && styles.viewToggleTextActive]}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleBtn, screenView === 'requests' && styles.viewToggleBtnActive]}
          onPress={() => setScreenView('requests')}
        >
          <Ionicons name="clipboard-outline" size={15} color={screenView === 'requests' ? '#fff' : Colors.primary} />
          <Text style={[styles.viewToggleText, screenView === 'requests' && styles.viewToggleTextActive]}>Requests</Text>
          {(bookings as any[]).filter((b: any) => b.status === 'pending').length > 0 && screenView !== 'requests' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{(bookings as any[]).filter((b: any) => b.status === 'pending').length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleBtn, screenView === 'lessons' && styles.viewToggleBtnActive]}
          onPress={() => setScreenView('lessons')}
        >
          <Ionicons name="school-outline" size={15} color={screenView === 'lessons' ? '#fff' : Colors.primary} />
          <Text style={[styles.viewToggleText, screenView === 'lessons' && styles.viewToggleTextActive]}>Lessons</Text>
        </TouchableOpacity>
      </View>

      {screenView === 'lessons' ? (
        // ── Lessons view ─────────────────────────────────────────
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
          <View style={styles.lessonsHeader}>
            <Text style={styles.lessonsTitle}>My Lesson Types</Text>
            <TouchableOpacity
              style={[styles.addSlotBtn, showLessonForm && styles.addSlotBtnCancel]}
              onPress={() => setShowLessonForm((v) => !v)}
              activeOpacity={0.8}
            >
              <Ionicons name={showLessonForm ? 'close' : 'add'} size={14} color="#fff" />
              <Text style={styles.addSlotBtnText}>{showLessonForm ? 'Cancel' : 'Add Lesson'}</Text>
            </TouchableOpacity>
          </View>

          {showLessonForm && (
            <View style={styles.lessonForm}>
              <Text style={styles.ltLabel}>Lesson Name *</Text>
              <TextInput
                style={styles.ltInput}
                value={ltName}
                onChangeText={setLtName}
                placeholder="e.g. Open Water Course"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={[styles.ltLabel, { marginTop: Spacing.sm }]}>Duration</Text>
              <View style={styles.ltChipRow}>
                {(['30', '45', '60', '90', '120'] as const).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.ltChip, ltDuration === d && styles.ltChipActive]}
                    onPress={() => setLtDuration(d)}
                  >
                    <Text style={[styles.ltChipText, ltDuration === d && styles.ltChipTextActive]}>{d} min</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.ltLabel, { marginTop: Spacing.sm }]}>Skill Level</Text>
              <View style={styles.ltChipRow}>
                {(['beginner', 'intermediate', 'advanced'] as const).map((sl) => (
                  <TouchableOpacity
                    key={sl}
                    style={[styles.ltChip, ltSkillLevel === sl && styles.ltChipActive]}
                    onPress={() => setLtSkillLevel(sl)}
                  >
                    <Text style={[styles.ltChipText, ltSkillLevel === sl && styles.ltChipTextActive]}>{sl}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.ltLabel, { marginTop: Spacing.sm }]}>Format</Text>
              <View style={styles.ltChipRow}>
                {(['pool', 'open_water', 'theory'] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.ltChip, ltFormat === f && styles.ltChipActive]}
                    onPress={() => setLtFormat(f)}
                  >
                    <Text style={[styles.ltChipText, ltFormat === f && styles.ltChipTextActive]}>{f.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.ltRow}>
                <View style={styles.ltHalf}>
                  <Text style={[styles.ltLabel, { marginTop: Spacing.sm }]}>Price (₱)</Text>
                  <TextInput
                    style={styles.ltInput}
                    value={ltPrice}
                    onChangeText={setLtPrice}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.ltHalf}>
                  <Text style={[styles.ltLabel, { marginTop: Spacing.sm }]}>Max Students</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setLtMaxPax((v) => String(Math.max(1, parseInt(v) - 1)))}
                    >
                      <Ionicons name="remove" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{ltMaxPax}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setLtMaxPax((v) => String(parseInt(v) + 1))}
                    >
                      <Ionicons name="add" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.confirmBtn, ltSaving && { opacity: 0.6 }]}
                onPress={saveLessonType}
                disabled={ltSaving}
                activeOpacity={0.85}
              >
                {ltSaving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Ionicons name="checkmark-circle-outline" size={16} color="#fff" /><Text style={styles.confirmBtnText}> Save Lesson</Text></>
                }
              </TouchableOpacity>
            </View>
          )}

          {lessonsLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
          ) : lessonTypes.length === 0 && !showLessonForm ? (
            <View style={styles.reqEmpty}>
              <View style={styles.reqEmptyIcon}>
                <Ionicons name="school-outline" size={40} color={Colors.primary} />
              </View>
              <Text style={styles.reqEmptyText}>No lesson types yet</Text>
              <Text style={[styles.reqMetaText, { textAlign: 'center', marginTop: 4 }]}>
                Add a lesson type so students can discover and book you.
              </Text>
            </View>
          ) : (
            lessonTypes.map((lt) => (
              <View key={lt.id} style={styles.ltCard}>
                <View style={styles.ltCardBody}>
                  <Text style={styles.ltCardName}>{lt.name}</Text>
                  <View style={styles.ltCardMeta}>
                    <Text style={styles.ltCardMetaText}>{lt.duration_minutes} min</Text>
                    <Text style={styles.ltCardMetaText}>·</Text>
                    <Text style={styles.ltCardMetaText}>{lt.skill_level}</Text>
                    <Text style={styles.ltCardMetaText}>·</Text>
                    <Text style={styles.ltCardMetaText}>{lt.session_format?.replace('_', ' ')}</Text>
                  </View>
                  <View style={styles.ltCardBottom}>
                    <Text style={styles.ltCardPrice}>₱{lt.price}</Text>
                    <View style={styles.ltCardPaxBadge}>
                      <Ionicons name="people-outline" size={12} color={Colors.primary} />
                      <Text style={styles.ltCardPaxText}>max {lt.max_participants}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={() => deleteLessonType(lt.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      ) : screenView === 'requests' ? (
        // ── Requests view ─────────────────────────────────────────
        <View style={styles.requestsContainer}>
          {/* Status tabs */}
          <View style={styles.reqTabBar}>
            {REQUEST_TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.reqTab, requestTab === t.key && styles.reqTabActive]}
                onPress={() => setRequestTab(t.key)}
              >
                <Text style={[styles.reqTabText, requestTab === t.key && styles.reqTabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {requestsLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
          ) : (
            <FlatList
              data={requests}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.reqList}
              ListEmptyComponent={
                <View style={styles.reqEmpty}>
                  <View style={styles.reqEmptyIcon}>
                    <Ionicons name="clipboard-outline" size={40} color={Colors.primary} />
                  </View>
                  <Text style={styles.reqEmptyText}>No {requestTab} bookings</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.reqCard}
                  onPress={() => navigation.navigate('InstructorBookingDetail', { bookingId: item.id })}
                  activeOpacity={0.85}
                >
                  <View style={[styles.reqStatusBar, { backgroundColor: STATUS_COLORS[item.status as BookingStatus] }]} />
                  <View style={styles.reqCardBody}>
                    <View style={styles.reqCardTopRow}>
                      <Text style={styles.reqLessonName}>{item.lesson_type?.name ?? 'Session'}</Text>
                      {item.status === 'pending' && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>New</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.reqMetaRow}>
                      <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.reqMetaText}>{item.customer?.display_name ?? 'Student'}</Text>
                    </View>
                    <View style={styles.reqMetaRow}>
                      <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.reqMetaText}>{formatRequestDate(item.booking_date)} · {item.start_time}</Text>
                    </View>
                    {item.notes && (
                      <Text style={styles.reqNote} numberOfLines={1}>"{item.notes}"</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>

        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn}>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Calendar grid */}
        <View style={styles.calendar}>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((d) => (
              <Text key={d} style={styles.weekDay}>{d}</Text>
            ))}
          </View>
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={styles.weekRow}>
              {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                if (!day) return <View key={col} style={styles.dayCell} />;
                const dateStr = toDateStr(year, month, day);
                const isSelected = dateStr === selectedDate;
                const isToday    = dateStr === todayStr;
                const hasOpen    = openSlotDates.has(dateStr);
                const hasPending = pendingDates.has(dateStr);
                const hasConf    = confirmedDates.has(dateStr);
                return (
                  <TouchableOpacity
                    key={col}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      isToday && !isSelected && styles.dayCellToday,
                    ]}
                    onPress={() => { setSelectedDate(dateStr); setShowAddForm(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dayNum,
                      isSelected && styles.dayNumSelected,
                      isToday && !isSelected && styles.dayNumToday,
                    ]}>
                      {day}
                    </Text>
                    <View style={styles.dots}>
                      {hasOpen    && <View style={[styles.dot, { backgroundColor: Colors.primary }]} />}
                      {hasPending && <View style={[styles.dot, { backgroundColor: Colors.warning }]} />}
                      {hasConf    && <View style={[styles.dot, { backgroundColor: Colors.success }]} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.legendText}>Open slot</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
            <Text style={styles.legendText}>Pending</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.legendText}>Confirmed</Text>
          </View>
        </View>

        {/* Day detail panel */}
        <View style={styles.panel}>
          <Text style={styles.panelDate}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
          </Text>

          {/* Bookings for selected date */}
          {selectedBookings.length > 0 && (
            <>
              <Text style={styles.panelLabel}>Bookings</Text>
              {selectedBookings.map((b: any) => {
                const statusColor =
                  b.status === 'confirmed' ? Colors.success :
                  b.status === 'pending'   ? Colors.warning : Colors.textMuted;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={styles.bookingRow}
                    onPress={() => navigation.navigate('InstructorBookingDetail', { bookingId: b.id })}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.bookingAccent, { backgroundColor: statusColor }]} />
                    <View style={styles.bookingBody}>
                      <Text style={styles.bookingName}>
                        {b.customer?.display_name ?? 'Student'}
                      </Text>
                      <Text style={styles.bookingMeta}>
                        {b.start_time} · {b.lesson_type?.name ?? 'Lesson'} · {b.participants_count} pax
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>{b.status}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Slots header + Add button */}
          <View style={styles.slotHeader}>
            <Text style={styles.panelLabel}>
              Availability Slots {selectedSlots.length > 0 ? `(${selectedSlots.length})` : ''}
            </Text>
            <TouchableOpacity
              style={[styles.addSlotBtn, showAddForm && styles.addSlotBtnCancel]}
              onPress={() => setShowAddForm((v) => !v)}
              activeOpacity={0.8}
            >
              <Ionicons name={showAddForm ? 'close' : 'add'} size={14} color="#fff" />
              <Text style={styles.addSlotBtnText}>{showAddForm ? 'Cancel' : 'Add Slot'}</Text>
            </TouchableOpacity>
          </View>

          {/* Add slot form */}
          {showAddForm && (
            <View style={styles.addForm}>
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={styles.timeLabel}>Start</Text>
                  <TouchableOpacity style={styles.timeBtn} onPress={() => setShowStartPicker(true)}>
                    <Ionicons name="time-outline" size={15} color={Colors.primary} />
                    <Text style={styles.timeBtnText}> {startTime.toTimeString().slice(0, 5)}</Text>
                  </TouchableOpacity>
                  {showStartPicker && (
                    <DateTimePicker
                      value={startTime}
                      mode="time"
                      onChange={(_, d) => { setShowStartPicker(false); if (d) setStartTime(d); }}
                    />
                  )}
                </View>
                <View style={styles.timeField}>
                  <Text style={styles.timeLabel}>End</Text>
                  <TouchableOpacity style={styles.timeBtn} onPress={() => setShowEndPicker(true)}>
                    <Ionicons name="time-outline" size={15} color={Colors.primary} />
                    <Text style={styles.timeBtnText}> {endTime.toTimeString().slice(0, 5)}</Text>
                  </TouchableOpacity>
                  {showEndPicker && (
                    <DateTimePicker
                      value={endTime}
                      mode="time"
                      onChange={(_, d) => { setShowEndPicker(false); if (d) setEndTime(d); }}
                    />
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.confirmBtn} onPress={addSlot} activeOpacity={0.85}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={styles.confirmBtnText}> Confirm Add Slot</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Slot list */}
          {selectedSlots.length === 0 && !showAddForm && (
            <View style={styles.emptyDay}>
              <Ionicons name="time-outline" size={26} color={Colors.textMuted} />
              <Text style={styles.emptyDayText}>No slots set for this day</Text>
              <Text style={styles.emptyDayHint}>Tap "Add Slot" to create one.</Text>
            </View>
          )}
          {selectedSlots.map((slot) => (
            <View key={slot.id} style={styles.slotRow}>
              <Ionicons name="time-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.slotTime}>{slot.start_time} – {slot.end_time}</Text>
              <View style={[
                styles.slotStatus,
                { backgroundColor: slot.is_booked ? Colors.success + '20' : Colors.primary + '15' },
              ]}>
                <Text style={[
                  styles.slotStatusText,
                  { color: slot.is_booked ? Colors.success : Colors.primary },
                ]}>
                  {slot.is_booked ? 'Booked' : 'Open'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => deleteSlot(slot.id, slot.is_booked)}
                style={styles.deleteBtn}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={slot.is_booked ? Colors.textMuted : Colors.error}
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
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
  hero: { backgroundColor: Colors.primaryDeep, paddingBottom: Spacing.lg },
  heroContent: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  heroTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { fontSize: FontSize.xs, color: Colors.accentLight, marginTop: 3 },
  heroIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#FFFFFF18', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FFFFFF30',
  },
  inner: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  // View toggle
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  viewToggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: Radius.full, paddingVertical: 8,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  viewToggleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  viewToggleText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  viewToggleTextActive: { color: '#fff' },
  badge: {
    backgroundColor: '#F59E0B', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center',
  },
  badgeText: { fontSize: 10, color: '#fff', fontWeight: '800' },

  // Requests view
  requestsContainer: { flex: 1 },
  reqTabBar: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  reqTab: {
    flex: 1, paddingVertical: Spacing.sm, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  reqTabActive: { borderBottomColor: Colors.primary },
  reqTabText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted },
  reqTabTextActive: { color: Colors.primary },
  reqList: { padding: Spacing.md, gap: Spacing.sm },
  reqCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
    shadowColor: Colors.text, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  reqStatusBar: { width: 5, alignSelf: 'stretch' },
  reqCardBody: { flex: 1, paddingVertical: Spacing.md, paddingLeft: Spacing.sm, gap: 4, paddingRight: Spacing.xs },
  reqCardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reqLessonName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, flex: 1 },
  newBadge: { backgroundColor: '#F59E0B', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  newBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  reqMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reqMetaText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  reqNote: { fontSize: FontSize.xs, color: Colors.textMuted, fontStyle: 'italic', marginTop: 2 },
  reqEmpty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.sm },
  reqEmptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  reqEmptyText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  monthNav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.sm,
  },
  monthNavBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  monthTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  calendar: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  weekRow: { flexDirection: 'row' },
  weekDay: {
    flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700',
    color: Colors.textMuted, paddingVertical: Spacing.xs,
  },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 5, borderRadius: Radius.sm, margin: 1 },
  dayCellSelected: { backgroundColor: Colors.primary },
  dayCellToday: { backgroundColor: Colors.surfaceBlue, borderWidth: 1.5, borderColor: Colors.primary },
  dayNum: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  dayNumSelected: { color: '#fff', fontWeight: '800' },
  dayNumToday: { color: Colors.primary, fontWeight: '800' },
  dots: { flexDirection: 'row', gap: 2, marginTop: 2, minHeight: 5 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  legend: {
    flexDirection: 'row', gap: Spacing.lg,
    marginBottom: Spacing.md, paddingHorizontal: Spacing.xs,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  panel: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  panelDate: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginBottom: Spacing.md },
  panelLabel: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  bookingRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: Radius.md,
    marginTop: Spacing.xs, marginBottom: Spacing.xs, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border, paddingRight: Spacing.sm,
  },
  bookingAccent: { width: 4, alignSelf: 'stretch' },
  bookingBody: { flex: 1, paddingVertical: Spacing.sm, paddingLeft: Spacing.sm },
  bookingName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  bookingMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3, marginRight: Spacing.xs },
  statusText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  slotHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  addSlotBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 6, gap: 4,
  },
  addSlotBtnCancel: { backgroundColor: Colors.textMuted },
  addSlotBtnText: { fontSize: FontSize.xs, color: '#fff', fontWeight: '700' },
  addForm: {
    backgroundColor: Colors.surfaceBlue, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  timeRow: { flexDirection: 'row', gap: Spacing.md },
  timeField: { flex: 1 },
  timeLabel: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  timeBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  timeBtnText: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500' },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    padding: Spacing.sm, marginTop: Spacing.md,
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  slotRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: Radius.md,
    padding: Spacing.sm, marginTop: Spacing.xs, marginBottom: Spacing.xs,
    gap: Spacing.xs, borderWidth: 1, borderColor: Colors.border,
  },
  slotTime: { flex: 1, fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  slotStatus: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  slotStatusText: { fontSize: FontSize.xs, fontWeight: '700' },
  deleteBtn: { padding: Spacing.xs },
  emptyDay: { alignItems: 'center', paddingVertical: Spacing.lg, gap: 4 },
  emptyDayText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  emptyDayHint: { color: Colors.textMuted, fontSize: FontSize.xs },

  // Lessons view
  lessonsHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.md,
  },
  lessonsTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  lessonForm: {
    backgroundColor: Colors.surfaceBlue, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  ltLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.xs },
  ltInput: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    fontSize: FontSize.sm, color: Colors.text,
  },
  ltChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  ltChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  ltChipSm: {
    width: 36, alignItems: 'center', paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  ltChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  ltChipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary },
  ltChipTextActive: { color: Colors.primary },
  ltRow: { flexDirection: 'row', gap: Spacing.md },
  ltHalf: { flex: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 40,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '10',
  },
  stepperValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  ltCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  ltCardBody: { flex: 1, gap: 3 },
  ltCardName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  ltCardMeta: { flexDirection: 'row', gap: 5 },
  ltCardMetaText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  ltCardBottom: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
  ltCardPrice: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primary },
  ltCardPaxBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.primary + '15', borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  ltCardPaxText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.primary },
});
