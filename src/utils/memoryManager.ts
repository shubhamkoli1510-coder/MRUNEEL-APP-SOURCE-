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
};

const INITIAL_MEMORIES: PersonalMemory[] = [
  {
    id: 'mem-1',
    key: 'नाव (Name)',
    value: 'शुभम कोळी (Shubham Koli)',
    category: 'personal',
    lastUpdated: Date.now() - 86400000 * 3,
  },
  {
    id: 'mem-2',
    key: 'निवासस्थान (Location)',
    value: 'महाराष्ट्र, भारत (Maharashtra, India)',
    category: 'personal',
    lastUpdated: Date.now() - 86400000 * 2,
  },
  {
    id: 'mem-3',
    key: 'भाषा प्राधान्य (Language)',
    value: 'मराठी व इंग्रजी (Marathi & English)',
    category: 'preference',
    lastUpdated: Date.now() - 86400000,
  },
  {
    id: 'mem-4',
    key: 'सकाळचा चहा (Morning Routine)',
    value: 'सकाळी ७:३० वाजता आलं-वेलची चहा आणि वृत्तपत्र वाचन',
    category: 'routine',
    lastUpdated: Date.now() - 3600000 * 12,
  }
];

const INITIAL_ALARMS: AlarmItem[] = [
  {
    id: 'alm-1',
    label: 'सकाळचा गजर (Wake Up Core)',
    time: '06:30',
    days: [1, 2, 3, 4, 5],
    enabled: true,
    sound: 'golden-pulse'
  },
  {
    id: 'alm-2',
    label: 'सायंकाळची कसरत (Fitness Protocol)',
    time: '18:00',
    days: [1, 3, 5],
    enabled: false,
    sound: 'jarvis-chime'
  }
];

const INITIAL_REMINDERS: ReminderItem[] = [
  {
    id: 'rem-1',
    title: 'विद्युत बिल व फोन रिचार्ज करणे',
    dueTime: new Date(Date.now() + 86400000).toISOString(),
    priority: 'high',
    completed: false,
    category: 'personal'
  },
  {
    id: 'rem-2',
    title: 'प्रकल्प कोड रिव्ह्यू आणि बॅकअप पूर्ण करणे',
    dueTime: new Date(Date.now() + 172800000).toISOString(),
    priority: 'normal',
    completed: false,
    category: 'work'
  }
];

const INITIAL_NOTES: NoteItem[] = [
  {
    id: 'not-1',
    title: 'MRUNEEL सिस्टीम आर्किटेक्चर',
    content: 'व्हॉइस-फर्स्ट जार्व्हिस इंटरफेस, वेक वर्ड "मृणील", कॅमेरा व्हिजन ओसीआर, स्थानिक ऑफलाइन इंजिन आणि बायोमेट्रिक सुरक्षा प्रोटोकॉल.',
    timestamp: Date.now() - 86400000 * 2,
    tags: ['ai', 'jarvis', 'architecture']
  },
  {
    id: 'not-2',
    title: 'आठवड्याची उद्दिष्टे (Weekly Goals)',
    content: '१. नवीन एआय मॉडेल चाचणी\n२. अँड्रॉइड एपीके बिल्ड एक्सपोर्ट\n३. मराठी व्हॉइस मॉडेल ऑप्टिमायझेशन',
    timestamp: Date.now() - 3600000 * 5,
    tags: ['goals', 'personal']
  }
];

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
