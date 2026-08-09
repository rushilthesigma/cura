import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useActivityLog } from './ActivityLogContext';
import { useCareProfile } from './CareProfileContext';
import { useDailyCare } from './DailyCareContext';
import { useMessages } from './MessageContext';

export type DemoRole = 'patient' | 'caregiver';
export type DemoMatchStatus = 'available' | 'requested' | 'accepted';

interface DemoFlowState {
  isActive: boolean;
  activeRole: DemoRole | null;
  onboardingComplete: boolean;
  matchStatus: DemoMatchStatus;
  requestedAt: string | null;
  acceptedAt: string | null;
}

interface DemoFlowValue extends DemoFlowState {
  isReady: boolean;
  startPatientDemo: () => void;
  enterCaregiverDemo: () => void;
  finishPatientOnboarding: () => void;
  requestDemoCaregiver: () => void;
  acceptDemoCareRequest: (role?: DemoRole) => void;
  switchDemoRole: (role: DemoRole) => void;
}

const STORAGE_KEY = '@cura/demo-flow/v1';
const initialState: DemoFlowState = {
  isActive: false,
  activeRole: null,
  onboardingComplete: false,
  matchStatus: 'available',
  requestedAt: null,
  acceptedAt: null,
};

const DemoFlowContext = createContext<DemoFlowValue | null>(null);

export function DemoFlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoFlowState>(initialState);
  const [isReady, setIsReady] = useState(false);
  const { isDemoMode, startPatientDemoSession, startCaregiverDemoSession } = useCareProfile();
  const { loadDemoDailyCare, resetDemoDailyCare } = useDailyCare();
  const { resetDemoActivity } = useActivityLog();
  const { connectDemoMessages, resetDemoMessages } = useMessages();

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => {
        if (!mounted || !value) return;
        const stored = JSON.parse(value) as Partial<DemoFlowState>;
        setState({ ...initialState, ...stored });
      })
      .catch(() => {})
      .finally(() => mounted && setIsReady(true));
    return () => { mounted = false; };
  }, []);

  const persist = (next: DemoFlowState) => {
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const value = useMemo<DemoFlowValue>(() => ({
    ...state,
    isReady,
    startPatientDemo: () => {
      startPatientDemoSession();
      resetDemoDailyCare();
      resetDemoActivity();
      resetDemoMessages();
      persist({
        isActive: true,
        activeRole: 'patient',
        onboardingComplete: false,
        matchStatus: 'available',
        requestedAt: null,
        acceptedAt: null,
      });
    },
    enterCaregiverDemo: () => {
      startCaregiverDemoSession();
      resetDemoDailyCare();
      resetDemoActivity();
      resetDemoMessages();
      persist({
        isActive: true,
        activeRole: 'caregiver',
        onboardingComplete: true,
        matchStatus: 'requested',
        requestedAt: new Date().toISOString(),
        acceptedAt: null,
      });
    },
    finishPatientOnboarding: () => persist({ ...state, onboardingComplete: true }),
    requestDemoCaregiver: () => persist({
      ...state,
      matchStatus: 'requested',
      requestedAt: new Date().toISOString(),
      acceptedAt: null,
    }),
    acceptDemoCareRequest: (role = 'patient') => {
      connectDemoMessages();
      loadDemoDailyCare();
      persist({
        ...state,
        activeRole: role,
        matchStatus: 'accepted',
        acceptedAt: new Date().toISOString(),
      });
    },
    switchDemoRole: role => persist({ ...state, activeRole: role }),
  }), [state, isReady, isDemoMode]);

  return <DemoFlowContext.Provider value={value}>{children}</DemoFlowContext.Provider>;
}

export function useDemoFlow() {
  const value = useContext(DemoFlowContext);
  if (!value) throw new Error('useDemoFlow must be used inside DemoFlowProvider');
  return value;
}
