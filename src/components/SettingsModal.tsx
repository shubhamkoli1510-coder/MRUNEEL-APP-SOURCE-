import React, { useState } from 'react';
import {
  Settings,
  Brain,
  Sliders,
  Shield,
  Plus,
  Trash2,
  X,
  Volume2,
  Lock,
} from 'lucide-react';
import { AssistantSettings, PersonalMemory, SupportedLanguage } from '../types/assistant';
import { MemoryManager } from '../utils/memoryManager';
import { saveNewPin } from '../utils/security';
import { soundFx } from '../utils/audioSynthesizer';
import { deviceBridge } from '../utils/deviceBridge';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AssistantSettings;
  onUpdateSettings: (newSettings: AssistantSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'memory' | 'security'>('voice');
  const [memories, setMemories] = useState<PersonalMemory[]>(() => MemoryManager.getMemories());

  // Form states for memory
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<PersonalMemory['category']>('personal');

  // Security state
  const [newPinInput, setNewPinInput] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState('');

  if (!isOpen) return null;

  const handleSettingChange = <K extends keyof AssistantSettings>(key: K, value: AssistantSettings[K]) => {
    soundFx.playKeyClick();
    const updated = { ...settings, [key]: value };
    onUpdateSettings(updated);
    MemoryManager.saveSettings(updated);
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;
    soundFx.playAffirmative();
    deviceBridge.vibrate(50);
    MemoryManager.addMemory(newKey.trim(), newValue.trim(), newCategory);
    setMemories(MemoryManager.getMemories());
    setNewKey('');
    setNewValue('');
  };

  const handleDeleteMemory = (id: string) => {
    soundFx.playKeyClick();
    MemoryManager.deleteMemory(id);
    setMemories(MemoryManager.getMemories());
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.length !== 4 || !/^\d{4}$/.test(newPinInput)) {
      setPinChangeMsg('पिन नेमका ४ अंकी असणे आवश्यक आहे (Must be 4 digits)');
      return;
    }
    soundFx.playAffirmative();
    deviceBridge.vibrate([40, 40, 80]);
    await saveNewPin(newPinInput);
    handleSettingChange('pinCode', newPinInput);
    setPinChangeMsg('नवीन पिन यशस्वीरित्या सेट केला! (PIN updated)');
    setNewPinInput('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-zinc-950 border border-amber-500/30 rounded-2xl overflow-hidden flex flex-col max-h-[88vh] shadow-[0_0_60px_rgba(245,158,11,0.2)]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-amber-950/40 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <h2 className="font-mono text-sm tracking-wider text-amber-300 font-bold">
              MRUNEEL CONFIGURATION & MEMORY
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
            onClick={() => { soundFx.playKeyClick(); setActiveTab('voice'); }}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'voice'
                ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-950/30'
                : 'text-amber-500/60 hover:text-amber-400'
            }`}
          >
            <Sliders className="w-4 h-4" /> व्हॉइस व प्रणाली
          </button>

          <button
            onClick={() => { soundFx.playKeyClick(); setActiveTab('memory'); }}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'memory'
                ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-950/30'
                : 'text-amber-500/60 hover:text-amber-400'
            }`}
          >
            <Brain className="w-4 h-4" /> एआय स्मृती (Memory)
          </button>

          <button
            onClick={() => { soundFx.playKeyClick(); setActiveTab('security'); }}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'security'
                ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-950/30'
                : 'text-amber-500/60 hover:text-amber-400'
            }`}
          >
            <Shield className="w-4 h-4" /> सुरक्षा व पिन
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: VOICE & PREFERENCES */}
          {activeTab === 'voice' && (
            <div className="space-y-4 text-xs text-amber-200">
              {/* User Honorific & Name */}
              <div className="p-3.5 rounded-xl hud-panel space-y-3">
                <div className="font-bold text-amber-300 font-mono">वापरकर्ता प्रोफाइल (User Identity)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-amber-400/80 mb-1">नाव (Name)</label>
                    <input
                      type="text"
                      value={settings.userName}
                      onChange={e => handleSettingChange('userName', e.target.value)}
                      className="w-full bg-black/80 border border-amber-500/30 rounded-lg px-3 py-1.5 text-amber-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-amber-400/80 mb-1">आदरार्थी संबोधन (Honorific)</label>
                    <select
                      value={settings.honorific}
                      onChange={e => handleSettingChange('honorific', e.target.value)}
                      className="w-full bg-black/80 border border-amber-500/30 rounded-lg px-3 py-1.5 text-amber-200 focus:outline-none focus:border-amber-400"
                    >
                      <option value="साहेब">साहेब (Saheb)</option>
                      <option value="श्रीमान">श्रीमान (Sir / Shreeman)</option>
                      <option value="Sir">Sir</option>
                      <option value="Boss">Boss</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Language Preference */}
              <div className="p-3.5 rounded-xl hud-panel space-y-2">
                <div className="font-bold text-amber-300 font-mono">डीफॉल्ट भाषा (Default Language)</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['mr-IN', 'hi-IN', 'en-US'] as SupportedLanguage[]).map(lang => (
                    <button
                      key={lang}
                      onClick={() => handleSettingChange('defaultLanguage', lang)}
                      className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                        settings.defaultLanguage === lang
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : 'bg-black/60 border-zinc-800 text-zinc-400 hover:border-amber-500/40'
                      }`}
                    >
                      {lang === 'mr-IN' ? 'मराठी (Marathi)' : lang === 'hi-IN' ? 'हिंदी (Hindi)' : 'English (JARVIS)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Speed & Pitch */}
              <div className="p-3.5 rounded-xl hud-panel space-y-3">
                <div className="font-bold text-amber-300 font-mono flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span>आवाज गती व पट्टी (Speech Pitch & Speed)</span>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-amber-400/80 mb-1">
                    <span>बोलण्याची गती (Speed)</span>
                    <span className="font-mono">{settings.voiceSpeed}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={settings.voiceSpeed}
                    onChange={e => handleSettingChange('voiceSpeed', parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-amber-400/80 mb-1">
                    <span>आवाज पट्टी (Pitch)</span>
                    <span className="font-mono">{settings.voicePitch}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.2"
                    step="0.05"
                    value={settings.voicePitch}
                    onChange={e => handleSettingChange('voicePitch', parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="p-3.5 rounded-xl hud-panel space-y-3">
                <div className="font-bold text-amber-300 font-mono">सहाय्यक स्विचेस (System Toggles)</div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-amber-200">वेक वर्ड "मृणील" सक्रिय ठेवा</span>
                    <p className="text-[11px] text-amber-500/60">Continuous background wake-word listening</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.wakeWordEnabled}
                    onChange={e => handleSettingChange('wakeWordEnabled', e.target.checked)}
                    className="w-5 h-5 accent-amber-500 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-amber-500/10 pt-2">
                  <div>
                    <span className="font-semibold text-amber-200">जार्व्हिस ऑडिओ इफेक्ट्स</span>
                    <p className="text-[11px] text-amber-500/60">Futuristic resonant golden HUD sounds</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.soundEffectsEnabled}
                    onChange={e => handleSettingChange('soundEffectsEnabled', e.target.checked)}
                    className="w-5 h-5 accent-amber-500 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-amber-500/10 pt-2">
                  <div>
                    <span className="font-semibold text-amber-200">स्थानिक ऑफलाइन मोड (Autonomous Offline-First)</span>
                    <p className="text-[11px] text-amber-500/60">Force on-device Marathi engine without internet queries</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.offlineFirstMode}
                    onChange={e => handleSettingChange('offlineFirstMode', e.target.checked)}
                    className="w-5 h-5 accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI PERSONAL MEMORY */}
          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                <p>
                  मृणील या स्मृती वापरून तुम्हाला वैयक्तिकृत उत्तरे देतो. ही माहिती थेट तुमच्या फोनमध्ये सुरक्षित साठवली जाते.
                </p>
              </div>

              {/* Add Memory Form */}
              <form onSubmit={handleAddMemory} className="p-3 rounded-xl hud-panel space-y-2">
                <div className="text-xs font-mono text-amber-300 font-bold">नवीन स्मृती जोडा (Add Memory)</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="की (उदा. आवडता छंद)"
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    className="bg-black/80 border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs text-amber-200 focus:outline-none focus:border-amber-400"
                    required
                  />
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as PersonalMemory['category'])}
                    className="bg-black/80 border border-amber-500/30 rounded-lg px-2 py-1.5 text-xs text-amber-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="personal">वैयक्तिक (Personal)</option>
                    <option value="preference">प्राधान्य (Preference)</option>
                    <option value="routine">दिनचर्या (Routine)</option>
                    <option value="contact">संपर्क (Contact)</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="तपशील (उदा. तंत्रज्ञान आणि कोडिंग करणे)"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  className="w-full bg-black/80 border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs text-amber-200 focus:outline-none focus:border-amber-400"
                  required
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> स्मृती जतन करा
                  </button>
                </div>
              </form>

              {/* Memory List */}
              <div className="space-y-2">
                {memories.map(mem => (
                  <div
                    key={mem.id}
                    className="p-3 rounded-xl bg-black/60 border border-amber-500/20 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-amber-300 text-xs">{mem.key}</div>
                      <div className="text-xs text-amber-200/90">{mem.value}</div>
                      <div className="text-[10px] text-amber-500/50 font-mono mt-0.5">
                        वर्गवारी: {mem.category}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMemory(mem.id)}
                      aria-label={`Delete memory ${mem.key}`}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-4 text-xs text-amber-200">
              <div className="p-3.5 rounded-xl hud-panel space-y-3">
                <div className="font-bold text-amber-300 font-mono flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>मास्टर पिन बदला (Update Master PIN)</span>
                </div>
                <form onSubmit={handleUpdatePin} className="space-y-3">
                  <p className="text-[11px] text-amber-400/80">
                    सध्याचा डीफॉल्ट पिन: <strong>1234</strong>. नवीन ४-अंकी गुप्त पिन सेट करा.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="४ अंकी पिन (e.g. 5678)"
                      value={newPinInput}
                      onChange={e => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                      className="w-48 bg-black/80 border border-amber-500/40 rounded-lg px-3 py-2 text-amber-200 font-mono text-center tracking-widest text-sm focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      disabled={newPinInput.length !== 4}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-black font-bold text-xs cursor-pointer"
                    >
                      पिन बदला
                    </button>
                  </div>
                  {pinChangeMsg && (
                    <div className="text-emerald-400 font-mono text-xs">{pinChangeMsg}</div>
                  )}
                </form>
              </div>

              <div className="p-3.5 rounded-xl hud-panel space-y-3">
                <div className="font-bold text-amber-300 font-mono">बायोमेट्रिक ऑटो-लॉक</div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-amber-200">अॅप सुरू करताना सुरक्षा लॉक विचारा</span>
                    <p className="text-[11px] text-amber-500/60">Require PIN or Biometrics on app launch</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.biometricLockEnabled}
                    onChange={e => handleSettingChange('biometricLockEnabled', e.target.checked)}
                    className="w-5 h-5 accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
