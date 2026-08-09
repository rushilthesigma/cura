import type { CareProfile } from '../context/CareProfileContext';
import {
  DAILY_QUESTIONS,
  type CheckInAnswer,
  type ItineraryItem,
} from '../context/DailyCareContext';

const CARE_API_URL = (process.env.EXPO_PUBLIC_CURA_API_URL || 'http://localhost:4001').replace(/\/$/, '');
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeneratedCarePlan {
  items: ItineraryItem[];
  source: 'ai' | 'smart-fallback';
  summary: string;
}

interface GeneratedItem {
  time?: unknown;
  title?: unknown;
  notes?: unknown;
}

interface CarePlanApiResponse {
  items?: GeneratedItem[];
  error?: string;
}

interface GeminiCarePlanResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
}

type PlanTemplate = Pick<ItineraryItem, 'time' | 'title' | 'notes'>;

const DOMAIN_PLANS: Record<string, { changed: PlanTemplate; urgent: PlanTemplate }> = {
  cognition: {
    changed: { time: 'Now', title: 'Recheck alertness and orientation', notes: 'Use a calm voice, compare with the usual baseline, and record any further change.' },
    urgent: { time: 'Now', title: 'Get urgent help for sudden confusion', notes: 'Stay with them, keep the area safe, and follow the urgent guidance shown in the assessment.' },
  },
  breathing: {
    changed: { time: 'Now', title: 'Recheck breathing at rest', notes: 'Pause activity, keep them comfortable, and note whether breathlessness settles or worsens.' },
    urgent: { time: 'Now', title: 'Get emergency help for breathing', notes: 'Do not leave them alone. Follow the urgent guidance shown in the assessment.' },
  },
  pain: {
    changed: { time: 'Now', title: 'Check and document pain', notes: 'Ask where it hurts, what changed, and what makes it better or worse. Use only the existing care plan for relief.' },
    urgent: { time: 'Now', title: 'Get urgent help for severe pain', notes: 'Keep them comfortable and follow the urgent guidance shown in the assessment.' },
  },
  intake: {
    changed: { time: 'Next 30 min', title: 'Offer food and fluids again', notes: 'Offer a small amount they usually enjoy and record roughly how much is taken.' },
    urgent: { time: 'Now', title: 'Get urgent advice for very low intake', notes: 'Do not force food or drink. Follow the urgent guidance shown in the assessment.' },
  },
  medication: {
    changed: { time: 'Now', title: 'Record the missed or refused medicine', notes: 'Check the current medication record and contact a pharmacist or clinician before repeating any dose.' },
    urgent: { time: 'Now', title: 'Get urgent advice about the medicine', notes: 'Do not give another dose unless a clinician or pharmacist tells you to.' },
  },
  mobility: {
    changed: { time: 'Next activity', title: 'Use close mobility support', notes: 'Keep the walking aid nearby, clear trip hazards, and stay within reach during transfers or walking.' },
    urgent: { time: 'Now', title: 'Respond to the fall or loss of mobility', notes: 'Do not move them if injury is suspected. Follow the urgent guidance shown in the assessment.' },
  },
  function: {
    changed: { time: 'Next activity', title: 'Add support for daily activities', notes: 'Allow extra time and assist only as needed with washing, dressing, toileting, eating, or transfers.' },
    urgent: { time: 'Now', title: 'Get urgent advice for sudden loss of function', notes: 'Keep them safe and do not attempt unsupported transfers.' },
  },
  mood: {
    changed: { time: 'Next 30 min', title: 'Use a calm, familiar routine', notes: 'Reduce noise, offer reassurance, and note what happened before the change and what helped.' },
    urgent: { time: 'Now', title: 'Address the immediate safety concern', notes: 'Stay nearby, reduce hazards, and call for urgent help if anyone may be harmed.' },
  },
  sleep: {
    changed: { time: 'This afternoon', title: 'Plan a quieter rest period', notes: 'Keep the daytime routine gentle and observe for increasing drowsiness or difficulty waking.' },
    urgent: { time: 'Now', title: 'Get urgent help for marked drowsiness', notes: 'Stay with them and follow the urgent guidance shown in the assessment.' },
  },
  continence: {
    changed: { time: 'Today', title: 'Track bathroom changes', notes: 'Note frequency, discomfort, accidents, constipation, and fluid intake for the care team.' },
    urgent: { time: 'Now', title: 'Get urgent advice for bathroom symptoms', notes: 'Record the last urine or bowel output and follow the urgent guidance shown in the assessment.' },
  },
  'vision-hearing': {
    changed: { time: 'Next activity', title: 'Adjust communication and surroundings', notes: 'Check glasses or hearing aids, improve lighting, and reduce background noise.' },
    urgent: { time: 'Now', title: 'Get urgent help for sudden sensory loss', notes: 'Keep them safely seated and follow the urgent guidance shown in the assessment.' },
  },
  skin: {
    changed: { time: 'Today', title: 'Protect and recheck the skin area', notes: 'Reduce pressure on the area, keep skin clean and dry, and record any spread or worsening.' },
    urgent: { time: 'Now', title: 'Get clinical advice for the wound', notes: 'Keep pressure off the area and follow the urgent guidance shown in the assessment.' },
  },
};

function idFor(index: number) {
  return `ai-plan-${Date.now()}-${index}`;
}

function sanitizeItems(items: GeneratedItem[]): ItineraryItem[] {
  return items
    .flatMap((item, index) => {
      const time = typeof item.time === 'string' ? item.time.trim() : '';
      const title = typeof item.title === 'string' ? item.title.trim() : '';
      const notes = typeof item.notes === 'string' ? item.notes.trim() : '';
      if (!time || !title) return [];
      return [{ id: idFor(index), time: time.slice(0, 30), title: title.slice(0, 90), notes: notes.slice(0, 240), completed: false }];
    })
    .slice(0, 6);
}

async function generateWithGemini(
  profile: CareProfile,
  answers: Record<string, CheckInAnswer>,
  notes: string,
): Promise<ItineraryItem[]> {
  let directError: unknown;
  if (GEMINI_API_KEY) {
    try {
      return await generateDirectWithGemini(profile, answers, notes);
    } catch (error) {
      directError = error;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18_000);
  try {
    const response = await fetch(`${CARE_API_URL}/api/generate-care-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ profile, answers, notes }),
    });
    const data = await response.json() as CarePlanApiResponse;
    if (!response.ok) throw new Error(data.error || `AI request failed (${response.status}).`);
    const items = sanitizeItems(data.items ?? []);
    if (!items.length) throw new Error('AI returned an empty care plan.');
    return items;
  } catch (error) {
    throw directError ?? error;
  } finally {
    clearTimeout(timer);
  }
}

async function generateDirectWithGemini(
  profile: CareProfile,
  answers: Record<string, CheckInAnswer>,
  notes: string,
): Promise<ItineraryItem[]> {
  if (!GEMINI_API_KEY) throw new Error('Gemini is not configured for Expo Go.');

  const answerLabel: Record<CheckInAnswer, string> = {
    usual: 'No meaningful change from the usual baseline',
    changed: 'A mild or uncertain change was reported',
    urgent: 'An urgent or severe change was reported',
  };
  const questionnaire = DAILY_QUESTIONS
    .map(question => `${question.domain}: ${answerLabel[answers[question.id] ?? 'usual']}`)
    .join('\n');
  const prompt = `Create a practical, person-centred care routine for the rest of today from a caregiver questionnaire.

Person: ${profile.preferredName || profile.patientName || 'Patient'}
Care goals: ${profile.careGoals || 'Support safety, comfort, and usual routines.'}
Relevant medicines: ${profile.medications || 'Not provided'}
Mobility baseline: ${profile.mobilityAndFalls || 'Not provided'}
Nutrition and hydration: ${profile.nutritionAndHydration || 'Not provided'}
Communication: ${profile.communicationNotes || 'Not provided'}
Familiar routines: ${profile.routinesAndComfort || 'Not provided'}

Questionnaire answers:
${questionnaire}

Caregiver notes: ${notes.trim() || 'None'}

Return only JSON in this exact shape:
{"items":[{"time":"Now or a short human-friendly time","title":"Short action","notes":"One clear, person-centred instruction"}]}

Create 3 to 6 ordered actions derived from the questionnaire. Prioritize urgent answers first, then changed answers, medicines, hydration, mobility safety, comfort, and handoff. Do not diagnose, prescribe, change doses, or delay emergency help. If an answer signals immediate danger, make seeking emergency help the first action.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18_000);
  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 1400,
          thinkingConfig: { thinkingLevel: 'minimal' },
        },
      }),
    });
    const data = await response.json() as GeminiCarePlanResponse;
    if (!response.ok) throw new Error(data.error?.message || `Gemini request failed (${response.status}).`);
    const text = data.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('') ?? '';
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned) as { items?: GeneratedItem[] } | GeneratedItem[];
    const items = sanitizeItems(Array.isArray(parsed) ? parsed : parsed.items ?? []);
    if (!items.length) throw new Error('Gemini returned an empty care plan.');
    return items;
  } finally {
    clearTimeout(timer);
  }
}

function baselineItems(profile: CareProfile): PlanTemplate[] {
  const items: PlanTemplate[] = [];
  if (profile.medications.trim()) {
    items.push({ time: 'As scheduled', title: 'Follow the medication plan', notes: 'Use the current medication record. Do not repeat or change a dose without clinical advice.' });
  }
  items.push({
    time: 'Next 2 hours',
    title: 'Support fluids and a familiar routine',
    notes: profile.nutritionAndHydration.trim() || 'Offer a familiar drink and meal or snack, and note how much is taken.',
  });
  if (profile.mobilityAndFalls.trim()) {
    items.push({ time: 'Next activity', title: 'Use usual mobility support', notes: profile.mobilityAndFalls });
  }
  items.push({
    time: 'End of visit',
    title: 'Share a concise care handoff',
    notes: 'Record what was completed and report any new or worsening change to the family or care team.',
  });
  return items;
}

function generateFallback(
  profile: CareProfile,
  answers: Record<string, CheckInAnswer>,
): ItineraryItem[] {
  const urgent: PlanTemplate[] = [];
  const changed: PlanTemplate[] = [];

  for (const question of DAILY_QUESTIONS) {
    const answer = answers[question.id];
    const template = DOMAIN_PLANS[question.id];
    if (answer === 'urgent' && template) urgent.push(template.urgent);
    if (answer === 'changed' && template) changed.push(template.changed);
  }

  const tailored = [...urgent, ...changed];
  const combined = tailored.length
    ? [...tailored, ...baselineItems(profile)]
    : baselineItems(profile);

  return combined.slice(0, 6).map((item, index) => ({
    ...item,
    id: idFor(index),
    completed: false,
  }));
}

export async function generateCarePlan(
  profile: CareProfile,
  answers: Record<string, CheckInAnswer>,
  notes: string,
): Promise<GeneratedCarePlan> {
  try {
    const items = await generateWithGemini(profile, answers, notes);
    return {
      items,
      source: 'ai',
      summary: 'Created by Cura AI from today’s questionnaire and patient record.',
    };
  } catch {
    return {
      items: generateFallback(profile, answers),
      source: 'smart-fallback',
      summary: 'Created from today’s questionnaire using Cura’s safety-aware planning rules.',
    };
  }
}
