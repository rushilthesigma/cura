const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const express = require('express');
const cors = require('cors');

const { detectLanguage } = require('./lang');
const { translateText } = require('./translate');
const { generateCarePlan } = require('./care-plan');

const PORT = process.env.PORT || 4001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Single fixed thread: this app models one family and one assigned caregiver.
const THREAD_ID = 'care-team';
const ROLE_LABEL = { family: 'Family', caregiver: 'Caregiver' };

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'messages.json');
const WEB_DIR = path.join(__dirname, '..', 'dist');
const WEB_INDEX = path.join(WEB_DIR, 'index.html');

function loadState() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      lastRead: { family: parsed.lastRead?.family ?? null, caregiver: parsed.lastRead?.caregiver ?? null },
    };
  } catch {
    return { messages: [], lastRead: { family: null, caregiver: null } };
  }
}

let state = loadState();
let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  }, 50);
}

function otherRole(role) {
  return role === 'caregiver' ? 'family' : 'caregiver';
}

function buildThread(role) {
  const last = state.messages[state.messages.length - 1] ?? null;
  const lastRead = state.lastRead[role];
  const unreadCount = state.messages.filter(m => (
    m.senderRole === otherRole(role) && (!lastRead || m.timestamp > lastRead)
  )).length;
  return {
    id: THREAD_ID,
    participantNames: [ROLE_LABEL.family, ROLE_LABEL.caregiver],
    lastMessage: last,
    unreadCount,
  };
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(WEB_DIR));

app.get('/', (_req, res) => {
  if (fs.existsSync(WEB_INDEX)) return res.sendFile(WEB_INDEX);
  res.json({
    name: 'Cura API',
    ok: true,
    health: '/api/health',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    translationEnabled: Boolean(GEMINI_API_KEY),
    aiPlanningEnabled: Boolean(GEMINI_API_KEY),
  });
});

// One caregiver<->family relationship per app instance, so this is always a
// single-item list — but keeping the shape as a list matches the client's
// existing thread-list screen and leaves room for multiple caregivers later.
app.get('/api/threads', (req, res) => {
  const role = req.query.role === 'caregiver' ? 'caregiver' : 'family';
  res.json({ threads: [buildThread(role)] });
});

app.get('/api/threads/:threadId/messages', (req, res) => {
  if (req.params.threadId !== THREAD_ID) return res.json({ messages: [] });
  res.json({ messages: state.messages });
});

app.post('/api/threads/:threadId/read', (req, res) => {
  if (req.params.threadId !== THREAD_ID) return res.status(404).json({ error: 'Unknown thread.' });
  const role = req.body?.role === 'caregiver' ? 'caregiver' : 'family';
  state.lastRead[role] = new Date().toISOString();
  persist();
  res.json({ ok: true });
});

app.post('/api/threads/:threadId/messages', async (req, res) => {
  if (req.params.threadId !== THREAD_ID) return res.status(404).json({ error: 'Unknown thread.' });
  const { senderId, senderName, senderRole, body } = req.body || {};
  const text = typeof body === 'string' ? body.trim() : '';
  if (!senderId || !senderRole || !text) {
    return res.status(400).json({ error: 'senderId, senderRole, and body are required.' });
  }
  if (senderRole !== 'family' && senderRole !== 'caregiver') {
    return res.status(400).json({ error: 'senderRole must be "family" or "caregiver".' });
  }

  const language = await detectLanguage(text);
  const message = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    senderId,
    senderName: senderName || ROLE_LABEL[senderRole],
    senderRole,
    body: text,
    timestamp: new Date().toISOString(),
    isUrgent: false,
    language: language.code,
    languageName: language.name,
  };
  state.messages.push(message);
  state.lastRead[senderRole] = message.timestamp;
  persist();
  res.status(201).json({ message });
});

app.post('/api/translate', async (req, res) => {
  const { messageId } = req.body || {};
  const message = state.messages.find(m => m.id === messageId);
  if (!message) return res.status(404).json({ error: 'Message not found.' });

  try {
    const translated = await translateText(message.body, message.languageName, GEMINI_API_KEY);
    res.json({ translated });
  } catch (err) {
    const status = err.code === 'NO_API_KEY' ? 501 : 502;
    res.status(status).json({ error: err.message });
  }
});

app.post('/api/generate-care-plan', async (req, res) => {
  const { profile, answers, notes } = req.body || {};
  if (!profile || !answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'profile and questionnaire answers are required.' });
  }

  try {
    const items = await generateCarePlan({ profile, answers, notes }, GEMINI_API_KEY);
    res.json({ items });
  } catch (error) {
    const status = error.code === 'NO_API_KEY' ? 501 : 502;
    res.status(status).json({ error: error.message || 'Could not generate the care plan.' });
  }
});

// Expo Router uses client-side routes on web. Once the static export exists,
// return its shell for those routes so refreshes work in the browser.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (fs.existsSync(WEB_INDEX)) return res.sendFile(WEB_INDEX);
  res.status(404).json({ error: 'Not found.' });
});

app.listen(PORT, () => {
  console.log(`Cura messages API listening on http://localhost:${PORT}`);
});
