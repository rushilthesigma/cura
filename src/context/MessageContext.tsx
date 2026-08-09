import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createDemoConnectionMessages, createDemoMessages, DEMO_CAREGIVER, DEMO_MESSAGE_TRANSLATIONS, DEMO_PROFILE } from '../data/demoData';
import type { Message, MessageThread, UserRole } from '../models/types';

const STORAGE_KEY = '@cura/messages/v1';

interface SendMessageInput {
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  body: string;
  language?: string;
  languageName?: string;
}

interface MessageValue {
  messages: Message[];
  isReady: boolean;
  loadDemoMessages: () => void;
  connectDemoMessages: () => void;
  resetDemoMessages: () => void;
  sendMessage: (input: SendMessageInput) => void;
  translateMessage: (id: string) => Promise<string>;
  threadFor: (role: UserRole) => MessageThread | null;
}

const MessageContext = createContext<MessageValue | null>(null);

function reviveMessage(message: Message | (Omit<Message, 'timestamp'> & { timestamp: string })): Message {
  return { ...message, timestamp: new Date(message.timestamp) };
}

export function MessageProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => {
        if (!mounted || !value) return;
        const stored = JSON.parse(value) as Message[];
        if (Array.isArray(stored)) setMessages(stored.map(reviveMessage));
      })
      .catch(() => {})
      .finally(() => mounted && setIsReady(true));
    return () => { mounted = false; };
  }, []);

  const persist = (next: Message[]) => {
    setMessages(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const value = useMemo<MessageValue>(() => ({
    messages,
    isReady,
    loadDemoMessages: () => persist(createDemoMessages()),
    connectDemoMessages: () => persist(createDemoConnectionMessages()),
    resetDemoMessages: () => persist([]),
    sendMessage: input => {
      const body = input.body.trim();
      if (!body) return;
      const message: Message = {
        id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...input,
        body,
        timestamp: new Date(),
        isUrgent: false,
      };
      setMessages(current => {
        const next = [...current, message];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    translateMessage: async id => {
      const message = messages.find(item => item.id === id);
      if (!message) throw new Error('Message not found.');
      if (message.translatedText) return message.translatedText;

      const translatedText = DEMO_MESSAGE_TRANSLATIONS[message.body];
      if (!translatedText) throw new Error('Automatic translation is not available for this message yet.');

      persist(messages.map(item => item.id === id ? { ...item, translatedText } : item));
      return translatedText;
    },
    threadFor: role => {
      if (!messages.length) return null;
      const caregiverName = messages.find(message => message.senderRole === 'caregiver')?.senderName || DEMO_CAREGIVER.name;
      const lastMessage = messages[messages.length - 1];
      return {
        id: 'care-team',
        participantIds: ['family-user', DEMO_CAREGIVER.id],
        participantNames: [DEMO_PROFILE.patientName, caregiverName],
        lastMessage,
        unreadCount: messages.filter(message => message.senderRole !== role).length,
      };
    },
  }), [messages, isReady]);

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
}

export function useMessages() {
  const value = useContext(MessageContext);
  if (!value) throw new Error('useMessages must be used inside MessageProvider');
  return value;
}
