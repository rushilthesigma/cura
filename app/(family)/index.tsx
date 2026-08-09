import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '../../src/design/tokens';
import { useCareProfile, type CareProfile } from '../../src/context/CareProfileContext';
import { useActivityLog, type ActivityEntry } from '../../src/context/ActivityLogContext';
import { DAILY_QUESTIONS, useDailyCare } from '../../src/context/DailyCareContext';
import { ScreenHeader } from '../../src/components/AppMenu';
import type { TimelineEntryType } from '../../src/models/types';
import { useDemoFlow } from '../../src/context/DemoFlowContext';

const CARE_NEEDS = ['Memory support', 'Mobility support', 'Companionship', 'Medication help', 'Personal care', 'Overnight support'];

const STEPS = [
  'Person and goals',
  'Health and medicines',
  'Daily function',
  'Mind and senses',
  'Mobility and safety',
  'Routines and review',
];

const fmt = (date: Date) => date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

const activityIcons: Record<TimelineEntryType, React.ComponentProps<typeof Ionicons>['name']> = {
  checkIn: 'log-in-outline',
  checkOut: 'log-out-outline',
  meal: 'restaurant-outline',
  hydration: 'water-outline',
  mood: 'happy-outline',
  mobility: 'walk-outline',
  sleep: 'moon-outline',
  medication: 'medical-outline',
  observation: 'eye-outline',
  handoff: 'swap-horizontal-outline',
  note: 'document-text-outline',
};

function fmtDayLabel(date: Date) {
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' });
}

function ActivityCard({ entries }: { entries: ActivityEntry[] }) {
  return (
    <View style={styles.activityList}>
      {entries.map((entry, index) => (
        <View key={entry.id} style={styles.activityRow}>
          <View style={styles.activityRail}>
            <View style={styles.activityIcon}>
              <Ionicons name={activityIcons[entry.type]} size={17} color={Colors.accent} />
            </View>
            {index < entries.length - 1 && <View style={styles.activityLine} />}
          </View>
          <View style={[styles.activityContent, index === entries.length - 1 && styles.lastActivityContent]}>
            <View style={styles.activityTop}>
              <Text style={styles.activityTitle}>{entry.title}</Text>
              <Text style={styles.activityTime}>{fmt(new Date(entry.timestamp))}</Text>
            </View>
            {entry.detail.length > 0 && <Text style={styles.activityDetail}>{entry.detail}</Text>}
            <Text style={styles.activityBy}>{entry.caregiverName}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}

function ProfileEditor({ initial, onCancel, onSave }: { initial: CareProfile; onCancel: () => void; onSave: (profile: CareProfile) => void }) {
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState(0);
  const update = (key: keyof CareProfile, value: string | string[]) => setDraft(current => ({ ...current, [key]: value }));
  const canContinue = draft.patientName.trim().length > 1 && draft.preferredName.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.editorHeader}>
          <Pressable onPress={onCancel} hitSlop={10}><Text style={styles.headerAction}>Cancel</Text></Pressable>
          <Text style={styles.editorTitle}>Patient record</Text>
          <Text style={styles.stepCount}>{step + 1} of {STEPS.length}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.editorScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.stepTitle}>{STEPS[step]}</Text>

          {step === 0 && (
            <View style={styles.formStack}>
              <Field label="Full name" value={draft.patientName} onChangeText={value => update('patientName', value)} placeholder="Full name" />
              <Field label="Preferred name" value={draft.preferredName} onChangeText={value => update('preferredName', value)} placeholder="Preferred name" />
              <Field label="Relationship" value={draft.relationship} onChangeText={value => update('relationship', value)} placeholder="e.g. Grandmother" />
              <Field label="Date of birth" value={draft.dateOfBirth} onChangeText={value => update('dateOfBirth', value)} placeholder="YYYY-MM-DD" />
              <Field label="Home area" value={draft.location} onChangeText={value => update('location', value)} placeholder="City or postcode" />
              <Field label="Primary language" value={draft.primaryLanguage} onChangeText={value => update('primaryLanguage', value)} placeholder="Language" />
              <Field label="What matters most" value={draft.careGoals} onChangeText={value => update('careGoals', value)} placeholder="Goals and wishes" multiline />
            </View>
          )}

          {step === 1 && (
            <View style={styles.formStack}>
              <Field label="Conditions and diagnoses" value={draft.medicalConditions} onChangeText={value => update('medicalConditions', value)} placeholder="One per line" multiline />
              <Field label="Medicines" value={draft.medications} onChangeText={value => update('medications', value)} placeholder="Name, dose, timing" multiline />
              <Field label="Allergies and reactions" value={draft.allergies} onChangeText={value => update('allergies', value)} placeholder="Allergies" multiline />
              <Field label="Primary clinician" value={draft.clinicianContact} onChangeText={value => update('clinicianContact', value)} placeholder="Name, clinic, phone" multiline />
            </View>
          )}

          {step === 2 && (
            <View style={styles.formStack}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Support that may help</Text>
                <View style={styles.needWrap}>
                  {CARE_NEEDS.map(need => {
                    const selected = draft.careNeeds.includes(need);
                    return (
                      <Pressable
                        key={need}
                        onPress={() => update('careNeeds', selected ? draft.careNeeds.filter(item => item !== need) : [...draft.careNeeds, need])}
                        style={[styles.needChip, selected && styles.needChipSelected]}
                      >
                        <Text style={[styles.needChipText, selected && styles.needChipTextSelected]}>{need}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <Field label="Daily activities" value={draft.dailyActivities} onChangeText={value => update('dailyActivities', value)} placeholder="Eating, bathing, dressing, transfers" multiline />
              <Field label="Nutrition and hydration" value={draft.nutritionAndHydration} onChangeText={value => update('nutritionAndHydration', value)} placeholder="Diet and preferences" multiline />
            </View>
          )}

          {step === 3 && (
            <View style={styles.formStack}>
              <Field label="Cognition and mood" value={draft.cognitionAndMood} onChangeText={value => update('cognitionAndMood', value)} placeholder="Memory, mood, sleep" multiline />
              <Field label="Vision and hearing" value={draft.sensoryNeeds} onChangeText={value => update('sensoryNeeds', value)} placeholder="Glasses, hearing aids" multiline />
              <Field label="How to communicate" value={draft.communicationNotes} onChangeText={value => update('communicationNotes', value)} placeholder="Language, pace, approaches" multiline />
            </View>
          )}

          {step === 4 && (
            <View style={styles.formStack}>
              <Field label="Mobility and fall history" value={draft.mobilityAndFalls} onChangeText={value => update('mobilityAndFalls', value)} placeholder="Falls, aids, hazards" multiline />
              <Field label="Emergency contact" value={draft.emergencyContact} onChangeText={value => update('emergencyContact', value)} placeholder="Name and phone" multiline />
            </View>
          )}

          {step === 5 && (
            <View style={styles.formStack}>
              <Field label="Routines and comfort" value={draft.routinesAndComfort} onChangeText={value => update('routinesAndComfort', value)} placeholder="Daily rhythm and preferences" multiline />
              <Field label="Anything else" value={draft.additionalNotes} onChangeText={value => update('additionalNotes', value)} placeholder="Other notes" multiline />
            </View>
          )}
        </ScrollView>

        <View style={styles.editorFooter}>
          {step > 0 && (
            <Pressable style={styles.secondaryButton} onPress={() => setStep(current => current - 1)}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </Pressable>
          )}
          <Pressable
            disabled={!canContinue}
            style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}
            onPress={() => step === STEPS.length - 1 ? onSave(draft) : setStep(current => current + 1)}
          >
            <Text style={styles.primaryButtonText}>{step === STEPS.length - 1 ? 'Save' : 'Continue'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function FamilyHomeScreen() {
  const { profile, updateProfile, isDemoMode, assignedCaregiverName } = useCareProfile();
  const { latestCheckIn } = useDailyCare();
  const { matchStatus } = useDemoFlow();
  const [editing, setEditing] = useState(false);
  const { days, todayEntries } = useActivityLog();
  const pastDays = days.filter(day => day.key !== new Date().toDateString());

  const detailRows = [
    ['Home', profile.location],
    ['Health', profile.medicalConditions],
    ['Medicines', profile.medications],
    ['Safety', profile.mobilityAndFalls],
    ['Comfort', profile.routinesAndComfort],
  ].filter(([, value]) => value.trim());

  if (editing) {
    return <ProfileEditor initial={profile} onCancel={() => setEditing(false)} onSave={next => { updateProfile(next); setEditing(false); }} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader role="family" title={profile.preferredName || 'Patient'} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isDemoMode && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={matchStatus === 'accepted' ? `Open messages with ${assignedCaregiverName}` : 'Open Find Care'}
            style={[styles.demoNotice, matchStatus === 'accepted' && styles.connectedNotice]}
            onPress={() => router.push(matchStatus === 'accepted' ? '/(family)/messages' : '/(family)/hire')}
          >
            <View style={[styles.demoNoticeIcon, matchStatus === 'accepted' && styles.connectedNoticeIcon]}>
              <Ionicons name={matchStatus === 'accepted' ? 'checkmark' : 'time-outline'} size={17} color={Colors.surface} />
            </View>
            <View style={styles.flex}>
              {matchStatus === 'accepted' && (
                <View style={styles.connectedBadge}>
                  <Text style={styles.connectedBadgeText}>CONNECTED</Text>
                </View>
              )}
              <Text style={styles.demoNoticeTitle}>
                {matchStatus === 'accepted'
                  ? `${assignedCaregiverName} accepted your care request`
                  : `Preset demo · ${profile.patientName}`}
              </Text>
              <Text style={styles.demoNoticeText}>
                {matchStatus === 'accepted'
                  ? `You’re connected. Your family can now exchange messages, care forms, and updates with ${assignedCaregiverName}.`
                  : matchStatus === 'requested'
                    ? `Care request sent to ${assignedCaregiverName}. Waiting for her response.`
                    : `Finish Find Care to connect with ${assignedCaregiverName}.`}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={17} color={Colors.accent} />
          </Pressable>
        )}
        <View style={styles.memoryCard}>
          <View style={styles.memoryTop}>
            <Text style={styles.memoryTitle}>Patient record</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit patient record" style={styles.editButton} onPress={() => setEditing(true)}><Text style={styles.editButtonText}>Edit</Text></Pressable>
          </View>
          {!!profile.careGoals.trim() && <Text style={styles.goalText}>{profile.careGoals}</Text>}
        </View>

        <Text style={styles.sectionTitle}>Daily check-in</Text>
        {latestCheckIn ? (
          <View style={styles.checkInSummary}>
            <View style={styles.checkInTop}>
              <View style={[
                styles.assessmentIcon,
                { backgroundColor: (latestCheckIn.assessment.level === 'urgent' ? Colors.urgent : latestCheckIn.assessment.level === 'contact' ? Colors.attention : Colors.positive) + '18' },
              ]}>
                <Ionicons
                  name={latestCheckIn.assessment.level === 'urgent' ? 'warning' : latestCheckIn.assessment.level === 'contact' ? 'call' : 'checkmark-circle'}
                  size={22}
                  color={latestCheckIn.assessment.level === 'urgent' ? Colors.urgent : latestCheckIn.assessment.level === 'contact' ? Colors.attention : Colors.positive}
                />
              </View>
              <View style={styles.flex}>
                <Text style={styles.checkInTitle}>{latestCheckIn.assessment.title}</Text>
                <Text style={styles.checkInMeta}>{latestCheckIn.submittedBy} · {fmt(new Date(latestCheckIn.submittedAt))}</Text>
              </View>
            </View>
            <Text style={styles.checkInText}>{latestCheckIn.assessment.summary}</Text>
            <View style={styles.checkInNext}><Text style={styles.checkInNextLabel}>Next step</Text><Text style={styles.checkInNextText}>{latestCheckIn.assessment.nextStep}</Text></View>
            {latestCheckIn.assessment.flaggedQuestionIds.length > 0 && (
              <View style={styles.flagWrap}>
                {latestCheckIn.assessment.flaggedQuestionIds.map(id => <View key={id} style={styles.flagChip}><Text style={styles.flagText}>{DAILY_QUESTIONS.find(question => question.id === id)?.domain}</Text></View>)}
              </View>
            )}
            {!!latestCheckIn.notes && <Text style={styles.caregiverNotes}>“{latestCheckIn.notes}”</Text>}
            <Pressable style={styles.askCuraButton} onPress={() => router.push('/(family)/chatbot')}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.surface} />
              <Text style={styles.askCuraText}>Ask Cura about this check-in</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyRow}>
            <Ionicons name="time-outline" size={18} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No check-in today.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Care profile</Text>
        {detailRows.length > 0 ? (
          <View style={styles.detailList}>
            {detailRows.map(([label, value], index) => (
              <View key={label} style={[styles.detailRow, index === detailRows.length - 1 && styles.lastDetailRow]}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue} numberOfLines={3}>{value}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyRow}>
            <Ionicons name="document-text-outline" size={18} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No care details yet.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Today’s activity</Text>
        {todayEntries.length === 0 ? (
          <View style={styles.emptyRow}>
            <Ionicons name="list-outline" size={18} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No updates yet.</Text>
          </View>
        ) : (
          <ActivityCard entries={todayEntries} />
        )}

        {pastDays.map(day => (
          <View key={day.key} style={styles.pastDay}>
            <Text style={styles.sectionTitle}>{fmtDayLabel(day.date)}</Text>
            <ActivityCard entries={day.entries} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: Platform.OS === 'web' ? Spacing.lg : 14, paddingTop: Platform.OS === 'web' ? Spacing.md : 10, gap: Platform.OS === 'web' ? 18 : 14, paddingBottom: Platform.OS === 'web' ? 48 : 28 },
  demoNotice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: Colors.accent, borderRadius: Radius.lg, backgroundColor: Colors.accentTint, padding: Spacing.md },
  connectedNotice: { borderColor: Colors.positive, backgroundColor: '#E7EBDD' },
  demoNoticeIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accent },
  connectedNoticeIcon: { backgroundColor: Colors.positive },
  connectedBadge: { alignSelf: 'flex-start', borderRadius: Radius.pill, backgroundColor: Colors.positive, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 5 },
  connectedBadgeText: { fontSize: 9, lineHeight: 11, fontWeight: '800', letterSpacing: 0.8, color: Colors.surface },
  demoNoticeTitle: { fontSize: 14, fontFamily: Fonts.bodySemibold, color: Colors.textPrimary },
  demoNoticeText: { marginTop: 2, fontSize: 12, lineHeight: 17, color: Colors.textSecondary },
  memoryCard: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 12, gap: Spacing.md },
  memoryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  memoryTitle: { fontSize: 20, fontFamily: Fonts.displayMedium, color: Colors.textPrimary },
  editButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.sm },
  editButtonText: { fontSize: 13, fontFamily: Fonts.bodySemibold, color: Colors.accent, textDecorationLine: 'underline' },
  goalText: { fontSize: 15, lineHeight: 22, color: Colors.textPrimary },
  checkInSummary: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md, gap: Spacing.md },
  checkInTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  assessmentIcon: { width: 42, height: 42, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  checkInTitle: { fontSize: 19, fontFamily: Fonts.displayMedium, color: Colors.textPrimary },
  checkInMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  checkInText: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  checkInNext: { borderRadius: Radius.lg, backgroundColor: Colors.bg, padding: 13 },
  checkInNextLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  checkInNextText: { fontSize: 13, lineHeight: 19, color: Colors.textPrimary, marginTop: 5 },
  flagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  flagChip: { borderRadius: Radius.pill, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 9, paddingVertical: 5 },
  flagText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  caregiverNotes: { fontSize: 13, lineHeight: 19, fontStyle: 'italic', color: Colors.textSecondary },
  askCuraButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.lg, backgroundColor: Colors.accent },
  askCuraText: { fontSize: 14, fontWeight: '700', color: Colors.surface },
  emptyCard: { borderRadius: Radius.xl, backgroundColor: Colors.surface, padding: Spacing.md },
  emptyRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 4 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  sectionTitle: { fontSize: 23, fontFamily: Fonts.displaySemibold, letterSpacing: -0.25, color: Colors.textPrimary, marginTop: 10 },
  detailList: { backgroundColor: Colors.surface, borderRadius: Radius.xl, paddingHorizontal: Spacing.md },
  detailRow: { flexDirection: 'row', gap: 18, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: Colors.border },
  lastDetailRow: { borderBottomWidth: 0 },
  detailLabel: { width: 72, fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  detailValue: { flex: 1, fontSize: 14, lineHeight: 20, color: Colors.textPrimary },
  emptyDetails: { paddingVertical: Spacing.md, fontSize: 14, color: Colors.textSecondary },
  activityList: { backgroundColor: Colors.surface, borderRadius: Radius.xl, paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  activityRow: { flexDirection: 'row', gap: 13 },
  activityRail: { width: 36, alignItems: 'center' },
  activityIcon: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accentTint },
  activityLine: { flex: 1, width: 2, minHeight: 18, backgroundColor: Colors.border, marginVertical: 5 },
  activityContent: { flex: 1, paddingBottom: 18, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  lastActivityContent: { borderBottomWidth: 0, marginBottom: 0 },
  activityTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  activityTitle: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '700', color: Colors.textPrimary },
  activityTime: { fontSize: 12, lineHeight: 20, fontWeight: '600', color: Colors.textSecondary },
  activityDetail: { fontSize: 13, lineHeight: 19, color: Colors.textSecondary, marginTop: 5 },
  activityBy: { fontSize: 11, fontWeight: '600', color: Colors.textTertiary, marginTop: 7 },
  pastDay: { gap: Spacing.md },
  editorHeader: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, backgroundColor: Colors.surface },
  headerAction: { fontSize: 14, fontWeight: '600', color: Colors.accent },
  editorTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  stepCount: { width: 58, textAlign: 'right', fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  progressTrack: { height: 4, backgroundColor: Colors.border },
  progressFill: { height: 4, backgroundColor: Colors.accent },
  editorScroll: { padding: Spacing.lg, paddingBottom: 36 },
  stepTitle: { fontSize: 32, fontFamily: Fonts.displaySemibold, color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: Spacing.lg },
  formStack: { gap: 17 },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  input: { minHeight: 50, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },
  textarea: { minHeight: 96, lineHeight: 21 },
  needWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  needChip: { borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, paddingHorizontal: 11, paddingVertical: 9 },
  needChipSelected: { borderColor: Colors.accent, backgroundColor: Colors.accentTint },
  needChipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  needChipTextSelected: { color: Colors.accent, fontWeight: '700' },
  editorFooter: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  secondaryButton: { minWidth: 88, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  secondaryButtonText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  primaryButton: { flex: 1, borderRadius: Radius.lg, backgroundColor: Colors.accent, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  primaryButtonDisabled: { backgroundColor: Colors.textTertiary },
  primaryButtonText: { fontSize: 15, fontWeight: '700', color: Colors.surface },
});
