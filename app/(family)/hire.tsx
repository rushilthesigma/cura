import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Radius, Spacing } from '../../src/design/tokens';
import { MenuButton } from '../../src/components/AppMenu';
import { useCareProfile } from '../../src/context/CareProfileContext';
import { researchNearbyCare, type CareSearchResult } from '../../src/utils/careSearch';
import { useDemoFlow } from '../../src/context/DemoFlowContext';
import { DEMO_CAREGIVER, DEMO_CAREGIVER_RESULT } from '../../src/data/demoData';

const FILTERS = ['All', 'Memory', 'In-home', 'Day care', 'Respite'];

function ResultCard({
  result,
  demoStatus,
  onRequest,
}: {
  result: CareSearchResult;
  demoStatus?: 'available' | 'requested' | 'accepted';
  onRequest?: () => void;
}) {
  const isDemoCaregiver = result.id === DEMO_CAREGIVER.id;
  return (
    <View style={[styles.card, isDemoCaregiver && styles.demoCard]}>
      <View style={styles.cardTop}>
        <View style={styles.placeIcon}><Ionicons name={isDemoCaregiver ? 'person-outline' : 'business-outline'} size={21} color={Colors.accent} /></View>
        <View style={styles.cardHeading}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{result.name}</Text>
            {isDemoCaregiver && <View style={styles.topMatchBadge}><Text style={styles.topMatchText}>TOP MATCH</Text></View>}
          </View>
          <Text style={styles.kind}>{result.kind}</Text>
        </View>
      </View>
      <View style={styles.detailRow}>
        <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.address}>{result.address}</Text>
      </View>
      <Text style={styles.summary}>{result.summary}</Text>
      {isDemoCaregiver && (
        <View style={styles.caregiverFacts}>
          <Text style={styles.caregiverFact}>★ {DEMO_CAREGIVER.rating}</Text>
          <Text style={styles.caregiverFact}>{DEMO_CAREGIVER.totalVisits} visits</Text>
          <Text style={styles.caregiverFact}>{DEMO_CAREGIVER.language}</Text>
        </View>
      )}
      <View style={styles.cardFooter}>
        {isDemoCaregiver ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={demoStatus === 'available' ? `Request ${result.name}` : demoStatus === 'accepted' ? `${result.name} connected` : `Request sent to ${result.name}`}
            disabled={demoStatus !== 'available'}
            onPress={onRequest}
            style={[styles.requestButton, demoStatus !== 'available' && styles.requestButtonDone]}
          >
            <Ionicons name={demoStatus === 'accepted' ? 'checkmark-circle' : demoStatus === 'requested' ? 'time-outline' : 'paper-plane-outline'} size={16} color={demoStatus === 'available' ? Colors.surface : Colors.accent} />
            <Text style={[styles.requestButtonText, demoStatus !== 'available' && styles.requestButtonTextDone]}>
              {demoStatus === 'accepted' ? 'Connected' : demoStatus === 'requested' ? 'Request sent' : 'Request Meera'}
            </Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(result.sourceUrl)} style={({ pressed }) => [styles.sourceButton, pressed && styles.pressed]}>
            <Text style={styles.sourceButtonText}>View source</Text>
            <Ionicons name="open-outline" size={15} color={Colors.accent} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function HireScreen() {
  const { profile, isDemoMode } = useCareProfile();
  const { matchStatus, requestDemoCaregiver, acceptDemoCareRequest, switchDemoRole } = useDemoFlow();
  const [filter, setFilter] = useState('All');
  const [results, setResults] = useState<CareSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const search = useCallback(async () => {
    setLoading(true);
    setError('');
    if (isDemoMode) {
      setResults([DEMO_CAREGIVER_RESULT]);
      setLoading(false);
      return;
    }
    try {
      setResults(await researchNearbyCare(profile));
    } catch (reason) {
      setResults([]);
      setError(reason instanceof Error ? reason.message : 'Could not search for care options right now.');
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, profile]);

  useEffect(() => { void search(); }, [search]);

  useEffect(() => {
    if (isDemoMode && matchStatus === 'accepted') {
      router.replace('/(family)');
    }
  }, [isDemoMode, matchStatus]);

  const filtered = useMemo(() => {
    if (filter === 'All') return results;
    const term = filter.toLowerCase();
    return results.filter(result => `${result.kind} ${result.summary}`.toLowerCase().includes(term));
  }, [filter, results]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <MenuButton role="family" />
        <Text style={styles.navTitle}>Find care</Text>
        {isDemoMode && <View style={styles.demoNavBadge}><Text style={styles.demoNavText}>PATIENT DEMO</Text></View>}
        <Pressable accessibilityRole="button" accessibilityLabel="Search again" onPress={() => void search()} disabled={loading} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color={loading ? Colors.textTertiary : Colors.accent} />
        </Pressable>
      </View>

      {!loading && results.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filterRow}>
          {FILTERS.map(item => (
            <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, filter === item && styles.filterChipActive]}>
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {isDemoMode && matchStatus !== 'available' && (
        <View style={styles.matchBanner}>
          <View style={styles.matchBannerTop}>
            <View style={styles.matchBannerIcon}><Ionicons name={matchStatus === 'accepted' ? 'checkmark' : 'swap-horizontal'} size={18} color={Colors.surface} /></View>
            <View style={styles.matchBannerCopy}>
              <Text style={styles.matchBannerTitle}>{matchStatus === 'accepted' ? 'Meera accepted Anjali' : 'Care request sent to Meera'}</Text>
              <Text style={styles.matchBannerText}>{matchStatus === 'accepted' ? 'Forms and two-way messages are now connected.' : 'You can return home now or switch roles to accept it as Meera.'}</Text>
            </View>
          </View>
          <View style={styles.matchBannerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open patient home"
              onPress={() => router.replace('/(family)')}
              style={styles.homeButton}
            >
              <Ionicons name="home-outline" size={15} color={Colors.surface} />
              <Text style={styles.homeButtonText}>Patient home</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue as caregiver"
              onPress={() => {
                switchDemoRole('caregiver');
                router.replace('/(caregiver)');
              }}
              style={styles.switchButton}
            >
              <Text style={styles.switchButtonText}>Caregiver view</Text>
            </Pressable>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={Colors.accent} />
          <Text style={styles.stateTitle}>Searching near {profile.location}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={34} color={Colors.textSecondary} />
          <Text style={styles.stateTitle}>Search unavailable</Text>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable onPress={() => void search()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.stateText}>No matches for this filter.</Text></View>}
          renderItem={({ item }) => <ResultCard result={item} demoStatus={isDemoMode ? matchStatus : undefined} onRequest={requestDemoCaregiver} />}
        />
      )}

      {isDemoMode && matchStatus === 'requested' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Demo shortcut: accept care request"
          accessibilityHint="Skips the caregiver acceptance step"
          onPress={() => {
            acceptDemoCareRequest();
            router.replace('/(family)');
          }}
          style={({ pressed }) => [styles.demoShortcut, pressed && styles.demoShortcutPressed]}
        >
          <Ionicons name="chevron-down" size={22} color={Colors.surface} />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  navBar: { minHeight: Platform.OS === 'web' ? 56 : 48, paddingHorizontal: Platform.OS === 'web' ? Spacing.md : 12, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  navTitle: { flex: 1, fontSize: Platform.OS === 'web' ? 22 : 20, fontWeight: '700', letterSpacing: -0.4, color: Colors.textPrimary },
  demoNavBadge: { borderRadius: Radius.pill, backgroundColor: Colors.accentTint, paddingHorizontal: 8, paddingVertical: 5 },
  demoNavText: { fontSize: 8, fontWeight: '800', color: Colors.accent, letterSpacing: 0.7 },
  refreshButton: { width: Platform.OS === 'web' ? 38 : 34, height: Platform.OS === 'web' ? 38 : 34, borderRadius: Radius.pill, backgroundColor: Colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  filtersScroll: { flexGrow: 0, minHeight: Platform.OS === 'web' ? 46 : 40 },
  filterRow: { paddingHorizontal: Platform.OS === 'web' ? Spacing.md : 12, paddingTop: Platform.OS === 'web' ? 12 : 8, paddingBottom: Platform.OS === 'web' ? 10 : 8, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: Colors.surface },
  list: { padding: Platform.OS === 'web' ? Spacing.md : 12, paddingTop: Spacing.xs, paddingBottom: Platform.OS === 'web' ? 36 : 24 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 11 },
  demoCard: { borderColor: Colors.accent, borderWidth: 1.5 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  placeIcon: { width: 42, height: 42, borderRadius: Radius.lg, backgroundColor: Colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  cardHeading: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  topMatchBadge: { borderRadius: Radius.pill, backgroundColor: Colors.accentTint, paddingHorizontal: 7, paddingVertical: 4 },
  topMatchText: { fontSize: 8, fontWeight: '800', color: Colors.accent, letterSpacing: 0.6 },
  kind: { marginTop: 2, fontSize: 13, fontWeight: '600', color: Colors.accent },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  address: { flex: 1, fontSize: 13, lineHeight: 18, color: Colors.textSecondary },
  summary: { fontSize: 13, lineHeight: 19, color: Colors.textPrimary },
  caregiverFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  caregiverFact: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, borderRadius: Radius.pill, backgroundColor: Colors.bg, paddingHorizontal: 8, paddingVertical: 5 },
  cardFooter: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 6, flexDirection: 'row', justifyContent: 'flex-end' },
  sourceButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 7 },
  sourceButtonText: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  requestButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: Radius.md, backgroundColor: Colors.accent, paddingHorizontal: 15 },
  requestButtonDone: { backgroundColor: Colors.accentTint },
  requestButtonText: { fontSize: 13, fontWeight: '700', color: Colors.surface },
  requestButtonTextDone: { color: Colors.accent },
  matchBanner: { marginHorizontal: Spacing.md, marginTop: 12, gap: 10, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.accent, backgroundColor: Colors.accentTint, padding: 12 },
  matchBannerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  matchBannerIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accent },
  matchBannerCopy: { flex: 1 },
  matchBannerTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  matchBannerText: { marginTop: 2, fontSize: 11, lineHeight: 15, color: Colors.textSecondary },
  matchBannerActions: { flexDirection: 'row', gap: 8, paddingLeft: 42 },
  homeButton: { flex: 1, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.md, backgroundColor: Colors.accent, paddingHorizontal: 10 },
  homeButtonText: { fontSize: 11, fontWeight: '800', color: Colors.surface },
  switchButton: { borderRadius: Radius.md, backgroundColor: Colors.surface, paddingHorizontal: 9, paddingVertical: 8 },
  switchButtonText: { fontSize: 10, fontWeight: '800', color: Colors.accent },
  pressed: { opacity: 0.65 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, paddingBottom: 70, gap: 10 },
  stateTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  stateText: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary, textAlign: 'center' },
  retryButton: { marginTop: 6, borderRadius: Radius.lg, backgroundColor: Colors.accent, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: Colors.surface, fontSize: 14, fontWeight: '700' },
  empty: { paddingVertical: 40, paddingHorizontal: 20 },
  demoShortcut: { position: 'absolute', right: Platform.OS === 'web' ? 22 : 16, bottom: Platform.OS === 'web' ? 22 : 14, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accent, opacity: 0.42, shadowColor: Colors.ink, shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  demoShortcutPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
