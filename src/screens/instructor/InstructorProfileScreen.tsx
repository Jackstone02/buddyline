import React, { useEffect, useState } from 'react';
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
import { RootStackParamList } from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import CertBadge from '../../components/CertBadge';
import UserAvatar from '../../components/UserAvatar';
type Props = NativeStackScreenProps<RootStackParamList, 'InstructorProfile'>;

export default function InstructorProfileScreen({ navigation, route }: Props) {
  const { instructorId } = route.params;
  const { profile: myProfile } = useAuthStore();
  const [instructor, setInstructor] = useState<any>(null);
  const [lessonTypes, setLessonTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstructor();
  }, [instructorId]);

  const fetchInstructor = async () => {
    const [{ data: instrData }, { data: ltData }] = await Promise.all([
      supabase
        .from('instructor_profiles')
        .select('*, profile:profiles!id(*)')
        .eq('id', instructorId)
        .single(),
      supabase
        .from('lesson_types')
        .select('*')
        .eq('instructor_id', instructorId),
    ]);
    setInstructor(instrData);
    setLessonTypes(ltData || []);
    setLoading(false);
  };

  const handleMessage = async () => {
    if (!instructor?.profile) return;
    navigation.navigate('Messaging', {
      otherUserId: instructorId,
      otherUserName: instructor.profile.display_name,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!instructor) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Instructor not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Instructor Profile</Text>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile hero */}
        <View style={styles.profileHero}>
          <View style={styles.avatarRing}>
            <UserAvatar avatarUrl={instructor.profile?.avatar_url} name={instructor.profile?.display_name ?? ''} size={84} color={Colors.primaryMid} />
          </View>
          <Text style={styles.profileName}>{instructor.profile?.display_name}</Text>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.verifiedText}>Verified Instructor</Text>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.locationText}>{instructor.teaching_location}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{instructor.years_teaching}</Text>
            <Text style={styles.statLabel}>Years Teaching</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{(instructor.certs_offered || []).length}</Text>
            <Text style={styles.statLabel}>Certs Offered</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{(instructor.agencies || []).length}</Text>
            <Text style={styles.statLabel}>Agencies</Text>
          </View>
        </View>

        {/* Bio */}
        {instructor.profile?.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{instructor.profile.bio}</Text>
          </View>
        ) : null}

        {/* Certs offered */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certifications Offered</Text>
          <View style={styles.certRow}>
            {(instructor.certs_offered || []).map((c: string) => (
              <CertBadge key={c} certType={c} isVerified={true} />
            ))}
          </View>
        </View>

        {/* Agencies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agencies</Text>
          <View style={styles.certRow}>
            {(instructor.agencies || []).map((a: string) => (
              <CertBadge key={a} certType={a} isVerified={false} />
            ))}
          </View>
        </View>

        {/* Lesson types */}
        {lessonTypes.length > 0 && myProfile?.id !== instructorId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Book a Session</Text>
            {lessonTypes.map((lt) => (
              <View key={lt.id} style={styles.lessonCard}>
                <View style={styles.lessonCardBody}>
                  <Text style={styles.lessonName}>{lt.name}</Text>
                  <View style={styles.lessonMeta}>
                    <Text style={styles.lessonMetaText}>{lt.duration_minutes} min</Text>
                    <Text style={styles.lessonMetaDot}>·</Text>
                    <Text style={styles.lessonMetaText}>{lt.skill_level}</Text>
                    <Text style={styles.lessonMetaDot}>·</Text>
                    <Text style={styles.lessonMetaText}>{lt.session_format}</Text>
                  </View>
                </View>
                <View style={styles.lessonCardRight}>
                  <Text style={styles.lessonPrice}>₱{lt.price}</Text>
                  <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() => navigation.navigate('BookingForm', { instructorId, lessonTypeId: lt.id })}
                  >
                    <Text style={styles.bookBtnText}>Book</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This app connects people only. Buddyline does not supervise dives or guarantee instructor availability.
          </Text>
        </View>
      </ScrollView>

      {/* CTA */}
      {myProfile?.id !== instructorId && (
        <SafeAreaView edges={['bottom']} style={styles.cta}>
          <TouchableOpacity style={styles.ctaBtn} onPress={handleMessage} activeOpacity={0.85}>
            <Ionicons name="chatbubble-outline" size={20} color="#fff" style={{ marginRight: Spacing.sm }} />
            <Text style={styles.ctaBtnText}>Send Inquiry</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  errorText: { fontSize: FontSize.md, color: Colors.textSecondary },
  header: { backgroundColor: Colors.primaryDeep },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSize.md, fontWeight: '700', color: '#FFFFFF' },
  content: { paddingBottom: Spacing.xxl },
  profileHero: {
    backgroundColor: Colors.primaryDeep,
    alignItems: 'center',
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    gap: 6,
  },
  avatarRing: {
    borderRadius: 46,
    borderWidth: 3,
    borderColor: '#FFFFFF40',
    overflow: 'hidden',
  },
  profileName: { fontSize: FontSize.xl, fontWeight: '800', color: '#FFFFFF', marginTop: Spacing.sm },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success + '25',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  verifiedText: { fontSize: FontSize.sm, color: Colors.success, fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: FontSize.sm, color: Colors.accentLight },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primaryDeep },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  bioText: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22 },
  certRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  lessonCardBody: { flex: 1 },
  lessonName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  lessonMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  lessonMetaText: { fontSize: FontSize.xs, color: Colors.textMuted },
  lessonMetaDot: { fontSize: FontSize.xs, color: Colors.textMuted, marginHorizontal: 3 },
  lessonCardRight: { alignItems: 'flex-end', gap: Spacing.xs },
  lessonPrice: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primary },
  bookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  bookBtnText: { fontSize: FontSize.xs, fontWeight: '700', color: '#fff' },
  disclaimer: {
    margin: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.border,
    borderRadius: Radius.md,
  },
  disclaimerText: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center', fontStyle: 'italic' },
  cta: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
