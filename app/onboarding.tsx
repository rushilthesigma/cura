import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Radius, Spacing } from '../src/design/tokens';
import { useCareProfile } from '../src/context/CareProfileContext';
import { useDemoFlow } from '../src/context/DemoFlowContext';
import { researchNearbyCare, type CareSearchResult } from '../src/utils/careSearch';
import { DEMO_CAREGIVER, DEMO_CAREGIVER_RESULT, DEMO_PROFILE } from '../src/data/demoData';

const RELATIONSHIPS = ['Mother', 'Father', 'Grandmother', 'Grandfather', 'Partner', 'Other'];
const CARE_NEEDS = ['Memory support', 'Mobility support', 'Companionship', 'Medication help'];

export default function OnboardingScreen() {
  const { completeOnboarding, isDemoMode, profile } = useCareProfile();
  const { finishPatientOnboarding, isActive: isDemoFlowActive, activeRole } = useDemoFlow();
  const isPatientDemo = isDemoMode || (isDemoFlowActive && activeRole === 'patient');
  const [step, setStep] = useState(0);
  const [patientName, setPatientName] = useState(isPatientDemo ? DEMO_PROFILE.patientName : profile.patientName);
  const [preferredName, setPreferredName] = useState(isPatientDemo ? DEMO_PROFILE.preferredName : profile.preferredName);
  const [relationship, setRelationship] = useState(isPatientDemo ? DEMO_PROFILE.relationship : profile.relationship);
  const [location, setLocation] = useState(isPatientDemo ? DEMO_PROFILE.location : profile.location);
  const [locationFocused, setLocationFocused] = useState(false);
  const [careNeeds, setCareNeeds] = useState<string[]>(isPatientDemo ? DEMO_PROFILE.careNeeds : profile.careNeeds);
  const [careResults, setCareResults] = useState<CareSearchResult[]>([]);
  const [searchError, setSearchError] = useState('');

  const shortName = preferredName.trim() || patientName.trim().split(' ')[0] || 'your patient';
  const canContinue = useMemo(() => {
    if (step === 0) return patientName.trim().length > 1 && relationship.length > 0;
    if (step === 1) return location.trim().length > 3;
    return true;
  }, [location, patientName, relationship, step]);

  useEffect(() => {
    if (step !== 2) return;
    let active = true;
    setCareResults([]);
    setSearchError('');
    if (isPatientDemo) {
      setCareResults([DEMO_CAREGIVER_RESULT]);
      setStep(3);
      return () => { active = false; };
    }
    researchNearbyCare({
      preferredName: shortName,
      location: location.trim(),
      careNeeds,
    }).then(results => {
      if (!active) return;
      setCareResults(results);
      setStep(3);
    }).catch(error => {
      if (!active) return;
      setSearchError(error instanceof Error ? error.message : 'Care search is unavailable right now.');
      setStep(3);
    });
    return () => { active = false; };
  }, [careNeeds, isPatientDemo, location, shortName, step]);

  const goBack = () => {
    if (step === 0) router.back();
    else if (step === 3) setStep(1);
    else setStep(current => Math.max(0, current - 1));
  };

  const finish = () => {
    completeOnboarding({
      patientName: patientName.trim(),
      preferredName: shortName,
      relationship,
      location: location.trim(),
      careNeeds,
    });
    if (isPatientDemo) finishPatientOnboarding();
    router.replace('/(family)/hire');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12} onPress={goBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={21} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 4, now: step + 1 }}>
            <View style={[styles.progressFill, { width: `${((step + 1) / 4) * 100}%` }]} />
          </View>
          <Text style={styles.stepText}>{step + 1} of 4</Text>
        </View>

        {isPatientDemo && (
          <View style={styles.demoStrip}>
            <Ionicons name="person-circle-outline" size={16} color={Colors.accent} />
            <Text style={styles.demoStripText}>PATIENT DEMO · PRESET PROFILE</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {step === 0 && (
            <View style={styles.section}>
              <Text style={styles.title}>Who are you caring for?</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Patient’s full name</Text>
                <TextInput
                  autoFocus
                  accessibilityLabel="Patient’s full name"
                  style={styles.input}
                  value={patientName}
                  onChangeText={setPatientName}
                  placeholder="Full name"
                  placeholderTextColor={Colors.textTertiary}
                  returnKeyType="next"
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Preferred name</Text>
                <TextInput
                  accessibilityLabel="Preferred patient name"
                  style={styles.input}
                  value={preferredName}
                  onChangeText={setPreferredName}
                  placeholder="e.g. Aaji"
                  placeholderTextColor={Colors.textTertiary}
                  returnKeyType="done"
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>They are my…</Text>
                <View style={styles.pillWrap}>
                  {RELATIONSHIPS.map(item => (
                    <Pressable
                      key={item}
                      accessibilityRole="button"
                      accessibilityState={{ selected: relationship === item }}
                      onPress={() => setRelationship(item)}
                      style={[styles.pill, relationship === item && styles.pillSelected]}
                    >
                      <Text style={[styles.pillText, relationship === item && styles.pillTextSelected]}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}

          {step === 1 && (
            <View style={styles.section}>
              <Text style={styles.title}>Where does {shortName} live?</Text>

              <View style={[styles.locationField, locationFocused && styles.locationFieldFocused]}>
                <Ionicons name="search" size={20} color={Colors.textSecondary} />
                <TextInput
                  autoFocus
                  accessibilityLabel="Patient neighborhood, city, or postcode"
                  style={styles.locationInput}
                  value={location}
                  onChangeText={setLocation}
                  onFocus={() => setLocationFocused(true)}
                  onBlur={() => setLocationFocused(false)}
                  placeholder="Neighborhood, city, or postcode"
                  placeholderTextColor={Colors.textTertiary}
                  returnKeyType="done"
                  onSubmitEditing={() => canContinue && setStep(2)}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>What kind of support may help?</Text>
                <View style={styles.needList}>
                  {CARE_NEEDS.map(item => {
                    const selected = careNeeds.includes(item);
                    return (
                      <Pressable
                        key={item}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        onPress={() => setCareNeeds(current => selected ? current.filter(value => value !== item) : [...current, item])}
                        style={[styles.needRow, selected && styles.needRowSelected]}
                      >
                        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                          {selected && <Ionicons name="checkmark" size={15} color={Colors.surface} />}
                        </View>
                        <Text style={styles.needText}>{item}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.searching}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.titleCentered}>Finding care near {location}</Text>
            </View>
          )}

          {step === 3 && (
            <View style={styles.section}>
              <Text style={styles.title}>{searchError ? 'Couldn’t search this area' : 'Care near ' + shortName}</Text>
              {!!searchError && <Text style={styles.errorText}>{searchError}</Text>}

              {!searchError && (
                <View style={styles.matches}>
                  {careResults.slice(0, 4).map(result => result.id === DEMO_CAREGIVER.id ? (
                    <View key={result.id} style={[styles.matchRow, styles.demoMatchRow]}>
                      <View style={styles.matchIcon}><Ionicons name="person-outline" size={20} color={Colors.accent} /></View>
                      <View style={styles.matchCopy}>
                        <View style={styles.demoMatchTop}><Text style={styles.matchName}>{result.name}</Text><Text style={styles.bestMatch}>BEST MATCH</Text></View>
                        <Text style={styles.matchType}>{result.kind}</Text>
                        <Text style={styles.matchDetail}>{DEMO_CAREGIVER.language} · {DEMO_CAREGIVER.yearsExperience} years’ experience</Text>
                      </View>
                    </View>
                  ) : (
                    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(result.sourceUrl)} key={result.id} style={({ pressed }) => [styles.matchRow, pressed && styles.matchRowPressed]}>
                      <View style={styles.matchIcon}><Ionicons name="business-outline" size={20} color={Colors.accent} /></View>
                      <View style={styles.matchCopy}>
                        <Text style={styles.matchName}>{result.name}</Text>
                        <Text style={styles.matchType}>{result.kind}</Text>
                        <Text style={styles.matchDetail} numberOfLines={2}>{result.address}</Text>
                      </View>
                      <Ionicons name="open-outline" size={17} color={Colors.accent} />
                    </Pressable>
                  ))}
                </View>
              )}

              {searchError ? (
                <Pressable style={styles.retryResearch} onPress={() => setStep(2)}>
                  <Ionicons name="refresh" size={17} color={Colors.accent} />
                  <Text style={styles.retryResearchText}>Search again</Text>
                </Pressable>
              ) : (
                <Text style={styles.disclaimer}>Confirm services, credentials, pricing, and availability with each provider.</Text>
              )}
            </View>
          )}
        </ScrollView>

        {step !== 2 && (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              disabled={!canContinue}
              style={({ pressed }) => [styles.primaryButton, !canContinue && styles.primaryButtonDisabled, pressed && canContinue && styles.primaryButtonPressed]}
              onPress={() => step === 3 ? finish() : setStep(current => current + 1)}
            >
              <Text style={styles.primaryButtonText}>{step === 3 ? 'Open Find care' : 'Continue'}</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.surface} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  topBar: { width: '100%', maxWidth: 620, alignSelf: 'center', height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, gap: 12 },
  demoStrip: { width: '100%', maxWidth: 600, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, backgroundColor: Colors.accentTint },
  demoStripText: { fontSize: 9, fontWeight: '700', color: Colors.accent, letterSpacing: 0.9 },
  iconButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: Colors.accent },
  stepText: { width: 38, fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textAlign: 'right' },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: 28, paddingBottom: 32 },
  section: { gap: Spacing.md },
  title: { fontSize: 32, lineHeight: 37, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.8, marginBottom: Spacing.sm },
  errorText: { fontSize: 15, lineHeight: 22, color: Colors.textSecondary },
  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  input: { height: 54, borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, fontSize: 16, color: Colors.textPrimary, outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  locationField: { height: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  locationFieldFocused: { borderColor: Colors.accent, borderWidth: 1.5 },
  locationInput: { flex: 1, height: '100%', padding: 0, borderWidth: 0, backgroundColor: 'transparent', fontSize: 16, color: Colors.textPrimary, outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  pillSelected: { backgroundColor: Colors.accentTint, borderColor: Colors.accent },
  pillText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  pillTextSelected: { color: Colors.accent, fontWeight: '700' },
  needList: { gap: 8 },
  needRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  needRowSelected: { borderColor: Colors.accent, backgroundColor: Colors.accentTint },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: Colors.textTertiary, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  needText: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  searching: { flex: 1, alignItems: 'center', paddingTop: 120, gap: Spacing.lg },
  titleCentered: { fontSize: 26, lineHeight: 32, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.6, textAlign: 'center' },
  matches: { gap: 8 },
  matchRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  matchRowPressed: { opacity: 0.7 },
  demoMatchRow: { borderColor: Colors.accent, backgroundColor: Colors.accentTint },
  matchIcon: { width: 42, height: 42, borderRadius: Radius.md, backgroundColor: Colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  matchCopy: { flex: 1, gap: 3 },
  matchName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  demoMatchTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  bestMatch: { fontSize: 8, fontWeight: '800', color: Colors.accent, letterSpacing: 0.7 },
  matchType: { fontSize: 13, fontWeight: '600', color: Colors.accent },
  matchDetail: { fontSize: 12, lineHeight: 17, color: Colors.textSecondary },
  disclaimer: { fontSize: 12, lineHeight: 17, color: Colors.textSecondary },
  retryResearch: { height: 48, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.accent, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  retryResearchText: { fontSize: 14, fontWeight: '700', color: Colors.accent },
  footer: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: Spacing.lg, paddingTop: 10, paddingBottom: 12, backgroundColor: Colors.bg },
  primaryButton: { height: 54, borderRadius: Radius.lg, backgroundColor: Colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonDisabled: { backgroundColor: Colors.textTertiary },
  primaryButtonPressed: { opacity: 0.84 },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: Colors.surface },
});
