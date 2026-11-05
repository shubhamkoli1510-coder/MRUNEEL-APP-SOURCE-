import React, { useState } from 'react';
import {
  Bell,
  Clock,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  X,
  Volume2,
  Calendar,
} from 'lucide-react';
import { AlarmItem, ReminderItem, NoteItem, SupportedLanguage } from '../types/assistant';
import { MemoryManager } from '../utils/memoryManager';
import { soundFx } from '../utils/audioSynthesizer';
import { deviceBridge } from '../utils/deviceBridge';

interface AlarmsRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: SupportedLanguage;
}

export const AlarmsRemindersModal: React.FC<AlarmsRemindersModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<'alarms' | 'reminders' | 'notes'>('alarms');

  // State
  const [alarms, setAlarms] = useState<AlarmItem[]>(() => MemoryManager.getAlarms());
  const [reminders, setReminders] = useState<ReminderItem[]>(() => MemoryManager.getReminders());
  const [notes, setNotes] = useState<NoteItem[]>(() => MemoryManager.getNotes());

  // Form inputs
  const [alarmTime, setAlarmTime] = useState<string>('07:00');
  const [alarmLabel, setAlarmLabel] = useState<string>('');
  const [reminderTitle, setReminderTitle] = useState<string>('');
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [noteContent, setNoteContent] = useState<string>('');

  if (!isOpen) return null;

  // Alarm actions
  const handleAddAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alarmTime) return;
    soundFx.playAffirmative();
    deviceBridge.vibrate(50);
    const label = alarmLabel.trim() || (language === 'mr-IN' ? 'मृणील गजर' : 'MRUNEEL Alarm');
    const newAlarm = MemoryManager.addAlarm(alarmTime, label);
    setAlarms(MemoryManager.getAlarms());
    setAlarmLabel('');
    deviceBridge.sendNotification('MRUNEEL Alarm Set', `${label} scheduled for ${newAlarm.time}`);
  };

  const handleToggleAlarm = (id: string) => {
    soundFx.playKeyClick();
    MemoryManager.toggleAlarm(id);
    setAlarms(MemoryManager.getAlarms());
  };

  const handleDeleteAlarm = (id: string) => {
    soundFx.playKeyClick();
    MemoryManager.deleteAlarm(id);
    setAlarms(MemoryManager.getAlarms());
  };

  const testAlarmSound = () => {
    soundFx.playAlarmPulse();
    deviceBridge.vibrate([100, 100, 100]);
  };

  // Reminder actions
  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTitle.trim()) return;
    soundFx.playAffirmative();
    deviceBridge.vibrate(50);
    MemoryManager.addReminder(reminderTitle.trim());
    setReminders(MemoryManager.getReminders());
    setReminderTitle('');
  };

  const handleToggleReminder = (id: string) => {
    soundFx.playKeyClick();
    MemoryManager.toggleReminder(id);
    setReminders(MemoryManager.getReminders());
  };

  const handleDeleteReminder = (id: string) => {
    soundFx.playKeyClick();
    MemoryManager.deleteReminder(id);
    setReminders(MemoryManager.getReminders());
  };

  // Note actions
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    soundFx.playAffirmative();
    deviceBridge.vibrate(50);
    MemoryManager.addNote(noteContent.trim(), noteTitle.trim());
    setNotes(MemoryManager.getNotes());
    setNoteTitle('');
    setNoteContent('');
  };

  const handleDeleteNote = (id: string) => {
    soundFx.playKeyClick();
    MemoryManager.deleteNote(id);
    setNotes(MemoryManager.getNotes());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-zinc-950 border border-amber-500/30 rounded-2xl overflow-hidden flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(245,158,11,0.15)]">
        {/* Header */}
        <div className="px-4 py-3 bg-amber-950/40 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="font-mono text-sm tracking-wider text-amber-300 font-bold">
              {language === 'mr-IN' ? 'गजर, स्मरणपत्रे व टीपा' : 'TASKS, ALARMS & NOTES'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-full text-amber-400/80 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-amber-500/20 bg-black/40">
          <button
            onClick={() => { soundFx.playKeyClick(); setActiveTab('alarms'); }}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'alarms'
                ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-950/30'
                : 'text-amber-500/60 hover:text-amber-400'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{language === 'mr-IN' ? 'गजर (Alarms)' : 'ALARMS'}</span>
            <span className="text-[10px] bg-amber-900/60 px-1.5 rounded-full">{alarms.length}</span>
          </button>

          <button
            onClick={() => { soundFx.playKeyClick(); setActiveTab('reminders'); }}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'reminders'
                ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-950/30'
                : 'text-amber-500/60 hover:text-amber-400'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{language === 'mr-IN' ? 'स्मरणपत्रे (Reminders)' : 'REMINDERS'}</span>
            <span className="text-[10px] bg-amber-900/60 px-1.5 rounded-full">{reminders.length}</span>
          </button>

          <button
            onClick={() => { soundFx.playKeyClick(); setActiveTab('notes'); }}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'notes'
                ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-950/30'
                : 'text-amber-500/60 hover:text-amber-400'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{language === 'mr-IN' ? 'टीपा (Notes)' : 'NOTES'}</span>
            <span className="text-[10px] bg-amber-900/60 px-1.5 rounded-full">{notes.length}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: ALARMS */}
          {activeTab === 'alarms' && (
            <div className="space-y-4">
              <form onSubmit={handleAddAlarm} className="p-3 rounded-xl hud-panel space-y-3">
                <div className="flex items-center justify-between text-xs text-amber-300 font-mono">
                  <span>नवीन गजर जोडा (Add Alarm)</span>
                  <button
                    type="button"
                    onClick={testAlarmSound}
                    className="text-[11px] text-amber-400/80 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" /> रिंग टोन तपासा
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={alarmTime}
                    onChange={e => setAlarmTime(e.target.value)}
                    className="w-full bg-black/80 border border-amber-500/40 rounded-lg px-3 py-2 text-amber-200 text-sm font-mono focus:outline-none focus:border-amber-400"
                    required
                  />
                  <input
                    type="text"
                    placeholder="गजराचे नाव (उदा. व्यायाम, मीटिंग)"
                    value={alarmLabel}
                    onChange={e => setAlarmLabel(e.target.value)}
                    className="w-full bg-black/80 border border-amber-500/40 rounded-lg px-3 py-2 text-amber-200 text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  >
                    <Plus className="w-4 h-4" /> नवीन गजर जोडा (Save Alarm)
                  </button>
                </div>
              </form>

              {/* List */}
              <div className="space-y-2">
                {alarms.map(alarm => (
                  <div
                    key={alarm.id}
                    className="p-3 rounded-xl bg-black/60 border border-amber-500/20 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xl font-mono font-bold text-amber-300 tracking-wider">
                        {alarm.time}
                      </div>
                      <div className="text-xs text-amber-400/70">{alarm.label}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleAlarm(alarm.id)}
                        className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer ${
                          alarm.enabled ? 'bg-amber-500' : 'bg-zinc-800'
                        }`}
                        aria-label={`Toggle alarm ${alarm.label}`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-black transition-transform ${
                            alarm.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => handleDeleteAlarm(alarm.id)}
                        aria-label="Delete alarm"
                        className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: REMINDERS */}
          {activeTab === 'reminders' && (
            <div className="space-y-4">
              <form onSubmit={handleAddReminder} className="p-3 rounded-xl hud-panel flex gap-2">
                <input
                  type="text"
                  placeholder="नवीन स्मरणपत्र (उदा. उद्या संध्याकाळी औषध घेणे)"
                  value={reminderTitle}
                  onChange={e => setReminderTitle(e.target.value)}
                  className="flex-1 bg-black/80 border border-amber-500/40 rounded-lg px-3 py-2 text-amber-200 text-xs focus:outline-none focus:border-amber-400"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> जोडा
                </button>
              </form>

              <div className="space-y-2">
                {reminders.map(rem => (
                  <div
                    key={rem.id}
                    onClick={() => handleToggleReminder(rem.id)}
                    className="p-3 rounded-xl bg-black/60 border border-amber-500/20 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {rem.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-amber-500/60 shrink-0" />
                      )}
                      <span className={`text-xs ${rem.completed ? 'line-through text-zinc-500' : 'text-amber-200'}`}>
                        {rem.title}
                      </span>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteReminder(rem.id);
                      }}
                      aria-label="Delete reminder"
                      className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <form onSubmit={handleAddNote} className="p-3 rounded-xl hud-panel space-y-2">
                <input
                  type="text"
                  placeholder="टीपेचे शीर्षक (Title)"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  className="w-full bg-black/80 border border-amber-500/40 rounded-lg px-3 py-1.5 text-amber-200 text-xs focus:outline-none focus:border-amber-400"
                />
                <textarea
                  rows={2}
                  placeholder="टीपेचा तपशील (Note content)..."
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  className="w-full bg-black/80 border border-amber-500/40 rounded-lg px-3 py-1.5 text-amber-200 text-xs focus:outline-none focus:border-amber-400"
                  required
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> टीप साठवा
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {notes.map(note => (
                  <div key={note.id} className="p-3 rounded-xl bg-black/60 border border-amber-500/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 text-xs">{note.title}</span>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        aria-label="Delete note"
                        className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-amber-200/90 whitespace-pre-wrap">{note.content}</p>
                    <div className="text-[10px] text-amber-500/50 font-mono">
                      {new Date(note.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
