import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createDemoDailyCare, createDemoStartingDailyCare } from '../data/demoData';

export type CheckInAnswer = 'usual' | 'changed' | 'urgent';
export type AssessmentLevel = 'monitor' | 'contact' | 'urgent';

export interface ItineraryItem {
  id: string;
  time: string;
  title: string;
  notes: string;
  completed: boolean;
}

export interface DailyQuestion {
  id: string;
  domain: string;
  prompt: string;
  helper: string;
  source: string;
  options: [string, string, string];
}

export interface DailyAssessment {
  level: AssessmentLevel;
  title: string;
  summary: string;
  nextStep: string;
  flaggedQuestionIds: string[];
}

export interface DailyCheckIn {
  id: string;
  submittedAt: string;
  submittedBy: string;
  answers: Record<string, CheckInAnswer>;
  notes: string;
  assessment: DailyAssessment;
}

export interface CarePlanGeneration {
  source: 'ai' | 'smart-fallback';
  summary: string;
  generatedAt: string;
  basedOnCheckInId: string;
  edited: boolean;
}

export interface DailyCareSnapshot {
  dateKey: string;
  itinerary: ItineraryItem[];
  latestCheckIn: DailyCheckIn | null;
  planGeneration: CarePlanGeneration | null;
}

export const DAILY_QUESTIONS: DailyQuestion[] = [
  {
    id: 'cognition',
    domain: 'Alertness & thinking',
    prompt: 'Is there a change from usual alertness, attention, or confusion?',
    helper: 'A sudden change can be delirium and needs prompt medical assessment.',
    source: 'NHS sudden confusion guidance · WHO ICOPE cognition',
    options: ['No change', 'Mild or uncertain change', 'Sudden or severe change'],
  },
  {
    id: 'breathing',
    domain: 'Breathing',
    prompt: 'How is breathing compared with usual?',
    helper: 'Observe breathlessness at rest, difficulty speaking, or blue/grey lips or skin.',
    source: 'NHS breathlessness emergency guidance',
    options: ['As usual', 'More breathless', 'Severe trouble breathing'],
  },
  {
    id: 'pain',
    domain: 'Pain',
    prompt: 'Is there new or worsening pain?',
    helper: 'For a person who cannot describe pain, note guarding, grimacing, or unusual distress.',
    source: 'WHO ICOPE person-centred assessment',
    options: ['None or usual', 'New or worse pain', 'Severe or sudden pain'],
  },
  {
    id: 'intake',
    domain: 'Food & fluids',
    prompt: 'How much did they eat and drink compared with their usual?',
    helper: 'A meaningful drop from the person’s own baseline can signal illness or dehydration risk.',
    source: 'WHO ICOPE vitality and nutrition',
    options: ['Usual amount', 'Less than usual', 'Very little or unable'],
  },
  {
    id: 'medication',
    domain: 'Medicines',
    prompt: 'Were medicines taken according to the current care plan?',
    helper: 'Record refusals or missed doses; do not repeat a dose without pharmacist or clinician advice.',
    source: 'WHO medication safety guidance',
    options: ['Taken as planned', 'Missed or refused', 'Possible reaction or error'],
  },
  {
    id: 'mobility',
    domain: 'Mobility & falls',
    prompt: 'Was there a fall, near-fall, or change in steadiness?',
    helper: 'A fall or new unsteadiness warrants follow-up even when there is no obvious injury.',
    source: 'CDC STEADI three key questions',
    options: ['No change or fall', 'More unsteady or near-fall', 'Fall, injury, or cannot stand'],
  },
  {
    id: 'function',
    domain: 'Daily function',
    prompt: 'Did they need more help than usual with washing, dressing, toileting, eating, or transfers?',
    helper: 'A new loss of function is important clinical context and should be compared with baseline.',
    source: 'WHO ICOPE functional ability',
    options: ['Usual support', 'Some extra help', 'Sudden major loss'],
  },
  {
    id: 'mood',
    domain: 'Mood & behavior',
    prompt: 'Was mood or behavior different from usual?',
    helper: 'Record what changed, what happened before it, and what helped.',
    source: 'WHO ICOPE psychological capacity',
    options: ['As usual', 'Noticeable change', 'Immediate safety concern'],
  },
  {
    id: 'sleep',
    domain: 'Sleep & wakefulness',
    prompt: 'Was sleep or daytime wakefulness different from usual?',
    helper: 'Marked drowsiness or difficulty waking can be an urgent change.',
    source: 'NIA delirium risk guidance',
    options: ['As usual', 'Sleep was disrupted', 'Very drowsy or hard to wake'],
  },
  {
    id: 'continence',
    domain: 'Bathroom habits',
    prompt: 'Was there a change in urination or bowel habits, such as pain, frequency, accidents, or constipation?',
    helper: 'New urinary symptoms are a common, treatable cause of sudden confusion in older adults.',
    source: 'CDC UTI in older adults guidance · WHO ICOPE continence',
    options: ['No change', 'Mild change', 'Painful, blood, or no output'],
  },
  {
    id: 'vision-hearing',
    domain: 'Vision & hearing',
    prompt: 'Did vision or hearing seem worse than usual today?',
    helper: 'Sudden sensory loss needs prompt attention; gradual decline should still be tracked over time.',
    source: 'WHO ICOPE sensory screening',
    options: ['As usual', 'Somewhat worse', 'Sudden or severe loss'],
  },
  {
    id: 'skin',
    domain: 'Skin & pressure areas',
    prompt: 'Did you notice new skin redness, bruising, or a sore, especially on the heels, hips, or lower back?',
    helper: 'Pressure injuries can develop quickly with reduced mobility and are easier to treat early.',
    source: 'NPUAP/EPUAP pressure injury prevention guidance',
    options: ['No new skin issues', 'New redness or bruise', 'Open sore or wound'],
  },
];

const STORAGE_KEY = '@cura/daily-care/v2';
const dateKey = () => new Date().toISOString().slice(0, 10);

function assess(answers: Record<string, CheckInAnswer>): DailyAssessment {
  const urgent = Object.entries(answers).filter(([, answer]) => answer === 'urgent').map(([id]) => id);
  const changed = Object.entries(answers).filter(([, answer]) => answer === 'changed').map(([id]) => id);

  if (urgent.length > 0) {
    return {
      level: 'urgent',
      title: 'Urgent change reported',
      summary: `${urgent.length} response${urgent.length === 1 ? '' : 's'} may need urgent assessment.`,
      nextStep: 'Call emergency services now if they are in immediate danger, hard to wake, severely short of breath, or seriously injured. Otherwise get urgent clinical advice now.',
      flaggedQuestionIds: urgent,
    };
  }

  if (changed.length > 0) {
    return {
      level: 'contact',
      title: 'Slightly elevated risk',
      summary: `${changed.length} mild change${changed.length === 1 ? '' : 's'} from the usual baseline to review.`,
      nextStep: 'Share this check-in with the care team today, especially if the change is new or worsening.',
      flaggedQuestionIds: changed,
    };
  }

  return {
    level: 'monitor',
    title: 'No new concerns reported',
    summary: 'All answers match the usual baseline.',
    nextStep: 'Check in again tomorrow, or sooner if anything changes.',
    flaggedQuestionIds: [],
  };
}

interface StoredDailyCare extends DailyCareSnapshot {}

interface DailyCareValue extends DailyCareSnapshot {
  isReady: boolean;
  saveItinerary: (items: ItineraryItem[]) => void;
  toggleItineraryItem: (id: string) => void;
  submitCheckIn: (
    answers: Record<string, CheckInAnswer>,
    notes: string,
    submittedBy: string,
    generatedPlan?: Pick<DailyCareSnapshot, 'itinerary'> & Pick<CarePlanGeneration, 'source' | 'summary'>,
  ) => DailyCheckIn;
  loadDemoDailyCare: () => void;
  resetDemoDailyCare: () => void;
}

const DailyCareContext = createContext<DailyCareValue | null>(null);

export function DailyCareProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<DailyCareSnapshot>({ dateKey: dateKey(), itinerary: [], latestCheckIn: null, planGeneration: null });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => {
        if (!mounted || !value) return;
        const stored = JSON.parse(value) as Partial<StoredDailyCare>;
        if (stored.dateKey === dateKey() && Array.isArray(stored.itinerary)) {
          setSnapshot({
            dateKey: stored.dateKey,
            itinerary: stored.itinerary,
            latestCheckIn: stored.latestCheckIn ?? null,
            planGeneration: stored.planGeneration ?? null,
          });
        }
      })
      .catch(() => {})
      .finally(() => mounted && setIsReady(true));
    return () => { mounted = false; };
  }, []);

  const persist = (next: DailyCareSnapshot) => {
    setSnapshot(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const value = useMemo<DailyCareValue>(() => ({
    ...snapshot,
    isReady,
    saveItinerary: itinerary => persist({
      ...snapshot,
      itinerary,
      planGeneration: snapshot.planGeneration ? { ...snapshot.planGeneration, edited: true } : null,
    }),
    toggleItineraryItem: id => persist({
      ...snapshot,
      itinerary: snapshot.itinerary.map(item => item.id === id ? { ...item, completed: !item.completed } : item),
    }),
    submitCheckIn: (answers, notes, submittedBy, generatedPlan) => {
      const checkIn: DailyCheckIn = {
        id: `check-in-${Date.now()}`,
        submittedAt: new Date().toISOString(),
        submittedBy,
        answers,
        notes: notes.trim(),
        assessment: assess(answers),
      };
      persist({
        ...snapshot,
        latestCheckIn: checkIn,
        itinerary: generatedPlan?.itinerary ?? snapshot.itinerary,
        planGeneration: generatedPlan ? {
          source: generatedPlan.source,
          summary: generatedPlan.summary,
          generatedAt: new Date().toISOString(),
          basedOnCheckInId: checkIn.id,
          edited: false,
        } : snapshot.planGeneration,
      });
      return checkIn;
    },
    loadDemoDailyCare: () => persist(createDemoDailyCare()),
    resetDemoDailyCare: () => persist(createDemoStartingDailyCare()),
  }), [snapshot, isReady]);

  return <DailyCareContext.Provider value={value}>{children}</DailyCareContext.Provider>;
}

export function useDailyCare() {
  const value = useContext(DailyCareContext);
  if (!value) throw new Error('useDailyCare must be used inside DailyCareProvider');
  return value;
}
