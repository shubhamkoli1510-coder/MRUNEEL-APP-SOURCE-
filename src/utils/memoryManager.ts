import {
  AssistantSettings,
  PersonalMemory,
  ReminderItem,
  AlarmItem,
  NoteItem
} from '../types/assistant';

const SETTINGS_KEY = 'mruneel_assistant_settings';
const MEMORY_KEY = 'mruneel_personal_memory';
const REMINDERS_KEY = 'mruneel_reminders';
const ALARMS_KEY = 'mruneel_alarms';
const NOTES_KEY = 'mruneel_notes';

export const DEFAULT_SETTINGS: AssistantSettings = {
  userName: 'Shubham',
  honorific: 'साहेब',
  defaultLanguage: 'mr-IN',
  voiceSpeed: 1.0,
  voicePitch: 1.0,
  soundEffectsEnabled: true,
  wakeWordEnabled: true,
  hapticFeedback: true,
  biometricLockEnabled: false,
  pinCode: '1234',
  offlineFirstMode: false,
  cloudMemoryConsent: false,
};

const INITIAL_MEMORIES = [];

const INITIAL_ALARMS = [];

const INITIAL_REMINDERS = [];

const INITIAL_NOTES = [];

export class MemoryManager {
  public static getSettings(): AssistantSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public static saveSettings(settings: AssistantSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  public static getMemories(): PersonalMemory[] {
    try {
      const data = localStorage.getItem(MEMORY_KEY);
      return data ? JSON.parse(data) : INITIAL_MEMORIES;
    } catch {
      return INITIAL_MEMORIES;
    }
  }

  public static saveMemories(memories: PersonalMemory[]): void {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memories));
  }

  public static addMemory(key: string, value: string, category: PersonalMemory['category'] = 'personal'): PersonalMemory {
    const list = this.getMemories();
    const newMem: PersonalMemory = {
      id: `mem-${Date.now()}`,
      key,
      value,
      category,
      lastUpdated: Date.now(),
    };
    list.unshift(newMem);
    this.saveMemories(list);
    return newMem;
  }

  public static deleteMemory(id: string): void {
    const list = this.getMemories().filter(m => m.id !== id);
    this.saveMemories(list);
  }

  public static getAlarms(): AlarmItem[] {
    try {
      const data = localStorage.getItem(ALARMS_KEY);
      return data ? JSON.parse(data) : INITIAL_ALARMS;
    } catch {
      return INITIAL_ALARMS;
    }
  }

  public static saveAlarms(alarms: AlarmItem[]): void {
    localStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
  }

  public static addAlarm(time: string, label: string = 'MRUNEEL गजर'): AlarmItem {
    const list = this.getAlarms();
    const newAlarm: AlarmItem = {
      id: `alm-${Date.now()}`,
      label,
      time,
      days: [0, 1, 2, 3, 4, 5, 6],
      enabled: true,
      sound: 'golden-pulse'
    };
    list.push(newAlarm);
    this.saveAlarms(list);
    return newAlarm;
  }

  public static toggleAlarm(id: string): void {
    const list = this.getAlarms().map(a => a.id === id ? { ...a, enabled: !a.enabled } : a);
    this.saveAlarms(list);
  }

  public static deleteAlarm(id: string): void {
    const list = this.getAlarms().filter(a => a.id !== id);
    this.saveAlarms(list);
  }

  public static getReminders(): ReminderItem[] {
    try {
      const data = localStorage.getItem(REMINDERS_KEY);
      return data ? JSON.parse(data) : INITIAL_REMINDERS;
    } catch {
      return INITIAL_REMINDERS;
    }
  }

  public static saveReminders(reminders: ReminderItem[]): void {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
  }

  public static addReminder(title: string, dueTime?: string): ReminderItem {
    const list = this.getReminders();
    const newRem: ReminderItem = {
      id: `rem-${Date.now()}`,
      title,
      dueTime: dueTime || new Date(Date.now() + 3600000 * 2).toISOString(),
      priority: 'normal',
      completed: false,
      category: 'general'
    };
    list.unshift(newRem);
    this.saveReminders(list);
    return newRem;
  }

  public static toggleReminder(id: string): void {
    const list = this.getReminders().map(r => r.id === id ? { ...r, completed: !r.completed } : r);
    this.saveReminders(list);
  }

  public static deleteReminder(id: string): void {
    const list = this.getReminders().filter(r => r.id !== id);
    this.saveReminders(list);
  }

  public static getNotes(): NoteItem[] {
    try {
      const data = localStorage.getItem(NOTES_KEY);
      return data ? JSON.parse(data) : INITIAL_NOTES;
    } catch {
      return INITIAL_NOTES;
    }
  }

  public static saveNotes(notes: NoteItem[]): void {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }

  public static addNote(content: string, title?: string): NoteItem {
    const list = this.getNotes();
    const newNote: NoteItem = {
      id: `not-${Date.now()}`,
      title: title || 'नवीन टीप (Note)',
      content,
      timestamp: Date.now(),
      tags: ['quick']
    };
    list.unshift(newNote);
    this.saveNotes(list);
    return newNote;
  }

  public static deleteNote(id: string): void {
    const list = this.getNotes().filter(n => n.id !== id);
    this.saveNotes(list);
  }

  /**
   * Formats personal memories into a concise prompt context for Gemini
   */
  public static getMemoriesForPrompt(): string {
    const memories = this.getMemories();
    if (!memories.length) return '';
    return memories.map(m => `- ${m.key}: ${m.value}`).join('\n');
  }
}
