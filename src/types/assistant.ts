export type SupportedLanguage = 'mr-IN' | 'hi-IN' | 'en-US';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'mruneel' | 'system';
  text: string;
  language?: SupportedLanguage;
  timestamp: number;
  isOfflineResponse?: boolean;
  visionThumbnail?: string;
  actionsTaken?: string[];
}

export interface ReminderItem {
  id: string;
  title: string;
  dueTime: string; // ISO string
  priority: 'low' | 'normal' | 'high';
  completed: boolean;
  category: 'personal' | 'work' | 'health' | 'general';
}

export interface AlarmItem {
  id: string;
  label: string;
  time: string; // "HH:MM" 24h
  days: number[]; // 0-6 (Sun-Sat)
  enabled: boolean;
  sound: 'jarvis-chime' | 'golden-pulse' | 'sub-pulse';
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  tags: string[];
}

export interface PersonalMemory {
  id: string;
  key: string;
  value: string;
  category: 'preference' | 'personal' | 'routine' | 'contact';
  lastUpdated: number;
}

export interface AssistantSettings {
  userName: string;
  honorific: string; // 'Sir' | 'Boss' | 'श्रीमान' | 'साहेब'
  defaultLanguage: SupportedLanguage;
  voiceSpeed: number; // 0.8 - 1.2
  voicePitch: number; // 0.8 - 1.2
  soundEffectsEnabled: boolean;
  wakeWordEnabled: boolean;
  hapticFeedback: boolean;
  biometricLockEnabled: boolean;
  pinCode: string; // 4 digits
  offlineFirstMode: boolean;
  selectedVoiceName?: string;
}

export interface AndroidPermissionStatus {
  id: string;
  name: string;
  androidManifestKey: string;
  webApiStatus: 'granted' | 'denied' | 'prompt' | 'unsupported';
  isNativeOnly: boolean;
  description: string;
  purpose: string;
}

export interface DeviceTelemetry {
  batteryLevel: number | null;
  isCharging: boolean | null;
  networkType: string;
  isOnline: boolean;
  downlinkSpeedMbps: number | null;
  orientationAlpha: number;
  orientationBeta: number;
  orientationGamma: number;
  locationCoords?: { latitude: number; longitude: number; accuracy: number };
}

export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'scanning' | 'error';
