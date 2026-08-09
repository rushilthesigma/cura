import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../src/design/tokens';
import type { TimelineEntryType } from '../../src/models/types';
import { useCareProfile, type CareProfile } from '../../src/context/CareProfileContext';
import { useActivityLog } from '../../src/context/ActivityLogContext';
import { useDailyCare } from '../../src/context/DailyCareContext';
import { ItineraryEditorModal } from '../../src/components/ItineraryEditorModal';
import { DailyQuestionnaireModal } from '../../src/components/DailyQuestionnaireModal';
import { MenuButton } from '../../src/components/AppMenu';
import { useDemoFlow } from '../../src/context/DemoFlowContext';
import { DEMO_CAREGIVER } from '../../src/data/demoData';
import { generateCarePlan } from '../../src/utils/carePlanGenerator';

const fmt = (d: Date) =>
  d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

const hour = new Date().getHours();
const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

const UPDATE_TYPES: { type: TimelineEntryType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { type: 'checkIn', label: 'Check-in', icon: 'log-in-outline' },
  { type: 'meal', label: 'Meal', icon: 'restaurant-outline' },
  { type: 'hydration', label: 'Hydration', icon: 'water-outline' },
  { type: 'medication', label: 'Medication', icon: 'medical-outline' },
  { type: 'mobility', label: 'Mobility', icon: 'walk-outline' },
  { type: 'mood', label: 'Mood', icon: 'happy-outline' },
  { type: 'sleep', label: 'Rest', icon: 'moon-outline' },
  { type: 'observation', label: 'Observation', icon: 'eye-outline' },
  { type: 'note', label: 'Note', icon: 'document-text-outline' },
  { type: 'checkOut', label: 'Check-out', icon: 'log-out-outline' },
];

function LogUpdateModal({ visible, onClose, onPost }: { visible: boolean; onClose: () => void; onPost: (type: TimelineEntryType, title: string, detail: string) => void }) {
  const [type, setType] = useState<TimelineEntryType>('meal');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const canPost = title.trim().length > 0;

  const reset = () => {
    setType('meal');
    setTitle('');
    setDetail('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const post = () => {
    onPost(type, title.trim(), detail.trim());
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.recordSafe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.recordFlex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.recordHeader}>
            <Pressable onPress={close} hitSlop={10}><Text style={styles.recordHeaderAction}>Cancel</Text></Pressable>
            <Text style={styles.recordHeaderTitle}>Log an update</Text>
            <View style={styles.recordStepCount} />
          </View>

          <ScrollView contentContainerStyle={styles.recordScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.recordLabel}>What kind of update?</Text>
            <View style={styles.typeWrap}>
              {UPDATE_TYPES.map(option => {
                const selected = option.type === type;
                return (
                  <Pressable key={option.type} style={[styles.typeChip, selected && styles.typeChipSelected]} onPress={() => setType(option.type)}>
                    <Ionicons name={option.icon} size={15} color={selected ? Colors.surface : Colors.textSecondary} />
                    <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.recordField}>
              <Text style={styles.recordLabel}>Summary</Text>
              <TextInput
                accessibilityLabel="Summary"
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Breakfast — ate most"
                placeholderTextColor={Colors.textTertiary}
                style={styles.logTitleInput}
              />
            </View>

            <View style={styles.recordField}>
              <Text style={styles.recordLabel}>Details</Text>
              <TextInput
                accessibilityLabel="Details"
                value={detail}
                onChangeText={setDetail}
                placeholder="What happened, how she responded, anything the family should know"
                placeholderTextColor={Colors.textTertiary}
                multiline
                textAlignVertical="top"
                style={styles.recordInput}
              />
            </View>
          </ScrollView>

          <View style={styles.recordFooter}>
            <Pressable disabled={!canPost} style={[styles.recordContinue, !canPost && styles.recordContinueDisabled]} onPress={post}>
              <Text style={styles.recordContinueText}>Post update</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const RECORD_STEPS = [
  'Health and medicines',
  'Function and safety',
  'Person-centred care',
];

function RecordField({ label, value, placeholder, onChangeText }: { label: string; value: string; placeholder: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.recordField}>
      <Text style={styles.recordLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        multiline
        textAlignVertical="top"
        style={styles.recordInput}
      />
    </View>
  );
}

function PatientRecordModal({ profile, visible, onClose, onSave }: { profile: CareProfile; visible: boolean; onClose: () => void; onSave: (profile: CareProfile) => void }) {
  const [draft, setDraft] = useState(profile);
  const [step, setStep] = useState(0);
  const update = (key: keyof CareProfile, value: string) => setDraft(current => ({ ...current, [key]: value }));

  const close = () => {
    setDraft(profile);
    setStep(0);
    onClose();
  };

  const save = () => {
    onSave(draft);
    setStep(0);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.recordSafe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.recordFlex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.recordHeader}>
            <Pressable onPress={close} hitSlop={10}><Text style={styles.recordHeaderAction}>Cancel</Text></Pressable>
            <Text style={styles.recordHeaderTitle}>Update patient record</Text>
            <Text style={styles.recordStepCount}>{step + 1} of {RECORD_STEPS.length}</Text>
          </View>
          <View style={styles.recordProgress}><View style={[styles.recordProgressFill, { width: `${((step + 1) / RECORD_STEPS.length) * 100}%` }]} /></View>

          <ScrollView contentContainerStyle={styles.recordScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.recordStepTitle}>{RECORD_STEPS[step]}</Text>

            {step === 0 && (
              <View style={styles.recordFields}>
                <RecordField label="Conditions and diagnoses" value={draft.medicalConditions} onChangeText={value => update('medicalConditions', value)} placeholder="Add confirmed conditions and relevant history" />
                <RecordField label="Medicines" value={draft.medications} onChangeText={value => update('medications', value)} placeholder="Name, dose, timing, and how it was taken" />
                <RecordField label="Allergies and reactions" value={draft.allergies} onChangeText={value => update('allergies', value)} placeholder="Record allergies or no known allergies" />
              </View>
            )}

            {step === 1 && (
              <View style={styles.recordFields}>
                <RecordField label="Daily activities" value={draft.dailyActivities} onChangeText={value => update('dailyActivities', value)} placeholder="Changes in eating, bathing, dressing, toileting, or transfers" />
                <RecordField label="Cognition and mood" value={draft.cognitionAndMood} onChangeText={value => update('cognitionAndMood', value)} placeholder="Memory, orientation, sleep, mood, or behavior observations" />
                <RecordField label="Mobility and falls" value={draft.mobilityAndFalls} onChangeText={value => update('mobilityAndFalls', value)} placeholder="Falls, unsteadiness, fear of falling, aids, or hazards" />
                <RecordField label="Nutrition and hydration" value={draft.nutritionAndHydration} onChangeText={value => update('nutritionAndHydration', value)} placeholder="Food, fluids, swallowing, and preferences" />
              </View>
            )}

            {step === 2 && (
              <View style={styles.recordFields}>
                <RecordField label="How to communicate" value={draft.communicationNotes} onChangeText={value => update('communicationNotes', value)} placeholder="Language, pace, cues, and approaches to use or avoid" />
                <RecordField label="Routines and comfort" value={draft.routinesAndComfort} onChangeText={value => update('routinesAndComfort', value)} placeholder="Familiar routines, interests, and calming strategies" />
                <RecordField label="Caregiver handoff notes" value={draft.additionalNotes} onChangeText={value => update('additionalNotes', value)} placeholder="What should the family and next caregiver know?" />
                <RecordField label="Emergency contact" value={draft.emergencyContact} onChangeText={value => update('emergencyContact', value)} placeholder="Name, relationship, and phone" />
              </View>
            )}
          </ScrollView>

          <View style={styles.recordFooter}>
            {step > 0 && <Pressable style={styles.recordBack} onPress={() => setStep(current => current - 1)}><Text style={styles.recordBackText}>Back</Text></Pressable>}
            <Pressable style={styles.recordContinue} onPress={() => step === RECORD_STEPS.length - 1 ? save() : setStep(current => current + 1)}>
              <Text style={styles.recordContinueText}>{step === RECORD_STEPS.length - 1 ? 'Save' : 'Continue'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export default function CaregiverHomeScreen() {
  const { profile, updateProfile, assignedCaregiverName, isDemoMode } = useCareProfile();
  const { todayEntries, addEntry, removeEntry } = useActivityLog();
  const { itinerary, latestCheckIn, planGeneration, saveItinerary, toggleItineraryItem, submitCheckIn } = useDailyCare();
  const { activeRole, matchStatus, acceptDemoCareRequest, switchDemoRole } = useDemoFlow();
  const [checkedIn, setCheckedIn] = useState(true);
  const [recordOpen, setRecordOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false);

  useEffect(() => {
    if (isDemoMode && activeRole === 'patient' && matchStatus === 'accepted') {
      router.replace('/(family)');
    }
  }, [activeRole, isDemoMode, matchStatus]);

  const hasQuestionnairePlan = Boolean(
    latestCheckIn && planGeneration?.basedOnCheckInId === latestCheckIn.id,
  );
  const visibleItinerary = hasQuestionnairePlan ? itinerary : [];
  const done = visibleItinerary.filter(item => item.completed).length;
  const total = visibleItinerary.length;
  const hasPatient = profile.patientName.trim().length > 0;
  const caregiverName = assignedCaregiverName;

  if (isDemoMode && matchStatus !== 'accepted') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <MenuButton role="caregiver" />
          <View style={styles.greetingCopy}>
            <Text style={styles.greeting}>{greeting}, {DEMO_CAREGIVER.preferredName}</Text>
            <Text style={styles.demoLabel}>CAREGIVER DEMO · NEW REQUEST</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.requestScreen} showsVerticalScrollIndicator={false}>
          <View style={styles.requestEyebrowRow}>
            <View style={styles.requestPulse} />
            <Text style={styles.requestEyebrow}>NEW PATIENT REQUEST</Text>
          </View>
          <Text style={styles.requestTitle}>Anjali is looking for care.</Text>
          <Text style={styles.requestIntro}>Her preset onboarding profile matched your language, location, and care experience.</Text>

          <View style={styles.incomingCard}>
            <View style={styles.incomingTop}>
              <View style={styles.patientAvatar}><Text style={styles.patientAvatarText}>AD</Text></View>
              <View style={styles.flex}>
                <Text style={styles.incomingName}>{profile.patientName}</Text>
                <Text style={styles.incomingMeta}>{profile.location}</Text>
              </View>
              <View style={styles.pendingBadge}><Text style={styles.pendingText}>PENDING</Text></View>
            </View>
            <View style={styles.requestRule} />
            <Text style={styles.requestSectionLabel}>CARE REQUEST</Text>
            <Text style={styles.requestGoal}>{profile.careGoals}</Text>
            <View style={styles.needWrap}>
              {profile.careNeeds.map(need => <View key={need} style={styles.needChip}><Text style={styles.needChipText}>{need}</Text></View>)}
            </View>
            <View style={styles.requestDetailRow}><Ionicons name="language-outline" size={16} color={Colors.accent} /><Text style={styles.requestDetail}>Prefers {profile.primaryLanguage}</Text></View>
            <View style={styles.requestDetailRow}><Ionicons name="walk-outline" size={16} color={Colors.accent} /><Text style={styles.requestDetail}>{profile.mobilityAndFalls}</Text></View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Accept Anjali's care request"
            style={styles.acceptButton}
            onPress={() => acceptDemoCareRequest('caregiver')}
          >
            <Ionicons name="checkmark" size={19} color={Colors.surface} />
            <Text style={styles.acceptButtonText}>Accept Anjali</Text>
          </Pressable>
          <Text style={styles.acceptHint}>Accepting connects the patient record, care forms, schedule, and messages.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header stays pinned above the scroll area */}
      <View style={styles.header}>
        <MenuButton role="caregiver" />
        <View style={styles.greetingCopy}>
          <Text style={styles.greeting}>{isDemoMode ? `${greeting}, ${assignedCaregiverName.split(' ')[0]}` : greeting}</Text>
          {isDemoMode && <Text style={styles.demoLabel}>DEMO CAREGIVER · MARATHI</Text>}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {isDemoMode && (
          <View style={styles.connectedBanner}>
            <View style={styles.connectedIcon}><Ionicons name="checkmark" size={17} color={Colors.surface} /></View>
            <View style={styles.flex}>
              <Text style={styles.connectedTitle}>Connected with {profile.patientName}</Text>
              <Text style={styles.connectedText}>You can now complete her forms and message her directly.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Message Anjali" style={styles.messageShortcut} onPress={() => router.push('/(caregiver)/messages')}>
              <Ionicons name="chatbubble-outline" size={16} color={Colors.accent} />
            </Pressable>
          </View>
        )}

        {/* Today's client */}
        <View style={styles.clientCard}>
          <View style={styles.clientRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{profile.patientName || 'No patient assigned'}</Text>
              {!!profile.location && <Text style={styles.clientSub}>{profile.location}</Text>}
            </View>
            {hasPatient && <Pressable
              style={[styles.checkInBtn, checkedIn && styles.checkInBtnActive]}
              onPress={() => setCheckedIn(v => !v)}
            >
              <Text style={[styles.checkInText, checkedIn && styles.checkInTextActive]}>
                {checkedIn ? 'Checked in' : 'Check in'}
              </Text>
            </Pressable>}
          </View>

        </View>

        {isDemoMode && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View the patient demo"
            style={styles.roleSwitchRow}
            onPress={() => {
              switchDemoRole('patient');
              router.replace('/(family)');
            }}
          >
            <Text style={styles.roleSwitchText}>See what Anjali sees</Text>
            <Ionicons name="arrow-forward" size={15} color={Colors.accent} />
          </Pressable>
        )}

        <View style={styles.patientRecordCard}>
          <View style={styles.patientRecordCopy}>
            <Text style={styles.patientRecordTitle}>Patient record</Text>
          </View>
          <Pressable style={styles.patientRecordButton} onPress={() => setRecordOpen(true)}>
            <Text style={styles.patientRecordButtonText}>Update record</Text>
          </Pressable>
        </View>

        <View style={styles.checkInCard}>
          <View style={styles.patientRecordCopy}>
            <Text style={styles.patientRecordTitle}>Daily check-in</Text>
            {latestCheckIn && (
              <Text style={styles.patientRecordText}>
                {`Sent at ${fmt(new Date(latestCheckIn.submittedAt))} · ${latestCheckIn.assessment.title}`}
              </Text>
            )}
          </View>
          <Pressable style={styles.patientRecordButton} onPress={() => setQuestionnaireOpen(true)}>
            <Text style={styles.patientRecordButtonText}>{latestCheckIn ? 'Redo' : 'Start'}</Text>
          </Pressable>
        </View>

        {/* Activity log */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Today's updates</Text>
          <Pressable style={styles.logButton} onPress={() => setLogOpen(true)}>
            <Ionicons name="add" size={16} color={Colors.surface} />
            <Text style={styles.logButtonText}>Log update</Text>
          </Pressable>
        </View>

        <View style={styles.updateList}>
          {todayEntries.length === 0 ? (
            <Text style={styles.updateEmpty}>Nothing logged yet.</Text>
          ) : (
            todayEntries.map((entry, idx) => (
              <View key={entry.id}>
                <View style={styles.updateRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.updateTop}>
                      <Text style={styles.updateTitle}>{entry.title}</Text>
                      <Text style={styles.updateTime}>{fmt(new Date(entry.timestamp))}</Text>
                    </View>
                    {entry.detail.length > 0 && <Text style={styles.updateDetail}>{entry.detail}</Text>}
                  </View>
                  <Pressable accessibilityLabel={`Delete update ${entry.title}`} hitSlop={8} onPress={() => removeEntry(entry.id)}>
                    <Ionicons name="trash-outline" size={17} color={Colors.textTertiary} />
                  </Pressable>
                </View>
                {idx < todayEntries.length - 1 && <View style={styles.taskSep} />}
              </View>
            ))
          )}
        </View>

        {/* Caregiver-owned care plan */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionLabel}>Today's care plan</Text>
            {total > 0 && <Text style={styles.itineraryMeta}>{`${done}/${total} complete`}</Text>}
            {planGeneration && (
              <View style={styles.generatedMeta}>
                <Ionicons name="sparkles" size={12} color={Colors.accent} />
                <Text style={styles.generatedMetaText}>
                  {planGeneration.source === 'ai' ? 'Cura AI' : 'Auto-generated'} from daily check-in{planGeneration.edited ? ' · edited' : ''}
                </Text>
              </View>
            )}
          </View>
          <Pressable
            style={styles.editItineraryButton}
            onPress={() => hasQuestionnairePlan ? setItineraryOpen(true) : setQuestionnaireOpen(true)}
          >
            <Ionicons name={hasQuestionnairePlan ? 'create-outline' : 'sparkles'} size={15} color={Colors.accent} />
            <Text style={styles.editItineraryText}>{hasQuestionnairePlan ? 'Edit plan' : 'Generate'}</Text>
          </Pressable>
        </View>

        <View style={styles.taskList}>
          {total > 0 && <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${total ? (done / total) * 100 : 0}%` as any }]} />
          </View>}

          {total === 0 ? (
            <Pressable style={styles.emptyPlan} onPress={() => setQuestionnaireOpen(true)}>
              <View style={styles.emptyPlanIcon}><Ionicons name="sparkles" size={20} color={Colors.accent} /></View>
              <Text style={styles.emptyPlanTitle}>Generate today’s routine</Text>
              <Text style={styles.emptyPlanText}>Complete the daily questionnaire so Cura can create a personalized plan from the answers.</Text>
            </Pressable>
          ) : visibleItinerary.map((item, idx) => (
            <View key={item.id}>
              <Pressable style={styles.taskRow} onPress={() => toggleItineraryItem(item.id)}>
                <Ionicons
                  name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={item.completed ? Colors.accent : Colors.textTertiary}
                />
                <View style={styles.itineraryTime}><Text style={styles.itineraryTimeText}>{item.time}</Text></View>
                <View style={styles.itineraryCopy}>
                  <Text style={[styles.taskTitle, item.completed && styles.taskDone]}>{item.title}</Text>
                  {!!item.notes && <Text style={styles.itineraryNotes} numberOfLines={2}>{item.notes}</Text>}
                </View>
              </Pressable>
              {idx < visibleItinerary.length - 1 && <View style={styles.taskSep} />}
            </View>
          ))}
        </View>

      </ScrollView>
      <PatientRecordModal
        profile={profile}
        visible={recordOpen}
        onClose={() => setRecordOpen(false)}
        onSave={next => {
          updateProfile(next);
          setRecordOpen(false);
        }}
      />
      <LogUpdateModal
        visible={logOpen}
        onClose={() => setLogOpen(false)}
        onPost={(type, title, detail) => {
          addEntry({ type, title, detail, caregiverName });
          setLogOpen(false);
        }}
      />
      <ItineraryEditorModal
        visible={itineraryOpen}
        items={visibleItinerary}
        onClose={() => setItineraryOpen(false)}
        onSave={items => {
          saveItinerary(items);
          setItineraryOpen(false);
        }}
      />
      <DailyQuestionnaireModal
        visible={questionnaireOpen}
        patientName={profile.preferredName || profile.patientName || 'the patient'}
        onClose={() => setQuestionnaireOpen(false)}
        onSubmit={async (answers, notes) => {
          const generatedPlan = await generateCarePlan(profile, answers, notes);
          return submitCheckIn(answers, notes, caregiverName, {
            itinerary: generatedPlan.items,
            source: generatedPlan.source,
            summary: generatedPlan.summary,
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  scroll: { padding: Platform.OS === 'web' ? Spacing.md : 12, paddingTop: Platform.OS === 'web' ? Spacing.sm : 8, gap: Platform.OS === 'web' ? Spacing.md : 12, paddingBottom: Platform.OS === 'web' ? 32 : 24 },

  header: { minHeight: Platform.OS === 'web' ? 56 : 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Platform.OS === 'web' ? Spacing.md : 12 },
  greetingCopy: { flex: 1 },
  greeting: { fontSize: Platform.OS === 'web' ? 22 : 20, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.4 },
  demoLabel: { marginTop: 2, fontSize: 9, fontWeight: '700', color: Colors.accent, letterSpacing: 0.9 },
  requestScreen: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: Platform.OS === 'web' ? Spacing.lg : 16, paddingTop: Platform.OS === 'web' ? 36 : 20, paddingBottom: Platform.OS === 'web' ? 48 : 28 },
  requestEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requestPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  requestEyebrow: { fontSize: 10, fontWeight: '800', color: Colors.accent, letterSpacing: 1 },
  requestTitle: { marginTop: 12, fontSize: Platform.OS === 'web' ? 34 : 30, lineHeight: Platform.OS === 'web' ? 38 : 34, fontWeight: '700', letterSpacing: -0.8, color: Colors.textPrimary },
  requestIntro: { marginTop: 8, fontSize: 15, lineHeight: 22, color: Colors.textSecondary },
  incomingCard: { marginTop: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: Colors.accent, backgroundColor: Colors.surface, padding: Spacing.md, gap: 12 },
  incomingTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  patientAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accentTint },
  patientAvatarText: { fontSize: 15, fontWeight: '800', color: Colors.accent },
  incomingName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  incomingMeta: { marginTop: 2, fontSize: 12, color: Colors.textSecondary },
  pendingBadge: { borderRadius: Radius.pill, backgroundColor: Colors.attention + '18', paddingHorizontal: 8, paddingVertical: 5 },
  pendingText: { fontSize: 8, fontWeight: '800', color: Colors.attention, letterSpacing: 0.6 },
  requestRule: { height: 1, backgroundColor: Colors.border },
  requestSectionLabel: { fontSize: 9, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.8 },
  requestGoal: { fontSize: 14, lineHeight: 20, color: Colors.textPrimary },
  needWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  needChip: { borderRadius: Radius.pill, backgroundColor: Colors.accentTint, paddingHorizontal: 9, paddingVertical: 6 },
  needChipText: { fontSize: 11, fontWeight: '700', color: Colors.accent },
  requestDetailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  requestDetail: { flex: 1, fontSize: 12, lineHeight: 17, color: Colors.textSecondary },
  acceptButton: { marginTop: Spacing.md, minHeight: 52, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.accent },
  acceptButtonText: { fontSize: 16, fontWeight: '800', color: Colors.surface },
  acceptHint: { marginTop: 9, paddingHorizontal: 12, fontSize: 11, lineHeight: 16, textAlign: 'center', color: Colors.textSecondary },
  connectedBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.positive, backgroundColor: Colors.positive + '0F', padding: 12 },
  connectedIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.positive },
  connectedTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  connectedText: { marginTop: 2, fontSize: 11, lineHeight: 15, color: Colors.textSecondary },
  messageShortcut: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  roleSwitchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 5 },
  roleSwitchText: { fontSize: 12, fontWeight: '700', color: Colors.accent },

  clientCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.sm },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  clientName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  clientSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },

  checkInBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.textTertiary,
  },
  checkInBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.accentTint },
  checkInText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  checkInTextActive: { color: Colors.accent },

  patientRecordCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  patientRecordCopy: { flex: 1, gap: 3 },
  patientRecordTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  patientRecordText: { fontSize: 13, lineHeight: 18, color: Colors.textSecondary },
  patientRecordButton: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  patientRecordButtonText: { fontSize: 13, fontWeight: '700', color: Colors.surface },
  checkInCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  sectionLabel: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: Colors.textPrimary },
  itineraryMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  generatedMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  generatedMetaText: { fontSize: 11, fontWeight: '600', color: Colors.accent },
  editItineraryButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.pill, backgroundColor: Colors.accentTint, paddingHorizontal: 11, paddingVertical: 7 },
  editItineraryText: { fontSize: 13, fontWeight: '700', color: Colors.accent },

  taskList: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  emptyPlan: { minHeight: 120, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  emptyPlanIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accentTint, marginBottom: 9 },
  emptyPlanTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  emptyPlanText: { maxWidth: 300, marginTop: 5, fontSize: 12, lineHeight: 17, color: Colors.textSecondary, textAlign: 'center' },
  progressTrack: { height: 3, backgroundColor: Colors.bg, margin: Spacing.md, marginBottom: 0 },
  progressFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },

  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md },
  itineraryTime: { width: 70, paddingTop: 2 },
  itineraryTimeText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  itineraryCopy: { flex: 1 },
  taskTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  itineraryNotes: { fontSize: 12, lineHeight: 17, color: Colors.textSecondary, marginTop: 3 },
  taskDone: { textDecorationLine: 'line-through', color: Colors.textTertiary },
  taskSep: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  recordSafe: { flex: 1, backgroundColor: Colors.bg },
  recordFlex: { flex: 1 },
  recordHeader: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, backgroundColor: Colors.surface },
  recordHeaderAction: { fontSize: 14, fontWeight: '600', color: Colors.accent },
  recordHeaderTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  recordStepCount: { width: 48, textAlign: 'right', fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  recordProgress: { height: 4, backgroundColor: Colors.border },
  recordProgressFill: { height: 4, backgroundColor: Colors.accent },
  recordScroll: { padding: Spacing.lg, paddingBottom: 36 },
  recordStepTitle: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.6, marginBottom: Spacing.lg },
  recordFields: { gap: 17 },
  recordField: { gap: 7 },
  recordLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  recordInput: { minHeight: 96, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, padding: 14, fontSize: 15, lineHeight: 21, color: Colors.textPrimary },
  logButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accent, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  logButtonText: { fontSize: 13, fontWeight: '700', color: Colors.surface },
  updateList: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  updateEmpty: { fontSize: 13, lineHeight: 19, color: Colors.textSecondary, padding: Spacing.md },
  updateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: Spacing.md },
  updateTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  updateTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  updateTime: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  updateDetail: { fontSize: 13, lineHeight: 18, color: Colors.textSecondary, marginTop: 3 },
  typeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 20 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, paddingHorizontal: 11, paddingVertical: 8 },
  typeChipSelected: { borderColor: Colors.accent, backgroundColor: Colors.accent },
  typeChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  typeChipTextSelected: { color: Colors.surface },
  logTitleInput: { minHeight: 48, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },
  recordContinueDisabled: { backgroundColor: Colors.textTertiary },
  recordFooter: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  recordBack: { minWidth: 88, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  recordBackText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  recordContinue: { flex: 1, borderRadius: Radius.lg, backgroundColor: Colors.accent, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  recordContinueText: { fontSize: 15, fontWeight: '700', color: Colors.surface },
});
