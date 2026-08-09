const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const QUESTIONNAIRE_DOMAINS = {
  cognition: 'Alertness & thinking',
  breathing: 'Breathing',
  pain: 'Pain',
  intake: 'Food & fluids',
  medication: 'Medicines',
  mobility: 'Mobility & falls',
  function: 'Daily function',
  mood: 'Mood & behavior',
  sleep: 'Sleep & wakefulness',
  continence: 'Bathroom habits',
  'vision-hearing': 'Vision & hearing',
  skin: 'Skin & pressure areas',
};

const ANSWER_LABELS = {
  usual: 'No meaningful change from the usual baseline',
  changed: 'A mild or uncertain change was reported',
  urgent: 'An urgent or severe change was reported',
};

function questionnaireSummary(answers = {}) {
  return Object.entries(QUESTIONNAIRE_DOMAINS)
    .map(([id, domain]) => `${domain}: ${ANSWER_LABELS[answers[id]] || ANSWER_LABELS.usual}`)
    .join('\n');
}

function cleanItems(items) {
  if (!Array.isArray(items)) return [];
  return items.flatMap(item => {
    const time = typeof item?.time === 'string' ? item.time.trim() : '';
    const title = typeof item?.title === 'string' ? item.title.trim() : '';
    const notes = typeof item?.notes === 'string' ? item.notes.trim() : '';
    if (!time || !title) return [];
    return [{ time: time.slice(0, 30), title: title.slice(0, 90), notes: notes.slice(0, 240) }];
  }).slice(0, 6);
}

function parseItems(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(cleaned);
  return cleanItems(Array.isArray(parsed) ? parsed : parsed.items);
}

async function generateCarePlan({ profile = {}, answers = {}, notes = '' }, apiKey) {
  if (!apiKey) {
    const error = new Error('Cura AI is not configured on the server.');
    error.code = 'NO_API_KEY';
    throw error;
  }

  const prompt = `Create a practical, person-centred care routine for the rest of today from a caregiver questionnaire.

Person: ${profile.preferredName || profile.patientName || 'Patient'}
Care goals: ${profile.careGoals || 'Support safety, comfort, and usual routines.'}
Relevant medicines: ${profile.medications || 'Not provided'}
Mobility baseline: ${profile.mobilityAndFalls || 'Not provided'}
Nutrition and hydration: ${profile.nutritionAndHydration || 'Not provided'}
Communication: ${profile.communicationNotes || 'Not provided'}
Familiar routines: ${profile.routinesAndComfort || 'Not provided'}

Questionnaire answers:
${questionnaireSummary(answers)}

Caregiver notes: ${String(notes).trim() || 'None'}

Return only JSON in this exact shape:
{"items":[{"time":"Now or a short human-friendly time","title":"Short action","notes":"One clear, person-centred instruction"}]}

Create 3 to 6 ordered actions derived from the questionnaire. Prioritize urgent answers first, then changed answers, medicines, hydration, mobility safety, comfort, and handoff. Do not diagnose, prescribe, change doses, or delay emergency help. If an answer signals immediate danger, make seeking emergency help the first action.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 16_000);
  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
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
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `AI request failed (${response.status}).`);
    const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
    const items = parseItems(text);
    if (!items.length) throw new Error('Cura AI returned an empty care plan.');
    return items;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { generateCarePlan };
