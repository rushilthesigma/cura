const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function translateText(text, sourceLanguageName, apiKey) {
  if (!apiKey) {
    const err = new Error('Add EXPO_PUBLIC_GEMINI_API_KEY to expo-app/.env.local to enable translation.');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const prompt = `Translate the following message${sourceLanguageName ? ` from ${sourceLanguageName}` : ''} into English. Reply with only the translated text, no notes or quotation marks.\n\nMessage:\n${text}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 400, thinkingConfig: { thinkingLevel: 'minimal' } },
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `Gemini request failed (${response.status}).`);
    const translated = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
    if (!translated) throw new Error('Gemini returned an empty translation.');
    return translated;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { translateText };
