import type { CareProfile } from '../context/CareProfileContext';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface CareSearchResult {
  id: string;
  name: string;
  kind: string;
  address: string;
  summary: string;
  sourceUrl: string;
  sourceLabel: string;
  sourceType: 'Google Maps' | 'Web';
}

interface GroundingChunk {
  maps?: { uri?: string; title?: string; placeId?: string };
  web?: { uri?: string; title?: string };
}

interface GroundedSource {
  title: string;
  url: string;
  sourceType: 'Google Maps' | 'Web';
  id: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: { groundingChunks?: GroundingChunk[] };
  }>;
  error?: { message?: string };
}

interface ParsedLine { name: string; kind: string; address: string; summary: string }

function clean(value: string) {
  return value.replace(/\[[^\]]*\]\([^)]*\)/g, '').replace(/\[[0-9,\s]+\]/g, '').replace(/\*\*/g, '').trim();
}

function parseResultLines(text: string): ParsedLine[] {
  return text.split('\n').flatMap(line => {
    const parts = line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim().split('||').map(clean);
    if (parts.length < 4 || !parts[0]) return [];
    return [{ name: parts[0], kind: parts[1], address: parts[2], summary: parts.slice(3).join(' · ') }];
  });
}

function similarity(left: string, right: string) {
  const tokens = (value: string) => new Set(value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(token => token.length > 2));
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  return [...a].filter(token => b.has(token)).length / Math.min(a.size, b.size);
}

function groundedSources(data: GeminiResponse): GroundedSource[] {
  const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources: GroundedSource[] = [];
  for (const chunk of chunks) {
    if (chunk.maps?.uri) {
      sources.push({ title: clean(chunk.maps.title || 'Google Maps care listing'), url: chunk.maps.uri, sourceType: 'Google Maps', id: chunk.maps.placeId || chunk.maps.uri });
    } else if (chunk.web?.uri) {
      sources.push({ title: clean(chunk.web.title || 'Care provider website'), url: chunk.web.uri, sourceType: 'Web', id: chunk.web.uri });
    }
  }
  return sources.filter((source, index, all) => all.findIndex(item => item.url === source.url) === index);
}

function buildResults(data: GeminiResponse, location: string): CareSearchResult[] {
  const text = data.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('\n') ?? '';
  const parsed = parseResultLines(text);
  const sources = groundedSources(data);

  return sources.slice(0, 8).map((source, index) => {
    const best = parsed.map(item => ({ item, score: similarity(item.name, source.title) })).sort((a, b) => b.score - a.score)[0];
    const details = best && (best.score >= 0.34 || parsed.length === sources.length) ? best.item : parsed[index];
    return {
      id: source.id,
      name: details?.name || source.title,
      kind: details?.kind || 'Care provider',
      address: details?.address || `Serving or near ${location}`,
      summary: details?.summary || 'Open the grounded listing to confirm services, eligibility, and availability.',
      sourceUrl: source.url,
      sourceLabel: source.title,
      sourceType: source.sourceType,
    };
  });
}

async function makeRequest(prompt: string, useMaps: boolean): Promise<GeminiResponse> {
  if (!GEMINI_API_KEY) throw new Error('Add EXPO_PUBLIC_GEMINI_API_KEY to .env.local to research nearby care.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: useMaps ? [{ googleMaps: {} }] : [{ googleSearch: {} }],
        generationConfig: {
          maxOutputTokens: 2200,
          thinkingConfig: { thinkingLevel: 'minimal' },
        },
      }),
    });
    const data = await response.json() as GeminiResponse;
    if (!response.ok) throw new Error(data.error?.message || `Gemini request failed (${response.status}).`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function researchNearbyCare(profile: Pick<CareProfile, 'location' | 'careNeeds' | 'preferredName'>): Promise<CareSearchResult[]> {
  const needs = profile.careNeeds.length ? profile.careNeeds.join(', ') : 'general senior care and daily living support';
  const prompt = `Use grounded local results to research real, currently listed care options in or closest to ${profile.location} for ${profile.preferredName}. Priorities: ${needs}.

Include a useful mix where available: in-home care agencies, adult day care, respite care, memory or dementia support, and senior care facilities. Do not invent providers, distance, pricing, availability, ratings, or credentials. Only include an option when a grounded source identifies the real provider.

Return 5 to 8 results, one per line, with exactly this format and no heading:
NAME || CARE TYPE || LISTED ADDRESS OR SERVICE AREA || ONE SHORT FACT SUPPORTED BY THE SOURCE`;

  let data: GeminiResponse;
  try {
    data = await makeRequest(prompt, true);
  } catch (mapsError) {
    try {
      data = await makeRequest(`${prompt}\nPrefer official provider pages and reputable directories for sources.`, false);
    } catch {
      throw mapsError;
    }
  }
  const results = buildResults(data, profile.location);
  if (!results.length) throw new Error('Gemini did not return any grounded care listings for this area. Try a city and postcode.');
  return results;
}
