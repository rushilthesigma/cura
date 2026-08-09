import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { TimelineEntryType } from '../models/types';
import { createDemoActivity } from '../data/demoData';

export interface ActivityEntry {
  id: string;
  timestamp: string;
  type: TimelineEntryType;
  title: string;
  detail: string;
  caregiverName: string;
}

export type NewActivityEntry = Pick<ActivityEntry, 'type' | 'title' | 'detail' | 'caregiverName'>;

export interface ActivityDay {
  key: string;
  date: Date;
  entries: ActivityEntry[];
}

const STORAGE_KEY = '@cura/activity-log/v1';

interface ActivityLogValue {
  entries: ActivityEntry[];
  days: ActivityDay[];
  todayEntries: ActivityEntry[];
  addEntry: (entry: NewActivityEntry) => void;
  removeEntry: (id: string) => void;
  loadDemoActivity: () => void;
  resetDemoActivity: () => void;
}

const ActivityLogContext = createContext<ActivityLogValue | null>(null);

const byTimestamp = (a: ActivityEntry, b: ActivityEntry) =>
  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();

export function ActivityLogProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => {
        if (!mounted || !value) return;
        const stored = JSON.parse(value) as ActivityEntry[];
        if (Array.isArray(stored)) setEntries(stored.sort(byTimestamp));
      })
      .catch(() => {
        // The log stays in memory for this session if device storage is unavailable.
      });
    return () => { mounted = false; };
  }, []);

  const persist = (next: ActivityEntry[]) => {
    setEntries(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const value = useMemo<ActivityLogValue>(() => {
    const groups = new Map<string, ActivityEntry[]>();
    for (const entry of entries) {
      const key = new Date(entry.timestamp).toDateString();
      const group = groups.get(key);
      if (group) group.push(entry);
      else groups.set(key, [entry]);
    }
    const days: ActivityDay[] = [...groups.entries()]
      .map(([key, dayEntries]) => ({ key, date: new Date(key), entries: dayEntries }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    const todayKey = new Date().toDateString();

    return {
      entries,
      days,
      todayEntries: groups.get(todayKey) ?? [],
      addEntry: entry => persist([...entries, {
        ...entry,
        id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
      }].sort(byTimestamp)),
      removeEntry: id => persist(entries.filter(entry => entry.id !== id)),
      loadDemoActivity: () => persist(createDemoActivity()),
      resetDemoActivity: () => persist([]),
    };
  }, [entries]);

  return <ActivityLogContext.Provider value={value}>{children}</ActivityLogContext.Provider>;
}

export function useActivityLog() {
  const value = useContext(ActivityLogContext);
  if (!value) throw new Error('useActivityLog must be used inside ActivityLogProvider');
  return value;
}
