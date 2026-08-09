export type UserRole = 'family' | 'caregiver';

export type AlertTier = 'urgent' | 'contactCare' | 'monitorClosely' | 'informational';

export interface ConcernAlert {
  id: string;
  tier: AlertTier;
  headline: string;
  detail: string;
  confidence: string;
  recommendedAction: string;
  alternativeExplanations: string[];
  missingInformation: string[];
  createdAt: Date;
  isAcknowledged: boolean;
}

export type TimelineEntryType =
  | 'checkIn' | 'checkOut' | 'meal' | 'hydration' | 'mood'
  | 'mobility' | 'sleep' | 'medication' | 'observation' | 'handoff' | 'note';

export interface TimelineEntry {
  id: string;
  timestamp: Date;
  type: TimelineEntryType;
  title: string;
  detail: string;
  caregiverName: string;
  isUrgent?: boolean;
}

export type TaskStatus = 'scheduled' | 'completed' | 'notConfirmed' | 'unableToComplete';

export interface BookingTask {
  id: string;
  title: string;
  category: string;
  status: TaskStatus;
}

export type VisitStatus = 'scheduled' | 'confirmed' | 'inProgress' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  caregiverId: string;
  caregiverName: string;
  startTime: Date;
  endTime: Date;
  visitType: string;
  status: VisitStatus;
  tasks: BookingTask[];
  estimatedEarnings: number;
  neighborhood: string;
  address: string;
}

export interface LovedOne {
  id: string;
  fullName: string;
  preferredName: string;
  age: number;
  neighborhood: string;
  address: string;
  medicalNotes: string;
  calmingTechniques: string[];
  helpMeFeelSafe: string;
  primaryLanguage: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Caregiver {
  id: string;
  name: string;
  preferredName: string;
  rating: number;
  totalVisits: number;
  bio: string;
  specialties: string[];
  verificationBadges: string[];
  serviceArea: string;
  onTimePercentage: number;
  repeatFamilyPercentage: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  body: string;
  timestamp: Date;
  isUrgent: boolean;
  language?: string;
  languageName?: string;
  translatedText?: string;
}

export interface MessageThread {
  id: string;
  participantIds: string[];
  participantNames: string[];
  lastMessage?: Message;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export interface CaregiverListing {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  totalVisits: number;
  specialties: string[];
  bio: string;
  hourlyRate: number;
  yearsExperience: number;
  availability: string;
  isAvailable: boolean;
  languages: string[];
  isCurrent?: boolean;
}
