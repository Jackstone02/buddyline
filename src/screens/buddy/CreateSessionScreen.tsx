import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, DiveType } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { getCurrentCoords } from '../../lib/location';
import { useAuthStore } from '../../store/authStore';
import AppModal from '../../components/AppModal';
import { useAppModal } from '../../hooks/useAppModal';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateSession'>;

const DIVE_TYPES: { key: DiveType; label: string }[] = [
  { key: 'fun_dive', label: 'Fun Dive' },
  { key: 'line_training', label: 'Line Training' },
  { key: 'pool', label: 'Pool' },
  { key: 'dynamic', label: 'Dynamic' },
  { key: 'static', label: 'Static' },
  { key: 'spearfishing', label: 'Spearfishing' },
  { key: 'other', label: 'Other' },
];

function formatDisplayDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDisplayTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function CreateSessionScreen({ navigation }: Props) {
  const { profile } = useAuthStore();

  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  defaultDate.setHours(7, 0, 0, 0);

  const [locationName, setLocationName] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);
  const [selectedTime, setSelectedTime] = useState<Date>(defaultDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [maxDepth, setMaxDepth] = useState('');
  const [diveType, setDiveType] = useState<DiveType | null>(null);
  const [spotsNeeded, setSpotsNeeded] = useState('1');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const { visible, isLoading, config, showModal, handleConfirm, handleCancel } = useAppModal();

  const onDateChange = (_: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const onTimeChange = (_: any, time?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (time) setSelectedTime(time);
  };

  const handlePost = async () => {
    if (!profile) return;
    if (!locationName.trim()) {
      showModal({ type: 'error', title: 'Location Required', message: 'Please enter a dive location.' });
      return;
    }

    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

    if (scheduledAt <= new Date()) {
      showModal({ type: 'error', title: 'Invalid Time', message: 'Please select a future date and time.' });
      return;
    }

    setLoading(true);
    const coords = await getCurrentCoords();

    const { error } = await supabase.from('dive_sessions').insert({
      creator_id: profile.id,
      location_name: locationName.trim(),
      scheduled_at: scheduledAt.toISOString(),
      max_depth_m: parseInt(maxDepth) || null,
      dive_type: diveType,
      spots_needed: parseInt(spotsNeeded) || 1,
      notes: notes.trim() || null,
      status: 'open',
      ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
    });
    setLoading(false);

    if (error) {
      showModal({ type: 'error', title: 'Error', message: 'Could not post dive. Please try again.' });
      return;
    }

    showModal({
      type: 'success',
      title: 'Dive Posted!',
      message: 'Your dive session is now visible to nearby divers.',
      onConfirm: () => navigation.goBack(),
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post a Dive</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

          {/* Location */}
          <Text style={styles.label}>Location *</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="location-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={locationName}
              onChangeText={setLocationName}
              placeholder="e.g. Moalboal, Cebu"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
          </View>

          {/* Date */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Date *</Text>
          <TouchableOpacity style={styles.inputWrap} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
            <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <Text style={[styles.input, { color: Colors.text, paddingVertical: 14 }]}>
              {formatDisplayDate(selectedDate)}
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={onDateChange}
            />
          )}
          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.pickerDone}>
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}

          {/* Time */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Time *</Text>
          <TouchableOpacity style={styles.inputWrap} onPress={() => setShowTimePicker(true)} activeOpacity={0.8}>
            <Ionicons name="time-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <Text style={[styles.input, { color: Colors.text, paddingVertical: 14 }]}>
              {formatDisplayTime(selectedTime)}
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}
          {Platform.OS === 'ios' && showTimePicker && (
            <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.pickerDone}>
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}

          {/* Dive Type */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Dive Type</Text>
          <View style={styles.chipRow}>
            {DIVE_TYPES.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, diveType === key && styles.chipActive]}
                onPress={() => setDiveType(diveType === key ? null : key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, diveType === key && styles.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Max Depth */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Max Depth (m)</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="arrow-down-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={maxDepth}
              onChangeText={setMaxDepth}
              placeholder="e.g. 20"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />
          </View>

          {/* Spots needed */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Max Participants</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setSpotsNeeded((v) => String(Math.max(1, parseInt(v) - 1)))}
            >
              <Ionicons name="remove" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{spotsNeeded}</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setSpotsNeeded((v) => String(parseInt(v) + 1))}
            >
              <Ionicons name="add" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Notes (optional)</Text>
          <TextInput
            style={styles.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any details about the dive, skill level expected, gear required..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handlePost}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="water-outline" size={18} color="#fff" />
                <Text style={styles.buttonText}>Post Dive</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

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
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    overflow: 'hidden',
  },
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
  form: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.xs },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, paddingVertical: 14, fontSize: FontSize.md, color: Colors.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  chipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  stepperBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '10',
  },
  stepperValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerDone: { alignItems: 'flex-end', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  pickerDoneText: { color: Colors.primary, fontWeight: '700', fontSize: FontSize.md },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 16,
    marginTop: Spacing.xl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6, shadowOpacity: 0 },
  buttonText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
