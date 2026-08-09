const LANGUAGE_NAMES = {
  eng: 'English',
  spa: 'Spanish',
  fra: 'French',
  deu: 'German',
  por: 'Portuguese',
  ita: 'Italian',
  nld: 'Dutch',
  pol: 'Polish',
  tur: 'Turkish',
  vie: 'Vietnamese',
  ind: 'Indonesian',
  tgl: 'Tagalog',
  swe: 'Swedish',
  ces: 'Czech',
  ron: 'Romanian',
  hun: 'Hungarian',
  cmn: 'Chinese',
  jpn: 'Japanese',
  kor: 'Korean',
  ara: 'Arabic',
  heb: 'Hebrew',
  hin: 'Hindi',
  guj: 'Gujarati',
  pan: 'Punjabi',
  ben: 'Bengali',
  tam: 'Tamil',
  tel: 'Telugu',
  mar: 'Marathi',
  rus: 'Russian',
  ukr: 'Ukrainian',
  tha: 'Thai',
  ell: 'Greek',
  und: 'Unknown',
};

// Unicode-script ranges that identify a language with high confidence even in
// short chat messages, where trigram detectors like franc are unreliable.
const SCRIPT_RANGES = [
  { code: 'cmn', re: /[一-鿿]/ },
  { code: 'jpn', re: /[぀-ヿ]/ },
  { code: 'kor', re: /[가-힯]/ },
  { code: 'ara', re: /[؀-ۿ]/ },
  { code: 'heb', re: /[֐-׿]/ },
  { code: 'hin', re: /[ऀ-ॿ]/ },
  { code: 'guj', re: /[઀-૿]/ },
  { code: 'pan', re: /[਀-੿]/ },
  { code: 'ben', re: /[ঀ-৿]/ },
  { code: 'tam', re: /[஀-௿]/ },
  { code: 'tel', re: /[ఀ-౿]/ },
  { code: 'rus', re: /[Ѐ-ӿ]/ },
  { code: 'tha', re: /[฀-๿]/ },
  { code: 'ell', re: /[Ͱ-Ͽ]/ },
];

// Latin-script languages franc can plausibly tell apart from English on chat-length text.
const LATIN_CANDIDATES = ['eng', 'spa', 'fra', 'deu', 'por', 'ita', 'nld', 'pol', 'tur', 'vie', 'ind', 'tgl', 'swe', 'ces', 'ron', 'hun'];

let francPromise;
async function getFranc() {
  if (!francPromise) francPromise = import('franc-min').then(mod => mod.franc);
  return francPromise;
}

function languageName(code) {
  return LANGUAGE_NAMES[code] || code;
}

// Detects the language of a short chat message. Returns { code, name } where
// code 'eng' (or 'und') means "treat as English, no translate button needed".
// Short-text language ID is inherently fuzzy for Latin-script languages; the
// unicode-script fast path is exact, the franc fallback is best-effort.
async function detectLanguage(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return { code: 'und', name: languageName('und') };

  for (const { code, re } of SCRIPT_RANGES) {
    if (re.test(trimmed)) return { code, name: languageName(code) };
  }

  // franc needs a handful of words to have any signal; below that, assume English.
  if (trimmed.split(/\s+/).length < 4) return { code: 'eng', name: languageName('eng') };

  const franc = await getFranc();
  const code = franc(trimmed, { only: LATIN_CANDIDATES });
  if (code === 'und') return { code: 'eng', name: languageName('eng') };
  return { code, name: languageName(code) };
}

module.exports = { detectLanguage, languageName };
