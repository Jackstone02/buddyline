import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// react-native-maps has no web implementation, so load it only on native.
// This keeps the web bundle working (it was the reason the map was disabled).
let MapView: any = null;
let MapMarker: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  MapMarker = Maps.Marker;
}
const MAPS_AVAILABLE = MapView != null;
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  RootStackParamList,
  Discipline,
  FindMode,
  BeginnerTabParamList,
  CertifiedTabParamList,
  InstructorTabParamList,
} from '../../types';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import CertBadge from '../../components/CertBadge';
import UserAvatar from '../../components/UserAvatar';
import { haversineKm, getCurrentCoords, DISTANCE_OPTIONS, DistanceFilter } from '../../lib/location';
type Nav = NativeStackNavigationProp<RootStackParamList>;

const CERT_FILTERS = ['All', 'AIDA 2', 'AIDA 3', 'AIDA 4', 'SSI Level 2', 'SSI Level 3'];
const DISCIPLINE_FILTERS: Discipline[] = ['pool', 'depth', 'spearfishing', 'dynamic', 'static'];

export default function FindScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<BeginnerTabParamList & CertifiedTabParamList & InstructorTabParamList, 'Find'>>();
  const { defaultMode = 'instructor', showToggle = false } = route.params ?? {};

  const { profile } = useAuthStore();

  const [mode, setMode] = useState<FindMode>(defaultMode);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Map is disabled on this build; ref kept for when MapView is re-enabled (see commented import).
  const mapRef = useRef<any>(null);

  // Buddy filters
  const [availableOnly, setAvailableOnly] = useState(false);
  const [disciplineFilter, setDisciplineFilter] = useState<Discipline | ''>('');

  // Shared
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('any');
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchResults();
    }, [mode, search, availableOnly, disciplineFilter, distanceFilter, userCoords])
  );

  // ─── Fetch ─────────────────────────────────────────────────────
  const fetchResults = async () => {
    if (!profile) return;
    setLoading(true);

    if (mode === 'buddy') {
      await fetchBuddies();
    } else {
      await fetchInstructors();
    }
    setLoading(false);
  };

  const fetchBuddies = async () => {
    let query = supabase
      .from('profiles')
      .select('*, certified:certified_profiles!id(*)')
      .eq('role', 'certified')
      .eq('verification_status', 'verified')
      .neq('id', profile!.id);

    if (availableOnly) query = query.eq('available_to_dive', true);
    if (search.trim()) query = query.ilike('city_region', `%${search.trim()}%`);

    const { data } = await query.order('display_name');
    let filtered = data || [];

    if (disciplineFilter) {
      filtered = filtered.filter((b: any) => (b.certified?.disciplines || []).includes(disciplineFilter));
    }
    if (distanceFilter !== 'any' && userCoords) {
      filtered = filtered.filter((b: any) =>
        b.latitude != null && b.longitude != null &&
        haversineKm(userCoords.latitude, userCoords.longitude, b.latitude, b.longitude) <= distanceFilter
      );
    }

    // Filter blocked users
    const { data: blocks } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', profile!.id);
    const blockedIds = new Set((blocks || []).map((b: any) => b.blocked_id));
    setResults(filtered.filter((b: any) => !blockedIds.has(b.id)));
  };

  const fetchInstructors = async () => {
    let query = supabase
      .from('instructor_profiles')
      .select('*, profile:profiles!id(*)')
      .filter('profile.verification_status', 'eq', 'verified')
      .neq('id', profile!.id);

    if (search.trim()) query = query.ilike('teaching_location', `%${search.trim()}%`);

    const { data } = await query.order('years_teaching', { ascending: false });
    let filtered = (data || []).filter((r: any) => r.profile?.verification_status === 'verified' && r.id !== profile?.id);

    if (distanceFilter !== 'any' && userCoords) {
      filtered = filtered.filter((r: any) =>
        r.profile?.latitude != null && r.profile?.longitude != null &&
        haversineKm(userCoords.latitude, userCoords.longitude, r.profile.latitude, r.profile.longitude) <= distanceFilter
      );
    }
    setResults(filtered);
  };

  const handleNearMe = async () => {
    const coords = await getCurrentCoords();
    if (coords) {
      setUserCoords(coords);
      if (distanceFilter === 'any') setDistanceFilter(10);
    }
  };

  // Coordinates differ by mode: buddies store lat/long on the row, instructors on the joined profile.
  const getCoords = (item: any): { latitude: number | null; longitude: number | null } =>
    mode === 'buddy'
      ? { latitude: item.latitude, longitude: item.longitude }
      : { latitude: item.profile?.latitude ?? null, longitude: item.profile?.longitude ?? null };

  const goToProfile = (item: any) => {
    if (mode === 'buddy') navigation.navigate('BuddyProfile', { buddyId: item.id });
    else navigation.navigate('InstructorProfile', { instructorId: item.id });
  };

  const handleMapLocateMe = async () => {
    const coords = await getCurrentCoords();
    if (coords) {
      setUserCoords(coords);
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.4, longitudeDelta: 0.4 });
    }
  };

  // Center the map on the user, the first result with coords, or a sensible default (Cebu).
  const mapRegion = userCoords
    ? { ...userCoords, latitudeDelta: 0.5, longitudeDelta: 0.5 }
    : (() => {
        const first = results.map(getCoords).find((c) => c.latitude != null && c.longitude != null);
        return first
          ? { latitude: first.latitude as number, longitude: first.longitude as number, latitudeDelta: 1, longitudeDelta: 1 }
          : { latitude: 10.3157, longitude: 123.8854, latitudeDelta: 3, longitudeDelta: 3 };
      })();

  // ─── Hero title based on mode ──────────────────────────────────
  const heroTitle = mode === 'buddy' ? 'Find a Buddy' : 'Find an Instructor';
  const heroSub = mode === 'buddy' ? 'Verified certified freedivers' : 'Verified freediving instructors';
  const heroIcon = mode === 'buddy' ? 'people' : 'school';
  const searchPlaceholder = mode === 'buddy' ? 'Search by city / region...' : 'Search by location...';

  return (
    <View style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroContent}>
            <View>
              <Text style={styles.heroTitle}>{heroTitle}</Text>
              <Text style={styles.heroSub}>{heroSub}</Text>
            </View>
            <View style={styles.heroRight}>
              {MAPS_AVAILABLE && (
                <TouchableOpacity
                  style={styles.viewToggleBtn}
                  onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                  activeOpacity={0.8}
                >
                  <Ionicons name={viewMode === 'list' ? 'map-outline' : 'list-outline'} size={20} color={Colors.accent} />
                </TouchableOpacity>
              )}
              <View style={styles.heroIconWrap}>
                <Ionicons name={heroIcon as any} size={26} color={Colors.accent} />
              </View>
            </View>
          </View>

          {/* Mode toggle (only for certified users) */}
          {showToggle && (
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'instructor' && styles.modeBtnActive]}
                onPress={() => { setMode('instructor'); setResults([]); }}
              >
                <Ionicons name="school-outline" size={14} color={mode === 'instructor' ? '#fff' : Colors.accentLight} />
                <Text style={[styles.modeBtnText, mode === 'instructor' && styles.modeBtnTextActive]}>Instructors</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'buddy' && styles.modeBtnActive]}
                onPress={() => { setMode('buddy'); setResults([]); }}
              >
                <Ionicons name="people-outline" size={14} color={mode === 'buddy' ? '#fff' : Colors.accentLight} />
                <Text style={[styles.modeBtnText, mode === 'buddy' && styles.modeBtnTextActive]}>Dive Buddies</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={{ marginRight: Spacing.sm }} />
            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor={'#FFFFFF80'}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={'#FFFFFF80'} />
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </View>

      {/* Buddy-only filters */}
      {mode === 'buddy' && (
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterChip, availableOnly && styles.filterChipActive]}
            onPress={() => setAvailableOnly(!availableOnly)}
          >
            <View style={[styles.filterDot, availableOnly && styles.filterDotActive]} />
            <Text style={[styles.filterText, availableOnly && styles.filterTextActive]}>Available Now</Text>
          </TouchableOpacity>
          {DISCIPLINE_FILTERS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.filterChip, disciplineFilter === d && styles.filterChipActive]}
              onPress={() => setDisciplineFilter(disciplineFilter === d ? '' : d)}
            >
              <Text style={[styles.filterText, disciplineFilter === d && styles.filterTextActive]}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Distance filter */}
      <View style={styles.distanceBar}>
        <TouchableOpacity
          style={[styles.filterChip, styles.nearMeChip, userCoords != null && styles.filterChipActive]}
          onPress={handleNearMe}
        >
          <Ionicons name="navigate-outline" size={12} color={userCoords ? '#fff' : Colors.primary} />
          <Text style={[styles.filterText, { color: userCoords ? '#fff' : Colors.primary }]}>Near Me</Text>
        </TouchableOpacity>
        {DISTANCE_OPTIONS.filter((o) => o.value !== 'any').map((opt) => (
          <TouchableOpacity
            key={String(opt.value)}
            style={[styles.filterChip, distanceFilter === opt.value && styles.filterChipActive]}
            onPress={() => setDistanceFilter(distanceFilter === opt.value ? 'any' : opt.value)}
          >
            <Text style={[styles.filterText, distanceFilter === opt.value && styles.filterTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
        {distanceFilter !== 'any' && (
          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => { setDistanceFilter('any'); setUserCoords(null); }}
          >
            <Ionicons name="close-circle-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.filterText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          This app connects people only — it does not supervise dives.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : viewMode === 'map' && MAPS_AVAILABLE ? (
        // ── Map view (native only) ────────────────────────────────
        <View style={styles.mapContainer}>
          <MapView ref={mapRef} style={styles.map} initialRegion={mapRegion}>
            {results.map((item) => {
              const c = getCoords(item);
              if (c.latitude == null || c.longitude == null) return null;
              const name = mode === 'buddy' ? item.display_name : item.profile?.display_name;
              return (
                <MapMarker
                  key={item.id}
                  coordinate={{ latitude: c.latitude, longitude: c.longitude }}
                  title={name}
                  description={mode === 'buddy' ? 'Tap for buddy profile' : 'Tap for instructor profile'}
                  onPress={() => setSelectedId(item.id)}
                  onCalloutPress={() => goToProfile(item)}
                />
              );
            })}
          </MapView>
          <TouchableOpacity style={styles.locateMeBtn} onPress={handleMapLocateMe} activeOpacity={0.85}>
            <Ionicons name="navigate" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        // ── List view ─────────────────────────────────────────────
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name={mode === 'buddy' ? 'people-outline' : 'school-outline'} size={40} color={Colors.primary} />
              </View>
              <Text style={styles.emptyText}>No {mode === 'buddy' ? 'buddies' : 'instructors'} found</Text>
              <Text style={styles.emptySub}>Try adjusting your filters or search location.</Text>
            </View>
          }
          renderItem={({ item }) =>
            mode === 'buddy' ? (
              <BuddyCard item={item} navigation={navigation} />
            ) : (
              <InstructorCard item={item} navigation={navigation} />
            )
          }
        />
      )}
    </View>
  );
}

// ─── Buddy card ──────────────────────────────────────────────────
function BuddyCard({ item, navigation }: any) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('BuddyProfile', { buddyId: item.id })}
      activeOpacity={0.85}
    >
      <UserAvatar avatarUrl={item.avatar_url} name={item.display_name} size={50} />
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardName}>{item.display_name}</Text>
          {item.available_to_dive && (
            <View style={styles.availableBadge}>
              <View style={styles.availableDot} />
              <Text style={styles.availableText}>Available</Text>
            </View>
          )}
        </View>
        <View style={styles.rolePill}>
          <Ionicons name="people-outline" size={10} color={Colors.primary} />
          <Text style={styles.rolePillText}>Certified Buddy</Text>
        </View>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.locationText}>{item.city_region}</Text>
        </View>
        <View style={styles.metaRow}>
          {item.certified?.cert_level && <Text style={styles.meta}>{item.certified.cert_level}</Text>}
          {item.certified?.years_experience > 0 && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.meta}>{item.certified.years_experience}y exp</Text>
            </>
          )}
        </View>
        {item.certified?.disciplines?.length > 0 && (
          <Text style={styles.disciplines} numberOfLines={1}>
            {item.certified.disciplines.join(', ')}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.msgBtn}
        onPress={() => navigation.navigate('Messaging', { otherUserId: item.id, otherUserName: item.display_name })}
      >
        <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Instructor card ─────────────────────────────────────────────
function InstructorCard({ item, navigation }: any) {
  const name = item.profile?.display_name ?? 'Instructor';
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('InstructorProfile', { instructorId: item.id })}
      activeOpacity={0.85}
    >
      <UserAvatar avatarUrl={item.profile?.avatar_url} name={name} size={50} color={Colors.primaryMid} />
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardName}>{name}</Text>
          {item.profile?.available_to_dive && (
            <View style={styles.availableBadge}>
              <View style={styles.availableDot} />
              <Text style={styles.availableText}>Available</Text>
            </View>
          )}
        </View>
        <View style={styles.instructorPill}>
          <Ionicons name="school-outline" size={10} color={Colors.purple} />
          <Text style={styles.instructorPillText}>Instructor</Text>
        </View>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.locationText}>{item.teaching_location}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{item.years_teaching}y teaching</Text>
          {(item.agencies || []).length > 0 && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.meta}>{item.agencies.slice(0, 2).join(', ')}</Text>
            </>
          )}
        </View>
        <View style={styles.certRow}>
          {(item.certs_offered || []).slice(0, 2).map((c: string) => (
            <CertBadge key={c} certType={c} isVerified={true} />
          ))}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Hero
  hero: { backgroundColor: Colors.primaryDeep, paddingBottom: Spacing.md },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  heroTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { fontSize: FontSize.xs, color: Colors.accentLight, marginTop: 3 },
  heroRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  viewToggleBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF18', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FFFFFF30',
  },
  heroIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#FFFFFF18', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FFFFFF30',
  },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: '#FFFFFF18',
    borderRadius: Radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: '#FFFFFF20',
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: Radius.full,
    paddingVertical: 7,
  },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.accentLight },
  modeBtnTextActive: { color: '#fff' },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF18',
    borderRadius: Radius.full,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: '#FFFFFF30',
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: FontSize.md, color: '#FFFFFF' },

  // Buddy filters
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    flexWrap: 'wrap',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  // Distance filter
  distanceBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
    flexWrap: 'wrap',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    gap: 4,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textMuted },
  filterDotActive: { backgroundColor: Colors.success },
  filterText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  nearMeChip: { borderColor: Colors.primary },

  disclaimer: {
    backgroundColor: Colors.border,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  disclaimerText: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center', fontStyle: 'italic' },

  // Cards
  list: { padding: Spacing.md, gap: Spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
  cardBody: { flex: 1, gap: 2 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 4 },

  // Buddy badge
  availableBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.success + '15', borderRadius: Radius.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  availableDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.success },
  availableText: { fontSize: 10, color: Colors.success, fontWeight: '700' },

  // Instructor badge
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.purple + '18', borderRadius: Radius.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  verifiedText: { fontSize: FontSize.xs, color: Colors.purple, fontWeight: '700' },

  // Instructor role pill (list view)
  instructorPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.purple + '12', borderRadius: Radius.full,
    paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start',
  },
  instructorPillText: { fontSize: 10, color: Colors.purple, fontWeight: '700' },

  // Buddy role pill
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.primary + '12', borderRadius: Radius.full,
    paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start',
  },
  rolePillText: { fontSize: 10, color: Colors.primary, fontWeight: '700' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { fontSize: FontSize.xs, color: Colors.textMuted },
  metaDot: { fontSize: FontSize.xs, color: Colors.textMuted },
  disciplines: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  certRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },

  msgBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },

  // Map view
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  markerBubble: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerSelected: { backgroundColor: Colors.primaryDeep, transform: [{ scale: 1.15 }] },
  markerText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  locateMeBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapBottomSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  mapBottomTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  mapCardList: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  mapCard: {
    width: 140,
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 3,
  },
  mapCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  mapCardAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  mapCardAvatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.sm },
  mapCardName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  mapCardSub: { fontSize: FontSize.xs, color: Colors.textMuted },
  mapCardRolePill: {
    backgroundColor: Colors.primary + '18',
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  mapCardRolePillInstructor: { backgroundColor: Colors.purple + '18' },
  mapCardRoleText: { fontSize: 9, color: Colors.primary, fontWeight: '700' },
  mapCardRoleTextInstructor: { color: Colors.purple },
  mapCardAvailBadge: {
    backgroundColor: Colors.success + '20',
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  mapCardAvailText: { fontSize: 10, color: Colors.success, fontWeight: '700' },
  mapCardMeta: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600', marginTop: 2 },

  // Empty
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.sm },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
