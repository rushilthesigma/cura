import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../design/tokens';
import {
  DAILY_QUESTIONS,
  type CheckInAnswer,
  type DailyCheckIn,
} from '../context/DailyCareContext';

const ANSWERS: CheckInAnswer[] = ['usual', 'changed', 'urgent'];

export function DailyQuestionnaireModal({
  visible,
  patientName,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  patientName: string;
  onClose: () => void;
  onSubmit: (answers: Record<string, CheckInAnswer>, notes: string) => Promise<DailyCheckIn>;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, CheckInAnswer>>({});
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<DailyCheckIn | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setStep(0);
    setAnswers({});
    setNotes('');
    setResult(null);
    setIsGenerating(false);
    setSubmitError('');
  }, [visible]);

  const question = DAILY_QUESTIONS[step];
  const selected = question ? answers[question.id] : undefined;
  const isReview = step === DAILY_QUESTIONS.length;
  const progress = isReview ? 100 : ((step + 1) / (DAILY_QUESTIONS.length + 1)) * 100;

  const close = () => {
    setResult(null);
    onClose();
  };

  const submit = async () => {
    setIsGenerating(true);
    setSubmitError('');
    try {
      setResult(await onSubmit(answers, notes));
    } catch {
      setSubmitError('The check-in could not be saved. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (result) {
    const isUrgent = result.assessment.level === 'urgent';
    const isContact = result.assessment.level === 'contact';
    const tint = isUrgent ? Colors.urgent : isContact ? Colors.attention : Colors.positive;
    const icon = isUrgent ? 'warning' : isContact ? 'call' : 'checkmark-circle';
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <SafeAreaView style={styles.resultSafe} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.resultContent}>
            <View style={[styles.resultIcon, { backgroundColor: tint + '18' }]}>
              <Ionicons name={icon} size={34} color={tint} />
            </View>
            <Text style={styles.resultTitle}>{result.assessment.title}</Text>
            <Text style={styles.resultSummary}>{result.assessment.summary}</Text>
            <View style={styles.nextStepCard}>
              <Text style={styles.nextStepLabel}>Next step</Text>
              <Text style={styles.nextStepText}>{result.assessment.nextStep}</Text>
            </View>
            <View style={styles.planReadyCard}>
              <View style={styles.planReadyIcon}><Ionicons name="sparkles" size={18} color={Colors.accent} /></View>
              <View style={styles.planReadyCopy}>
                <Text style={styles.planReadyTitle}>Today’s care plan is ready</Text>
                <Text style={styles.planReadyText}>Cura used this questionnaire and the patient record to create the next actions. You can review or edit them from the home screen.</Text>
              </View>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Pressable style={styles.primaryButton} onPress={close}><Text style={styles.primaryText}>Done</Text></Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.header}>
            <Pressable onPress={close} hitSlop={10}><Text style={styles.headerAction}>Cancel</Text></Pressable>
            <Text style={styles.headerTitle}>Daily check-in</Text>
            <Text style={styles.stepCount}>{isReview ? 'Review' : `${step + 1} of ${DAILY_QUESTIONS.length}`}</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {!isReview && question && (
              <>
                <Text style={styles.domain}>{question.domain}</Text>
                <Text style={styles.question}>{question.prompt}</Text>

                <View style={styles.optionList}>
                  {question.options.map((label, index) => {
                    const value = ANSWERS[index];
                    const active = selected === value;
                    const color = value === 'urgent' ? Colors.urgent : value === 'changed' ? Colors.attention : Colors.positive;
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        style={[styles.option, active && { borderColor: color, backgroundColor: color + '0D' }]}
                        onPress={() => setAnswers(current => ({ ...current, [question.id]: value }))}
                      >
                        <View style={[styles.radio, active && { borderColor: color }]}>{active && <View style={[styles.radioDot, { backgroundColor: color }]} />}</View>
                        <Text style={[styles.optionText, active && { color }]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {isReview && (
              <>
                <Text style={styles.domain}>Review and send</Text>
                <Text style={styles.question}>Anything else to note?</Text>
                <TextInput
                  accessibilityLabel="Additional check-in observations"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional notes"
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  textAlignVertical="top"
                  style={styles.notes}
                />
                <View style={styles.reviewList}>
                  {DAILY_QUESTIONS.map(item => {
                    const answerIndex = ANSWERS.indexOf(answers[item.id]);
                    return (
                      <View key={item.id} style={styles.reviewRow}>
                        <Text style={styles.reviewDomain}>{item.domain}</Text>
                        <Text style={styles.reviewAnswer}>{item.options[answerIndex]}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {step > 0 && <Pressable style={styles.backButton} onPress={() => setStep(current => current - 1)}><Text style={styles.backText}>Back</Text></Pressable>}
            <Pressable
              disabled={isGenerating || (!isReview && !selected)}
              style={[styles.primaryButton, (isGenerating || (!isReview && !selected)) && styles.primaryDisabled]}
              onPress={() => isReview ? submit() : setStep(current => current + 1)}
            >
              {isGenerating ? (
                <View style={styles.generatingRow}>
                  <ActivityIndicator size="small" color={Colors.surface} />
                  <Text style={styles.primaryText}>Creating care plan…</Text>
                </View>
              ) : <Text style={styles.primaryText}>{isReview ? 'Send & generate plan' : 'Continue'}</Text>}
            </Pressable>
          </View>
          {!!submitError && <Text style={styles.submitError}>{submitError}</Text>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, backgroundColor: Colors.surface },
  headerAction: { fontSize: 14, fontWeight: '700', color: Colors.accent },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  stepCount: { width: 58, textAlign: 'right', fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  progressTrack: { height: 4, backgroundColor: Colors.border },
  progressFill: { height: 4, backgroundColor: Colors.accent },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  domain: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  question: { fontSize: 27, lineHeight: 34, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5, marginTop: 9 },
  optionList: { gap: 10, marginTop: 24 },
  option: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface, paddingHorizontal: 15, paddingVertical: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.textTertiary, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  notes: { minHeight: 120, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, padding: 14, fontSize: 15, lineHeight: 21, color: Colors.textPrimary, marginTop: 20 },
  reviewList: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, paddingHorizontal: 14, marginTop: 16 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  reviewDomain: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  reviewAnswer: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  footer: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  backButton: { minWidth: 88, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  backText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  primaryButton: { flex: 1, borderRadius: Radius.lg, backgroundColor: Colors.accent, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  primaryDisabled: { backgroundColor: Colors.textTertiary },
  primaryText: { fontSize: 15, fontWeight: '700', color: Colors.surface },
  generatingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  submitError: { paddingHorizontal: 16, paddingBottom: 10, backgroundColor: Colors.surface, color: Colors.urgent, fontSize: 12, textAlign: 'center' },
  resultSafe: { flex: 1, backgroundColor: Colors.surface },
  resultContent: { flexGrow: 1, alignItems: 'center', padding: 28, paddingTop: 70 },
  resultIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginTop: 24 },
  resultSummary: { fontSize: 15, lineHeight: 22, color: Colors.textSecondary, textAlign: 'center', marginTop: 10 },
  nextStepCard: { width: '100%', borderRadius: Radius.lg, backgroundColor: Colors.bg, padding: 16, marginTop: 26 },
  nextStepLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  nextStepText: { fontSize: 15, lineHeight: 22, color: Colors.textPrimary, marginTop: 7 },
  planReadyCard: { width: '100%', flexDirection: 'row', gap: 12, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.accent + '35', backgroundColor: Colors.accentTint, padding: 15, marginTop: 12 },
  planReadyIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  planReadyCopy: { flex: 1 },
  planReadyTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  planReadyText: { marginTop: 4, fontSize: 12, lineHeight: 17, color: Colors.textSecondary },
});
