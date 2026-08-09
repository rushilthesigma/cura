import type { CareProfile } from '../context/CareProfileContext';
import type { ActivityEntry } from '../context/ActivityLogContext';
import { DAILY_QUESTIONS, type DailyCareSnapshot } from '../context/DailyCareContext';
import { researchNearbyCare } from './careSearch';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

export type AgentRoute = '/(family)' | '/(family)/messages' | '/(family)/hire';

export interface AgentSource {
  label: string;
  detail: string;
  route?: AgentRoute;
}

export interface CarePlace {
  name: string;
  kind: string;
  distance: string;
  address: string;
  availability: string;
  sourceUrl?: string;
}

export interface AgentPost extends ActivityEntry {
  isSavedPost: true;
}

export type AgentRunEventStatus = 'running' | 'complete' | 'error';

export interface AgentRunEvent {
  id: string;
  label: string;
  detail?: string;
  status: AgentRunEventStatus;
}

export interface AgentRunSummary {
  durationMs: number;
  events: AgentRunEvent[];
}

export interface AgentRunOptions {
  onEvent?: (event: AgentRunEvent) => void;
}

export interface AgentResponse {
  text: string;
  sources: AgentSource[];
  engine?: typeof GEMINI_MODEL | 'local';
  notice?: string;
  reasoningSummary?: string[];
  run?: AgentRunSummary;
  posts?: AgentPost[];
  places?: CarePlace[];
  actions?: Array<{ label: string; route: AgentRoute }>;
  followUps?: string[];
}

export interface AgentConversationMessage {
  role: 'user' | 'assistant';
  text: string;
}

type Topic =
  | 'emergency'
  | 'places'
  | 'caregivers'
  | 'messages'
  | 'hydration'
  | 'meals'
  | 'mood'
  | 'mobility'
  | 'medication'
  | 'schedule'
  | 'profile'
  | 'checkin'
  | 'posts'
  | 'overall';

function includesAny(query: string, terms: string[]) {
  return terms.some(term => query.includes(term));
}

function topicFor(raw: string): Topic {
  const query = raw.toLowerCase();
  if (includesAny(query, ['emergency', 'ambulance', 'not breathing', 'chest pain', 'unconscious', 'stroke', 'fell', 'fall'])) return 'emergency';
  if (includesAny(query, ['check-in', 'check in', 'questionnaire', 'screening', 'assessment', 'anything needed', 'need attention'])) return 'checkin';
  if (includesAny(query, ['post', 'updates', 'activity feed', 'care feed', 'care log', 'what happened', 'latest from the caregiver'])) return 'posts';
  if (includesAny(query, ['find care', 'care center', 'care centre', 'care near', 'near me', 'nearby', 'location', 'facility', 'respite', 'day care', 'home care', 'in-home care'])) return 'places';
  if (includesAny(query, ['caregiver', 'carer', 'hire', 'book care'])) return 'caregivers';
  if (includesAny(query, ['message', 'chat', 'conversation', 'what did', 'say', 'said'])) return 'messages';
  if (includesAny(query, ['drink', 'water', 'fluid', 'hydrat', 'chai', 'coconut'])) return 'hydration';
  if (includesAny(query, ['eat', 'food', 'meal', 'appetite', 'breakfast', 'lunch', 'dinner'])) return 'meals';
  if (includesAny(query, ['mood', 'calm', 'anxious', 'agitat', 'upset', 'behav'])) return 'mood';
  if (includesAny(query, ['walk', 'mobility', 'walker', 'exercise', 'balance'])) return 'mobility';
  if (includesAny(query, ['medic', 'pill', 'dose', 'blood pressure', 'allerg'])) return 'medication';
  if (includesAny(query, ['visit', 'schedule', 'tomorrow', 'booking', 'next'])) return 'schedule';
  if (includesAny(query, ['remember', 'know about', 'patient record', 'profile', 'diagnosis', 'condition'])) return 'profile';
  return 'overall';
}

const POST_TOPIC_TYPES: Partial<Record<Topic, ActivityEntry['type'][]>> = {
  hydration: ['hydration'],
  meals: ['meal'],
  mood: ['mood'],
  mobility: ['mobility'],
  medication: ['medication'],
};

const POST_STOP_WORDS = new Set([
  'about', 'anything', 'care', 'caregiver', 'could', 'from', 'have', 'latest', 'patient',
  'please', 'posts', 'show', 'tell', 'that', 'their', 'there', 'these', 'today', 'updates',
  'what', 'when', 'where', 'which', 'with', 'would',
]);

function allCarePosts(activityEntries: ActivityEntry[]): AgentPost[] {
  return activityEntries
    .map(entry => ({ ...entry, isSavedPost: true as const }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function searchCarePosts(raw: string, activityEntries: ActivityEntry[] = []): AgentPost[] {
  const query = raw.toLowerCase();
  const topic = topicFor(raw);
  const posts = allCarePosts(activityEntries);
  const topicTypes = POST_TOPIC_TYPES[topic];
  if (topicTypes) return posts.filter(post => topicTypes.includes(post.type)).slice(0, 5);

  const tokens = query
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !POST_STOP_WORDS.has(token));

  if (topic === 'posts' && tokens.length === 0) return posts.slice(0, 5);

  const ranked = posts
    .map(post => {
      const title = post.title.toLowerCase();
      const detail = post.detail.toLowerCase();
      const caregiver = post.caregiverName.toLowerCase();
      const type = post.type.toLowerCase();
      const score = tokens.reduce((total, token) => total
        + (title.includes(token) ? 4 : 0)
        + (type.includes(token) ? 4 : 0)
        + (caregiver.includes(token) ? 3 : 0)
        + (detail.includes(token) ? 1 : 0), 0);
      return { post, score };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.post.timestamp).getTime() - new Date(a.post.timestamp).getTime());

  if (ranked.length > 0) return ranked.slice(0, 5).map(result => result.post);
  if (topic === 'posts' || topic === 'overall') return posts.slice(0, 5);
  return [];
}

function patientName(profile?: CareProfile) {
  return profile?.preferredName || profile?.patientName || 'the patient';
}

export function getAgentSteps(raw: string, profile?: CareProfile): string[] {
  const topic = topicFor(raw);
  const patient = patientName(profile);
  const finalChecks = ['Checking safety and uncertainty', 'Preparing a grounded answer'];
  if (topic === 'places') return ['Understanding the care request', `Reading ${patient}’s saved needs and home area`, 'Researching grounded local options', ...finalChecks];
  if (topic === 'emergency') return ['Checking for urgent risk', 'Identifying the safest immediate action'];
  return ['Understanding the question', `Reading ${patient}’s saved patient record`, 'Checking available care observations', ...finalChecks];
}

function dailyCheckInResponse(dailyCare: DailyCareSnapshot, patient: string): AgentResponse | null {
  const report = dailyCare.latestCheckIn;
  if (!report) return null;
  const flaggedDomains = report.assessment.flaggedQuestionIds
    .map(id => DAILY_QUESTIONS.find(question => question.id === id)?.domain)
    .filter(Boolean);
  const detail = flaggedDomains.length ? flaggedDomains.join(' · ') : 'All answers matched the usual baseline';
  return {
    text: `${report.assessment.title} for ${patient}.\n\n${report.assessment.summary}\n\nRecommended next step: ${report.assessment.nextStep}${report.notes ? `\n\nCaregiver note: ${report.notes}` : ''}\n\nThis is a preliminary safety assessment of reported changes, not a diagnosis.`,
    sources: [{ label: 'Today’s caregiver check-in', detail, route: '/(family)' }],
    followUps: ['What should I tell the care team?', 'What warning signs need urgent action?'],
  };
}

function savedRecordResponse(profile: CareProfile): AgentResponse {
  const patient = patientName(profile);
  const details = [
    profile.careGoals && `Care goals: ${profile.careGoals}`,
    profile.medicalConditions && `Health: ${profile.medicalConditions}`,
    profile.medications && `Medicines: ${profile.medications}`,
    profile.dailyActivities && `Daily support: ${profile.dailyActivities}`,
    profile.mobilityAndFalls && `Safety: ${profile.mobilityAndFalls}`,
    profile.communicationNotes && `Communication: ${profile.communicationNotes}`,
    profile.routinesAndComfort && `Comfort and routines: ${profile.routinesAndComfort}`,
  ].filter(Boolean);
  return {
    text: details.length
      ? `Here’s what is saved for ${patient}:\n\n${details.join('\n\n')}`
      : `Only ${patient}’s basic onboarding details are saved so far. Add verified care details before relying on personalized guidance.`,
    sources: [{
      label: `${patient}’s saved patient record`,
      detail: profile.lastReviewedAt ? `Last reviewed ${new Date(profile.lastReviewedAt).toLocaleDateString('en-IN')}` : 'Not reviewed yet',
      route: '/(family)',
    }],
    followUps: ['What care details should I add?', 'Find care nearby'],
  };
}

function buildAgentResponse(raw: string, profile?: CareProfile, dailyCare?: DailyCareSnapshot): AgentResponse {
  const topic = topicFor(raw);
  const patient = patientName(profile);

  if (topic === 'emergency') {
    return {
      text: `This may be an emergency. Call local emergency services now if ${patient} is in immediate danger, is not breathing, has chest pain, or may be having a stroke. Once they are safe, contact their care team.`,
      sources: [{ label: 'Emergency guidance', detail: 'Immediate safety takes priority over app guidance.' }],
      actions: [{ label: 'Open messages', route: '/(family)/messages' }],
    };
  }

  if (!profile?.patientName.trim()) {
    return {
      text: 'There is no patient record to use yet. Complete onboarding first so I can answer from real care needs and saved details without inventing information.',
      sources: [],
      followUps: ['What information should a care profile include?'],
    };
  }

  if (dailyCare?.latestCheckIn && (topic === 'checkin' || topic === 'overall')) {
    return dailyCheckInResponse(dailyCare, patient)!;
  }

  if (topic === 'checkin') {
    return {
      text: 'No caregiver daily check-in has been submitted today. Once one is sent, I can summarize the reported changes and recommended next step.',
      sources: [{ label: 'Today’s caregiver check-in', detail: 'Not submitted yet', route: '/(family)' }],
      followUps: ['What do you remember about the patient?'],
    };
  }

  if (topic === 'places' || topic === 'caregivers') {
    return {
      text: `I can research current care listings around ${profile.location || 'the saved home area'} using ${patient}’s real care priorities. Cura will show grounded sources instead of invented matches.`,
      sources: [{ label: 'Saved care priorities', detail: profile.careNeeds.join(' · ') || 'Not specified', route: '/(family)' }],
      actions: [{ label: 'Open Find Care', route: '/(family)/hire' }],
    };
  }

  if (topic === 'messages') {
    return {
      text: 'There are no caregiver messages recorded yet. When a real conversation starts, it will appear in Messages.',
      sources: [{ label: 'Messages', detail: 'No conversations yet', route: '/(family)/messages' }],
      actions: [{ label: 'Open messages', route: '/(family)/messages' }],
    };
  }

  if (topic === 'schedule') {
    return {
      text: 'There are no confirmed visits recorded yet. Cura will not create a visit or caregiver name until one is actually assigned.',
      sources: [],
      followUps: ['Find care nearby'],
    };
  }

  if (topic === 'profile') return savedRecordResponse(profile);

  if (topic === 'medication') {
    const recorded = [profile.medications, profile.allergies].filter(value => value.trim());
    return {
      text: recorded.length
        ? `${patient}’s saved record says:\n\nMedicines: ${profile.medications || 'Not recorded'}\n\nAllergies: ${profile.allergies || 'Not recorded'}\n\nA clinician or pharmacist should confirm any medication change or missed-dose advice.`
        : `No medicines or allergies have been recorded for ${patient} yet. Add verified details to the patient record first.`,
      sources: recorded.length ? [{ label: 'Saved medicines and allergies', detail: recorded.join(' · '), route: '/(family)' }] : [],
    };
  }

  if (topic === 'mood') {
    const recorded = [profile.cognitionAndMood, profile.communicationNotes, profile.routinesAndComfort].filter(value => value.trim());
    return {
      text: recorded.length ? `${patient}’s saved mood and communication record says:\n\n${recorded.join('\n\n')}` : `No mood, communication, or comfort details have been recorded for ${patient} yet.`,
      sources: recorded.length ? [{ label: 'Saved patient record', detail: recorded.join(' · '), route: '/(family)' }] : [],
    };
  }

  if (topic === 'mobility') {
    return {
      text: profile.mobilityAndFalls ? `${patient}’s saved mobility and safety record says: ${profile.mobilityAndFalls}\n\nRecord any new fall or change in steadiness and share it with the care team.` : `No mobility or fall history has been recorded for ${patient} yet.`,
      sources: profile.mobilityAndFalls ? [{ label: 'Saved mobility and fall history', detail: profile.mobilityAndFalls, route: '/(family)' }] : [],
    };
  }

  return {
    text: `I won’t assume a care history for ${patient}. The saved profile currently includes ${profile.careNeeds.join(', ').toLowerCase() || 'basic onboarding details'}, and new caregiver check-ins will add current observations. What would you like to plan or understand?`,
    sources: [{ label: `${patient}’s saved care profile`, detail: `${profile.relationship}${profile.location ? ` · ${profile.location}` : ''}`, route: '/(family)' }],
    followUps: ['What do you remember about the patient?', 'Find care nearby'],
  };
}

function postSearchResponse(posts: AgentPost[], profile?: CareProfile): AgentResponse {
  const patient = patientName(profile);
  if (posts.length === 0) {
    return {
      text: `I searched ${patient}’s activity feed, but there are no matching caregiver posts yet. As caregivers log meals, hydration, medication, mobility, mood, and notes, I’ll be able to retrieve the original updates here.`,
      sources: [{ label: 'Caregiver activity feed', detail: 'No matching posts', route: '/(family)' }],
      actions: [{ label: 'Open activity feed', route: '/(family)' }],
      followUps: ['Show the latest care posts', 'Show hydration posts'],
    };
  }

  const newest = posts[0];
  return {
    text: `I found ${posts.length} matching care ${posts.length === 1 ? 'post' : 'posts'} for ${patient}. The newest is “${newest.title}” from ${newest.caregiverName}. I pulled up the original posts below.`,
    sources: [{ label: 'Caregiver activity feed', detail: `${posts.length} matching ${posts.length === 1 ? 'post' : 'posts'}`, route: '/(family)' }],
    posts,
    actions: [{ label: 'Open activity feed', route: '/(family)' }],
    followUps: ['Summarize these updates', 'Only show hydration posts'],
  };
}

export function getLocalAgentResponse(
  raw: string,
  profile?: CareProfile,
  dailyCare?: DailyCareSnapshot,
  activityEntries: ActivityEntry[] = [],
  preparedPosts?: AgentPost[],
): AgentResponse {
  const topic = topicFor(raw);
  const relevantPosts = preparedPosts ?? searchCarePosts(raw, activityEntries);
  let response = buildAgentResponse(raw, profile, dailyCare);

  if (topic === 'posts' || topic in POST_TOPIC_TYPES) {
    response = postSearchResponse(relevantPosts, profile);
  } else if (relevantPosts.length > 0 && (topic === 'overall' || topic === 'messages')) {
    const newest = relevantPosts[0];
    response = {
      ...response,
      text: `The latest matching care post is “${newest.title}” from ${newest.caregiverName}: ${newest.detail}\n\n${response.text}`,
      sources: [
        { label: 'Caregiver activity feed', detail: `${relevantPosts.length} relevant ${relevantPosts.length === 1 ? 'post' : 'posts'}`, route: '/(family)' },
        ...response.sources,
      ],
      posts: relevantPosts,
    };
  }

  const patient = patientName(profile);
  return {
    ...response,
    reasoningSummary: [
      profile ? `Used ${patient}’s saved patient record.` : 'No patient record was available.',
      response.sources.length > 0 ? `Cross-checked ${response.sources.length} available source${response.sources.length === 1 ? '' : 's'}.` : 'No supporting record was available.',
      'Did not fill missing records with sample data.',
    ],
  };
}

interface GeminiInteractionResponse {
  status?: string;
  steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  error?: { message?: string };
}

const CURA_SYSTEM_INSTRUCTION = [
  'You are Cura, a decisive, compassionate family-care assistant.',
  'Use only the supplied patient record and app context as patient-specific facts.',
  'Never invent patient history, caregivers, visits, messages, providers, diagnoses, medicines, or observations.',
  'Lead with a clear, tailored recommendation and concrete next steps.',
  'For possible immediate danger, tell the user to contact local emergency services now.',
  'Do not diagnose, prescribe, or change medication doses.',
  'Keep most answers between 150 and 350 words.',
  'Return readable plain text with short paragraphs or numbered steps. Do not use Markdown syntax.',
].join('\n');

function recentConversation(messages: AgentConversationMessage[]): string {
  if (!messages.length) return 'No earlier messages in this chat.';
  return messages.slice(-8).map(message => `${message.role === 'user' ? 'User' : 'Cura'}: ${message.text}`).join('\n');
}

function interactionText(data: GeminiInteractionResponse): string {
  return data.steps
    ?.filter(step => step.type === 'model_output')
    .flatMap(step => step.content ?? [])
    .filter(part => part.type === 'text')
    .map(part => part.text ?? '')
    .join('')
    .trim() ?? '';
}

function profileContext(profile?: CareProfile, dailyCare?: DailyCareSnapshot, activityEntries: ActivityEntry[] = []): string {
  if (!profile?.patientName.trim()) return 'No patient record has been created.';
  const dailyContext = dailyCare?.latestCheckIn
    ? `Latest caregiver check-in: ${dailyCare.latestCheckIn.assessment.title}. ${dailyCare.latestCheckIn.assessment.summary}. Caregiver notes: ${dailyCare.latestCheckIn.notes || 'None'}`
    : 'Latest caregiver check-in: Not submitted today';
  return [
    `Patient: ${patientName(profile)}`,
    `Relationship to user: ${profile.relationship || 'Not specified'}`,
    `Location: ${profile.location || 'Not specified'}`,
    `Care needs: ${profile.careNeeds.join(', ') || 'Not specified'}`,
    `Care goals: ${profile.careGoals || 'Not recorded'}`,
    `Medical conditions: ${profile.medicalConditions || 'Not recorded'}`,
    `Medications: ${profile.medications || 'Not recorded'}`,
    `Allergies: ${profile.allergies || 'Not recorded'}`,
    `Daily activities: ${profile.dailyActivities || 'Not recorded'}`,
    `Mobility and falls: ${profile.mobilityAndFalls || 'Not recorded'}`,
    `Cognition and mood: ${profile.cognitionAndMood || 'Not recorded'}`,
    `Communication: ${profile.communicationNotes || 'Not recorded'}`,
    `Routines and comfort: ${profile.routinesAndComfort || 'Not recorded'}`,
    `Caregiver posts: ${allCarePosts(activityEntries).map(post => `${post.caregiverName} — ${post.title}: ${post.detail}`).join(' | ') || 'None recorded'}`,
    dailyContext,
  ].join('\n');
}

async function getLiveCareResponse(profile?: CareProfile): Promise<AgentResponse> {
  if (!profile?.location.trim()) {
    return {
      text: 'Add the patient’s location before searching for nearby care. Cura will not substitute a sample address.',
      sources: [],
      followUps: ['What should I include in the care profile?'],
    };
  }
  try {
    const results = await researchNearbyCare(profile);
    return {
      text: `I researched current care listings around ${profile.location} and found ${results.length} grounded options. Open each source to confirm fit, pricing, eligibility, and availability directly with the provider.`,
      sources: [
        { label: 'Search area', detail: profile.location },
        { label: 'Research method', detail: 'Gemini with grounded Google Maps or web results' },
      ],
      reasoningSummary: [
        `Used ${patientName(profile)}’s saved home area and care priorities.`,
        'Kept only options backed by a grounded source URL.',
        'Did not infer pricing, credentials, distance, or availability.',
      ],
      places: results.map(result => ({
        name: result.name,
        kind: result.kind,
        distance: result.sourceType,
        address: result.address,
        availability: result.summary,
        sourceUrl: result.sourceUrl,
      })),
      actions: [{ label: 'Explore all live options', route: '/(family)/hire' }],
    };
  } catch (error) {
    return {
      text: `I couldn’t complete live research around ${profile.location} right now. ${error instanceof Error ? error.message : 'Please try again.'}`,
      sources: [{ label: 'Search area', detail: profile.location }],
      actions: [{ label: 'Try Find Care', route: '/(family)/hire' }],
    };
  }
}

export async function getAgentResponse(
  raw: string,
  profile?: CareProfile,
  conversation: AgentConversationMessage[] = [],
  dailyCare?: DailyCareSnapshot,
  activityEntries: ActivityEntry[] = [],
  options: AgentRunOptions = {},
): Promise<AgentResponse> {
  const startedAt = Date.now();
  const events: AgentRunEvent[] = [];
  const topic = topicFor(raw);
  const report = (event: AgentRunEvent) => {
    const index = events.findIndex(item => item.id === event.id);
    if (index >= 0) events[index] = event;
    else events.push(event);
    options.onEvent?.(event);
  };
  const letUiPaint = () => new Promise(resolve => setTimeout(resolve, 90));
  const runTool = async <T,>(
    id: string,
    label: string,
    work: () => T | Promise<T>,
    describe: (result: T) => string,
  ): Promise<T> => {
    report({ id, label, status: 'running' });
    await letUiPaint();
    try {
      const result = await work();
      report({ id, label, detail: describe(result), status: 'complete' });
      return result;
    } catch (error) {
      report({ id, label, detail: error instanceof Error ? error.message : 'Tool failed', status: 'error' });
      throw error;
    }
  };
  const withRun = (response: AgentResponse): AgentResponse => ({
    ...response,
    run: { durationMs: Math.max(1, Date.now() - startedAt), events: [...events] },
  });

  await runTool(
    'understand-request',
    'Understanding your request',
    () => topic,
    result => `Planned a ${result === 'posts' ? 'care-post search' : `${result} lookup`}`,
  );

  if (profile?.patientName.trim() && !['emergency', 'messages', 'schedule', 'posts'].includes(topic)) {
    await runTool(
      'read-memory',
      `Reading ${patientName(profile)}’s memory`,
      () => profile,
      result => `${result.careNeeds.length} care priorities and saved safety context`,
    );
  }

  const searchesPosts = topic === 'posts' || topic === 'overall' || topic === 'messages' || topic in POST_TOPIC_TYPES;
  const relevantPosts = searchesPosts
    ? await runTool(
      'search-posts',
      'Searching caregiver posts',
      () => searchCarePosts(raw, activityEntries),
      result => `Searched ${activityEntries.length} posts · found ${result.length}`,
    )
    : [];

  if (topic === 'checkin' || topic === 'overall') {
    await runTool(
      'read-check-in',
      'Checking today’s care check-in',
      () => dailyCare?.latestCheckIn ?? null,
      result => result ? result.assessment.title : 'No check-in submitted today',
    );
  }

  if (topic === 'schedule') {
    await runTool(
      'read-schedule',
      'Checking the care schedule',
      () => dailyCare?.itinerary ?? [],
      result => `${result.length} itinerary ${result.length === 1 ? 'item' : 'items'} available`,
    );
  }

  if (topic === 'messages') {
    report({ id: 'search-messages', label: 'Checking caregiver conversations', detail: 'No saved conversation source is available yet', status: 'complete' });
  }

  if (topic === 'places') {
    const liveResponse = await runTool(
      'research-care',
      'Researching nearby care options',
      () => getLiveCareResponse(profile),
      result => `${result.places?.length ?? 0} grounded options found`,
    );
    report({ id: 'prepare-answer', label: 'Preparing a grounded answer', detail: 'Ready', status: 'complete' });
    return withRun(liveResponse);
  }

  const localResponse = getLocalAgentResponse(raw, profile, dailyCare, activityEntries, relevantPosts);
  if (!GEMINI_API_KEY) {
    report({ id: 'prepare-answer', label: 'Preparing a grounded answer', detail: 'Used Cura’s on-device records', status: 'complete' });
    return withRun({ ...localResponse, engine: 'local', notice: 'Gemini 3.6 Flash is not configured, so this answer is limited to Cura’s saved records.' });
  }

  try {
    report({ id: 'reason-over-results', label: 'Reasoning over the retrieved records', status: 'running' });
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        system_instruction: CURA_SYSTEM_INSTRUCTION,
        input: [
          'PATIENT RECORD AND APP CONTEXT',
          profileContext(profile, dailyCare, activityEntries),
          '',
          'APP RECORD SUMMARY',
          localResponse.text,
          '',
          'RECENT CONVERSATION',
          recentConversation(conversation),
          '',
          'CURRENT USER QUESTION',
          raw,
        ].join('\n'),
        store: false,
        generation_config: { thinking_level: 'medium', max_output_tokens: 2000 },
      }),
    });
    const data = await response.json() as GeminiInteractionResponse;
    if (!response.ok) throw new Error(data.error?.message || `Gemini request failed (${response.status})`);
    const text = interactionText(data);
    if (!text) throw new Error('Gemini returned no answer.');
    report({ id: 'reason-over-results', label: 'Reasoning over the retrieved records', detail: 'Grounded response composed', status: 'complete' });
    report({ id: 'prepare-answer', label: 'Checking safety and uncertainty', detail: 'Ready', status: 'complete' });
    return withRun({ ...localResponse, text: text.replace(/^\s*[-*]\s+/gm, '• ').replace(/\*\*/g, '').trim(), engine: GEMINI_MODEL });
  } catch (error) {
    console.warn('Ask Cura Gemini request failed; using the local care assistant.', error);
    report({ id: 'reason-over-results', label: 'Reasoning over the retrieved records', detail: 'Live model unavailable', status: 'error' });
    report({ id: 'prepare-answer', label: 'Preparing an on-device answer', detail: 'Ready', status: 'complete' });
    return withRun({ ...localResponse, engine: 'local', notice: 'Gemini 3.6 Flash could not be reached, so this answer is limited to Cura’s saved records.' });
  }
}
