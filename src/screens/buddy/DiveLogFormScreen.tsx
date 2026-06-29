import React, { useState, useEffect } from 'react';
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
import { RootStackParamList, DiveLogDiscipline } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import AppModal from '../../components/AppModal';
import { useAppModal } from '../../hooks/useAppModal';

type Props = NativeStackScreenProps<RootStackParamList, 'DiveLogForm'>;

const DISCIPLINES: { key: DiveLogDiscipline; label: string }[] = [
  { key: 'depth', label: 'Depth' },
  { key: 'pool', label: 'Pool' },
  { key: 'dynamic', label: 'Dynamic' },
  { key: 'static', label: 'Static' },
  { key: 'spearfishing', label: 'Spearfishing' },
  { key: 'other', label: 'Other' },
];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDisplayDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

export default function DiveLogFormScreen({ navigation, route }: Props) {
  const { profile } = useAuthStore();
  const logId = route.params?.logId;
  const isEdit = !!logId;

  const [logDate, setLogDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [maxDepth, setMaxDepth] = useState('');
  const [duration, setDuration] = useState('');
  const [discipline, setDiscipline] = useState<DiveLogDiscipline | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  const { visible, isLoading, config, showModal, handleConfirm, handleCancel } = useAppModal();

  useEffect(() => {
    if (!logId) return;
    supabase.from('dive_logs').select('*').eq('id', logId).single().then(({ data }) => {
      if (data) {
        setLogDate(new Date(data.log_date + 'T00:00:00'));
        setLocation(data.location_name ?? '');
        setMaxDepth(data.max_depth_m != null ? String(data.max_depth_m) : '');
        setDuration(data.duration_min != null ? String(data.duration_min) : '');
        setDiscipline(data.discipline ?? null);
        setNotes(data.notes ?? '');
      }
      setFetching(false);
    });
  }, [logId]);

  const onDateChange = (_: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setLogDate(date);
  };

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    const payload = {
      diver_id: profile.id,
      log_date: toDateStr(logDate),
      location_name: location.trim() || null,
      max_depth_m: maxDepth ? parseFloat(maxDepth) : null,
      duration_min: duration ? parseInt(duration) : null,
      discipline,
      notes: notes.trim() || null,
    };

    const { error } = isEdit
      ? await supabase.from('dive_logs').update(payload).eq('id', logId!)
      : await supabase.from('dive_logs').insert(payload);

    setLoading(false);
    if (error) {
      showModal({ type: 'error', title: 'Error', message: 'Could not save your dive log. Please try again.' });
      return;
    }
    navigation.goBack();
  };

  const handleDelete = () => {
    showModal({
      type: 'confirm',
      title: 'Delete Dive Log',
      message: 'Remove this dive from your logbook? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Keep',
      showCancel: true,
      onConfirm: async () => {
        await supabase.from('dive_logs').delete().eq('id', logId!);
        navigation.goBack();
      },
    });
  };

  if (fetching) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Dive' : 'Log a Dive'}</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

          {/* Date */}
          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity style={styles.inputWrap} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
            <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <Text style={[styles.input, { color: Colors.text, paddingVertical: 14 }]}>{formatDisplayDate(logDate)}</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={logDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={onDateChange}
            />
          )}
          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.pickerDone}>
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}

          {/* Location */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Location</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="location-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Pescador Island, Moalboal"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Depth + Duration row */}
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Max Depth (m)</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="arrow-down-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={maxDepth}
                  onChangeText={setMaxDepth}
                  placeholder="e.g. 25"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Duration (min)</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="time-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="e.g. 90"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          {/* Discipline */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Discipline</Text>
          <View style={styles.chipRow}>
            {DISCIPLINES.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, discipline === key && styles.chipActive]}
                onPress={() => setDiscipline(discipline === key ? null : key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, discipline === key && styles.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Notes (optional)</Text>
          <TextInput
            style={styles.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Conditions, equipment, how it felt, PB attempts..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.buttonText}>{isEdit ? 'Save Changes' : 'Save Dive'}</Text>
              </>
            )}
          </TouchableOpacity>

          {isEdit && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
              <Text style={styles.deleteBtnText}>Delete Dive</Text>
            </TouchableOpacity>
          )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
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
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF18', alignItems: 'center', justifyContent: 'center',
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
  row2: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
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
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  deleteBtnText: { color: Colors.error, fontWeight: '700', fontSize: FontSize.sm },
});
