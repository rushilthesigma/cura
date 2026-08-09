import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEMO_CAREGIVER, DEMO_PROFILE } from '../data/demoData';

export interface CareProfile {
  patientName: string;
  preferredName: string;
  relationship: string;
  location: string;
  dateOfBirth: string;
  primaryLanguage: string;
  careGoals: string;
  careNeeds: string[];
  medicalConditions: string;
  medications: string;
  allergies: string;
  dailyActivities: string;
  cognitionAndMood: string;
  mobilityAndFalls: string;
  sensoryNeeds: string;
  communicationNotes: string;
  routinesAndComfort: string;
  nutritionAndHydration: string;
  emergencyContact: string;
  clinicianContact: string;
  additionalNotes: string;
  lastReviewedAt: string;
}

export type BasicCareProfile = Pick<CareProfile, 'patientName' | 'preferredName' | 'relationship' | 'location' | 'careNeeds'>;

const STORAGE_KEY = '@cura/care-profile/v2';

export const emptyProfile: CareProfile = {
  patientName: '',
  preferredName: '',
  relationship: '',
  location: '',
  careNeeds: [],
  dateOfBirth: '',
  primaryLanguage: '',
  careGoals: '',
  medicalConditions: '',
  medications: '',
  allergies: '',
  dailyActivities: '',
  cognitionAndMood: '',
  mobilityAndFalls: '',
  sensoryNeeds: '',
  communicationNotes: '',
  routinesAndComfort: '',
  nutritionAndHydration: '',
  emergencyContact: '',
  clinicianContact: '',
  additionalNotes: '',
  lastReviewedAt: '',
};

interface StoredProfile {
  profile: CareProfile;
  hasCompletedOnboarding: boolean;
  isDemoMode?: boolean;
  assignedCaregiverName?: string;
}

interface CareProfileValue {
  profile: CareProfile;
  hasCompletedOnboarding: boolean;
  isReady: boolean;
  isDemoMode: boolean;
  assignedCaregiverName: string;
  completeOnboarding: (profile: BasicCareProfile) => void;
  startFamilySession: () => void;
  startDemoSession: () => void;
  startPatientDemoSession: () => void;
  startCaregiverDemoSession: () => void;
  updateProfile: (profile: CareProfile) => void;
}

const CareProfileContext = createContext<CareProfileValue | null>(null);

function normalizeProfile(profile: Partial<CareProfile>): CareProfile {
  return { ...emptyProfile, ...profile, careNeeds: profile.careNeeds ?? [] };
}

export function CareProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState(emptyProfile);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [assignedCaregiverName, setAssignedCaregiverName] = useState('Caregiver');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => {
        if (!mounted || !value) return;
        const stored = JSON.parse(value) as Partial<StoredProfile>;
        if (stored.profile) setProfile(normalizeProfile(stored.profile));
        if (stored.hasCompletedOnboarding) setHasCompletedOnboarding(true);
        if (stored.isDemoMode) setIsDemoMode(true);
        if (stored.assignedCaregiverName) setAssignedCaregiverName(stored.assignedCaregiverName);
      })
      .catch(() => {})
      .finally(() => mounted && setIsReady(true));
    return () => { mounted = false; };
  }, []);

  const persist = (
    nextProfile: CareProfile,
    completed = true,
    session = { isDemoMode, assignedCaregiverName },
  ) => {
    setProfile(nextProfile);
    setHasCompletedOnboarding(completed);
    setIsDemoMode(session.isDemoMode);
    setAssignedCaregiverName(session.assignedCaregiverName);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      profile: nextProfile,
      hasCompletedOnboarding: completed,
      ...session,
    })).catch(() => {});
  };

  const value = useMemo<CareProfileValue>(() => ({
    profile,
    hasCompletedOnboarding,
    isReady,
    isDemoMode,
    assignedCaregiverName,
    completeOnboarding: basicProfile => persist({
      ...(isDemoMode ? DEMO_PROFILE : emptyProfile),
      ...basicProfile,
      lastReviewedAt: new Date().toISOString(),
    }, true, isDemoMode
      ? { isDemoMode: true, assignedCaregiverName: DEMO_CAREGIVER.name }
      : { isDemoMode: false, assignedCaregiverName: 'Caregiver' }),
    startFamilySession: () => persist(profile),
    startDemoSession: () => persist({
      ...DEMO_PROFILE,
      lastReviewedAt: new Date().toISOString(),
    }, true, { isDemoMode: true, assignedCaregiverName: DEMO_CAREGIVER.name }),
    startPatientDemoSession: () => persist({
      ...DEMO_PROFILE,
      lastReviewedAt: new Date().toISOString(),
    }, false, { isDemoMode: true, assignedCaregiverName: DEMO_CAREGIVER.name }),
    startCaregiverDemoSession: () => persist({
      ...DEMO_PROFILE,
      lastReviewedAt: new Date().toISOString(),
    }, true, { isDemoMode: true, assignedCaregiverName: DEMO_CAREGIVER.name }),
    updateProfile: nextProfile => persist(normalizeProfile({
      ...nextProfile,
      lastReviewedAt: new Date().toISOString(),
    })),
  }), [profile, hasCompletedOnboarding, isReady, isDemoMode, assignedCaregiverName]);

  return <CareProfileContext.Provider value={value}>{children}</CareProfileContext.Provider>;
}

export function useCareProfile() {
  const value = useContext(CareProfileContext);
  if (!value) throw new Error('useCareProfile must be used inside CareProfileProvider');
  return value;
}
