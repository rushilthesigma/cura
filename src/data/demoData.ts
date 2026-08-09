import type { ActivityEntry } from '../context/ActivityLogContext';
import type { CareProfile } from '../context/CareProfileContext';
import type { DailyCareSnapshot } from '../context/DailyCareContext';
import type { Message } from '../models/types';

export const DEMO_CAREGIVER = {
  id: 'demo-caregiver-meera',
  name: 'Meera Patil',
  preferredName: 'Meera',
  language: 'Marathi',
  rating: 4.9,
  totalVisits: 184,
  yearsExperience: 6,
  specialties: ['Memory support', 'Mobility support', 'Medication reminders'],
  bio: 'A Pune-based in-home caregiver who focuses on calm routines, mobility safety, and clear family updates.',
};

export const DEMO_CAREGIVER_RESULT = {
  id: DEMO_CAREGIVER.id,
  name: DEMO_CAREGIVER.name,
  kind: 'In-home caregiver · Available today',
  address: 'Kothrud, Pune · 1.2 km from Anjali',
  summary: 'Marathi, Hindi, and English · 6 years’ experience · Memory and mobility support',
  sourceUrl: 'https://example.com/cura-demo-caregiver',
  sourceLabel: 'Cura demo profile',
  sourceType: 'Web' as const,
};

export const DEMO_MESSAGE_TRANSLATIONS: Record<string, string> = {
  'नमस्कार अंजलीताई, मी मीरा. तुमची काळजी घेण्यासाठी मी विनंती स्वीकारली आहे.': 'Hello Anjali, I’m Meera. I’ve accepted the request to care for you.',
  'नमस्कार, आज सकाळी अंजलीताई नेहमीपेक्षा थोड्या थकलेल्या वाटल्या.': 'Hello, Anjali seemed a little more tired than usual this morning.',
  'नाश्ता अर्धाच झाला आणि पाणीही कमी प्यायल्या. रात्री झोप दोनदा तुटली होती.': 'She ate only half her breakfast and drank less water. Her sleep was interrupted twice last night.',
  'चालताना एकदा थोडा तोल गेला, पण पडल्या नाहीत. मी जवळ राहून पुन्हा पाणी देईन.': 'She briefly lost her balance while walking, but did not fall. I’ll stay close and offer water again.',
  'मी उद्या सकाळी नऊ वाजता येईन. भेटूया!': 'I’ll come tomorrow morning at nine. See you then!',
};

export const DEMO_PROFILE: CareProfile = {
  patientName: 'Anjali Deshmukh',
  preferredName: 'Anjali',
  relationship: 'Mother',
  location: 'Kothrud, Pune, Maharashtra',
  dateOfBirth: '1944-05-18',
  primaryLanguage: 'Marathi',
  careGoals: 'Stay safely at home, keep her familiar morning routine, and catch small changes early.',
  careNeeds: ['Memory support', 'Mobility support', 'Medication help', 'Companionship'],
  medicalConditions: 'Hypertension\nMild cognitive impairment',
  medications: 'Amlodipine 5 mg each morning\nVitamin D once weekly',
  allergies: 'Penicillin — rash',
  dailyActivities: 'Independent with eating. Needs reminders for medicines and standby support for bathing.',
  cognitionAndMood: 'Usually alert and sociable. May repeat questions in the late afternoon.',
  mobilityAndFalls: 'Uses a walking stick outdoors. One near-fall last month; stay close on stairs.',
  sensoryNeeds: 'Reading glasses. Hearing is best on her right side.',
  communicationNotes: 'Speak in Marathi, one idea at a time, and allow a few seconds for her to answer.',
  routinesAndComfort: 'Tea after waking, devotional music at breakfast, and a short balcony walk before lunch.',
  nutritionAndHydration: 'Vegetarian. Prefers warm water. Typical goal is six small glasses across the day.',
  emergencyContact: 'Rohan Deshmukh (son) · +91 98XX XXX 184',
  clinicianContact: 'Dr. N. Kulkarni · Kothrud Family Clinic',
  additionalNotes: 'Demo record — all people and care details are fictional.',
  lastReviewedAt: new Date().toISOString(),
};

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

export function createDemoDailyCare(): DailyCareSnapshot {
  const submittedAt = minutesAgo(34).toISOString();
  const checkInId = 'demo-check-in';
  return {
    dateKey: new Date().toISOString().slice(0, 10),
    itinerary: [
      { id: 'demo-plan-1', time: '8:30 AM', title: 'Breakfast & morning medicine', notes: 'Offer warm water with breakfast.', completed: true },
      { id: 'demo-plan-2', time: '11:00 AM', title: 'Hydration check', notes: 'Offer a small glass and note how much she drinks.', completed: false },
      { id: 'demo-plan-3', time: '12:30 PM', title: 'Supported balcony walk', notes: 'Keep walking stick nearby and stay within arm’s reach.', completed: false },
    ],
    latestCheckIn: {
      id: checkInId,
      submittedAt,
      submittedBy: DEMO_CAREGIVER.name,
      answers: {
        cognition: 'usual',
        breathing: 'usual',
        pain: 'usual',
        intake: 'changed',
        medication: 'usual',
        mobility: 'changed',
        function: 'usual',
        mood: 'usual',
        sleep: 'changed',
        continence: 'usual',
        'vision-hearing': 'usual',
        skin: 'usual',
      },
      notes: 'नाश्ता अर्धाच झाला, पाणी कमी प्यायल्या आणि चालताना थोडा तोल गेला. पडल्या नाहीत.',
      assessment: {
        level: 'contact',
        title: 'Slightly elevated risk',
        summary: 'Three mild changes from Anjali’s usual baseline: lower fluid intake, increased unsteadiness, and disrupted sleep.',
        nextStep: 'Keep a closer watch today, encourage fluids, and share an update with the care team if any signal persists or worsens.',
        flaggedQuestionIds: ['intake', 'mobility', 'sleep'],
      },
    },
    planGeneration: {
      source: 'ai',
      summary: 'Created by Cura AI from today’s questionnaire and patient record.',
      generatedAt: submittedAt,
      basedOnCheckInId: checkInId,
      edited: false,
    },
  };
}

export function createDemoStartingDailyCare(): DailyCareSnapshot {
  return {
    dateKey: new Date().toISOString().slice(0, 10),
    itinerary: [],
    latestCheckIn: null,
    planGeneration: null,
  };
}

export function createDemoActivity(): ActivityEntry[] {
  return [
    {
      id: 'demo-activity-check-in',
      timestamp: minutesAgo(96).toISOString(),
      type: 'checkIn',
      title: 'Morning visit started',
      detail: 'Anjali was awake and dressed when Meera arrived.',
      caregiverName: DEMO_CAREGIVER.name,
    },
    {
      id: 'demo-activity-breakfast',
      timestamp: minutesAgo(72).toISOString(),
      type: 'meal',
      title: 'Ate about half of breakfast',
      detail: 'Less than her usual amount. Morning medicine was taken as planned.',
      caregiverName: DEMO_CAREGIVER.name,
    },
    {
      id: 'demo-activity-hydration',
      timestamp: minutesAgo(55).toISOString(),
      type: 'hydration',
      title: 'Drank less water than usual',
      detail: 'Accepted a few sips of warm water; Meera will offer another small glass at 11:00 AM.',
      caregiverName: DEMO_CAREGIVER.name,
    },
    {
      id: 'demo-activity-mobility',
      timestamp: minutesAgo(41).toISOString(),
      type: 'mobility',
      title: 'Brief loss of balance',
      detail: 'Anjali steadied herself with support. No fall, pain, or injury observed.',
      caregiverName: DEMO_CAREGIVER.name,
    },
  ];
}

export function createDemoMessages(): Message[] {
  return [
    {
      id: 'demo-message-1',
      senderId: DEMO_CAREGIVER.id,
      senderName: DEMO_CAREGIVER.name,
      senderRole: 'caregiver',
      body: 'नमस्कार, आज सकाळी अंजलीताई नेहमीपेक्षा थोड्या थकलेल्या वाटल्या.',
      timestamp: minutesAgo(65),
      isUrgent: false,
      language: 'mar',
      languageName: 'Marathi',
    },
    {
      id: 'demo-message-2',
      senderId: 'family-user',
      senderName: 'Rohan Deshmukh',
      senderRole: 'family',
      body: 'Thanks, Meera. Did she eat and drink?',
      timestamp: minutesAgo(61),
      isUrgent: false,
      language: 'eng',
      languageName: 'English',
    },
    {
      id: 'demo-message-3',
      senderId: DEMO_CAREGIVER.id,
      senderName: DEMO_CAREGIVER.name,
      senderRole: 'caregiver',
      body: 'नाश्ता अर्धाच झाला आणि पाणीही कमी प्यायल्या. रात्री झोप दोनदा तुटली होती.',
      timestamp: minutesAgo(58),
      isUrgent: false,
      language: 'mar',
      languageName: 'Marathi',
    },
    {
      id: 'demo-message-4',
      senderId: DEMO_CAREGIVER.id,
      senderName: DEMO_CAREGIVER.name,
      senderRole: 'caregiver',
      body: 'चालताना एकदा थोडा तोल गेला, पण पडल्या नाहीत. मी जवळ राहून पुन्हा पाणी देईन.',
      timestamp: minutesAgo(52),
      isUrgent: false,
      language: 'mar',
      languageName: 'Marathi',
    },
  ];
}

export function createDemoConnectionMessages(): Message[] {
  return [{
    id: 'demo-connected-message',
    senderId: DEMO_CAREGIVER.id,
    senderName: DEMO_CAREGIVER.name,
    senderRole: 'caregiver',
    body: 'नमस्कार अंजलीताई, मी मीरा. तुमची काळजी घेण्यासाठी मी विनंती स्वीकारली आहे.',
    timestamp: new Date(),
    isUrgent: false,
    language: 'mar',
    languageName: 'Marathi',
  }];
}
