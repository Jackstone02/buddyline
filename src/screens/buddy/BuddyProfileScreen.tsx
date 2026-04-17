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
import { formatScheduledAt } from '../../utils/format';

const DIVE_TYPE_LABELS: Record<string, string> = {
  fun_dive: 'Fun Dive',
  line_training: 'Line Training',
  pool: 'Pool',
  dynamic: 'Dynamic',
  static: 'Static',
  spearfishing: 'Spearfishing',
  other: 'Other',
};
type Props = NativeStackScreenProps<RootStackParamList, 'BuddyProfile'>;

export default function BuddyProfileScreen({ navigation, route }: Props) {
  const { buddyId } = route.params;
  const { profile: myProfile } = useAuthStore();
  const [buddy, setBuddy] = useState<any>(null);
  const [certProfile, setCertProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuddy();
  }, [buddyId]);

  const fetchBuddy = async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', buddyId).single(),
      supabase.from('certified_profiles').select('*').eq('id', buddyId).single(),
    ]);
    setBuddy(p);
    setCertProfile(c);

    // Fetch this buddy's upcoming open sessions
    const { data: sessData } = await supabase
      .from('dive_sessions')
      .select('*')
      .eq('creator_id', buddyId)
      .eq('status', 'open')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(5);

    if (sessData && sessData.length > 0) {
      const sessionIds = sessData.map((s: any) => s.id);
      const { data: memberData } = await supabase
        .from('dive_session_members')
        .select('session_id')
        .in('session_id', sessionIds);

      const countBySession: Record<string, number> = {};
      (memberData || []).forEach((m: any) => {
        countBySession[m.session_id] = (countBySession[m.session_id] || 0) + 1;
      });

      setSessions(
        sessData.map((s: any) => ({
          ...s,
          member_count: countBySession[s.id] || 0,
          spots_left: s.spots_needed - (countBySession[s.id] || 0),
        }))
      );
    }

    setLoading(false);
  };

  const handleMessage = () => {
    if (!buddy) return;
    navigation.navigate('Messaging', {
      otherUserId: buddyId,
      otherUserName: buddy.display_name,
    });
  };

  const handleReport = () => {
    navigation.navigate('Report', { reportedId: buddyId, reportedName: buddy?.display_name ?? 'User' });
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Diver Profile</Text>
            <TouchableOpacity style={styles.reportBtn} onPress={handleReport}>
              <Ionicons name="flag-outline" size={18} color={Colors.accentLight} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile hero */}
        <View style={styles.profileHero}>
          <View style={styles.avatarRing}>
            <UserAvatar avatarUrl={buddy?.avatar_url} name={buddy?.display_name ?? ''} size={84} />
          </View>
          <Text style={styles.profileName}>{buddy?.display_name}</Text>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.verifiedText}>Verified Freediver</Text>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.locationText}>{buddy?.city_region}</Text>
          </View>
          {buddy?.available_to_dive && (
            <View style={styles.availableBadge}>
              <View style={styles.availableDot} />
              <Text style={styles.availableText}>Available to dive</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        {certProfile && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{certProfile.cert_level}</Text>
              <Text style={styles.statLabel}>Cert Level</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{certProfile.years_experience}</Text>
              <Text style={styles.statLabel}>Years Exp</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{certProfile.agency}</Text>
              <Text style={styles.statLabel}>Agency</Text>
            </View>
          </View>
        )}

        {/* Disciplines */}
        {certProfile?.disciplines?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Disciplines</Text>
            <View style={styles.certRow}>
              {certProfile.disciplines.map((d: string) => (
                <CertBadge key={d} certType={d} isVerified={false} />
              ))}
            </View>
          </View>
        )}

        {/* Bio */}
        {buddy?.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{buddy.bio}</Text>
          </View>
        ) : null}

        {/* Open Sessions */}
        {sessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Open Sessions</Text>
            {sessions.map((s) => {
              const isFull = s.spots_left <= 0;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={styles.sessionCard}
                  onPress={() => navigation.navigate('SessionDetail', { sessionId: s.id })}
                  activeOpacity={0.82}
                >
                  <View style={styles.sessionLeft}>
                    <Text style={styles.sessionType}>
                      {DIVE_TYPE_LABELS[s.dive_type] ?? 'Dive Session'}
                    </Text>
                    <Text style={styles.sessionDate}>{formatScheduledAt(s.scheduled_at)}</Text>
                    <Text style={styles.sessionLoc} numberOfLines={1}>
                      <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                      {' '}{s.location_name}
                    </Text>
                  </View>
                  <View style={styles.sessionRight}>
                    {isFull ? (
                      <View style={[styles.spotsBadge, styles.spotsBadgeFull]}>
                        <Text style={styles.spotsBadgeTextFull}>Full</Text>
                      </View>
                    ) : (
                      <View style={styles.spotsBadge}>
                        <Text style={styles.spotsBadgeText}>
                          {s.spots_left} spot{s.spots_left !== 1 ? 's' : ''} left
                        </Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginTop: 4 }} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This app connects people only — it does not supervise dives. Always meet at a supervised dive site.
          </Text>
        </View>
      </ScrollView>

      {myProfile?.id !== buddyId && (
        <SafeAreaView edges={['bottom']} style={styles.cta}>
          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.ctaBtnSecondary} onPress={handleMessage} activeOpacity={0.85}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
              <Text style={styles.ctaBtnSecondaryText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => navigation.navigate('DiveRequestForm', { buddyId, buddyName: buddy?.display_name ?? 'Buddy' })}
              activeOpacity={0.85}
            >
              <Ionicons name="water-outline" size={18} color="#fff" />
              <Text style={styles.ctaBtnText}>Request Dive</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
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
  reportBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF18',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success + '30',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  availableDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  availableText: { fontSize: FontSize.sm, color: Colors.success, fontWeight: '700' },
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
  statValue: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primaryDeep },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  certRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  bioText: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22 },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  sessionLeft: { flex: 1, gap: 3 },
  sessionType: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  sessionDate: { fontSize: FontSize.xs, color: Colors.textSecondary },
  sessionLoc: { fontSize: FontSize.xs, color: Colors.textMuted },
  sessionRight: { alignItems: 'flex-end', gap: 4 },
  spotsBadge: {
    backgroundColor: Colors.primary + '18',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  spotsBadgeFull: { backgroundColor: Colors.border },
  spotsBadgeText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  spotsBadgeTextFull: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted },
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
  ctaRow: { flexDirection: 'row', gap: Spacing.sm },
  ctaBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
  },
  ctaBtnSecondaryText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '700' },
  ctaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
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
