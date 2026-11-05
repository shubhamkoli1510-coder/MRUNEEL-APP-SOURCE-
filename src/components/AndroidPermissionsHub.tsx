import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  X,
  CheckCircle2,
  HelpCircle,
  Smartphone,
  Layers,
} from 'lucide-react';
import { ANDROID_PERMISSIONS_CATALOG, deviceBridge } from '../utils/deviceBridge';
import { AndroidPermissionStatus, SupportedLanguage } from '../types/assistant';
import { soundFx } from '../utils/audioSynthesizer';

interface AndroidPermissionsHubProps {
  isOpen: boolean;
  onClose: () => void;
  language: SupportedLanguage;
}

export const AndroidPermissionsHub: React.FC<AndroidPermissionsHubProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [permissions, setPermissions] = useState<AndroidPermissionStatus[]>(ANDROID_PERMISSIONS_CATALOG);
  const [testResult, setTestResult] = useState<{ id: string; status: string; detail?: string } | null>(null);

  if (!isOpen) return null;

  const testPermission = async (perm: AndroidPermissionStatus) => {
    soundFx.playKeyClick();
    setTestResult({ id: perm.id, status: 'testing' });

    try {
      if (perm.id === 'perm-mic') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        setTestResult({ id: perm.id, status: 'success', detail: 'मायक्रोफोन परवानगी मंजूर (Granted)' });
        updateStatus(perm.id, 'granted');
      } else if (perm.id === 'perm-cam') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());
        setTestResult({ id: perm.id, status: 'success', detail: 'कॅमेरा परवानगी मंजूर (Granted)' });
        updateStatus(perm.id, 'granted');
      } else if (perm.id === 'perm-notif') {
        const res = await deviceBridge.requestNotificationPermission();
        if (res === 'granted') {
          deviceBridge.sendNotification('MRUNEEL Core', 'सूचना प्रणाली सक्रिय झाली आहे.');
          setTestResult({ id: perm.id, status: 'success', detail: 'सूचना प्रणाली सक्रिय (Granted)' });
          updateStatus(perm.id, 'granted');
        } else {
          setTestResult({ id: perm.id, status: 'denied', detail: 'वापरकर्त्याने नकार दिला (Denied)' });
          updateStatus(perm.id, 'denied');
        }
      } else if (perm.id === 'perm-vibrate') {
        deviceBridge.vibrate([100, 50, 100]);
        setTestResult({ id: perm.id, status: 'success', detail: 'हॅप्टिक व्हायब्रेटर कार्यरत (Hardware Active)' });
        updateStatus(perm.id, 'granted');
      } else if (perm.id === 'perm-location') {
        const pos = await deviceBridge.getCurrentPosition();
        if (pos) {
          setTestResult({
            id: perm.id,
            status: 'success',
            detail: `स्थान प्राप्त: ${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)}`
          });
          updateStatus(perm.id, 'granted');
        } else {
          setTestResult({ id: perm.id, status: 'denied', detail: 'स्थान परवानगी उपलब्ध नाही' });
        }
      } else if (perm.isNativeOnly) {
        setTestResult({
          id: perm.id,
          status: 'native_required',
          detail: 'हे वैशिष्ट्य स्क्रीन बंद असताना चालण्यासाठी Android Native Foreground Service (APK) आवश्यक आहे. खालील APK एक्सपोर्ट टॅब तपासा.'
        });
      }
    } catch (err) {
      setTestResult({ id: perm.id, status: 'error', detail: (err as Error).message });
    }
  };

  const updateStatus = (id: string, status: 'granted' | 'denied' | 'prompt') => {
    setPermissions(prev => prev.map(p => p.id === id ? { ...p, webApiStatus: status } : p));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-zinc-950 border border-amber-500/30 rounded-2xl overflow-hidden flex flex-col max-h-[88vh] shadow-[0_0_50px_rgba(245,158,11,0.2)]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-amber-950/40 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-400" />
            <h2 className="font-mono text-sm tracking-wider text-amber-300 font-bold">
              ANDROID PERMISSIONS & SERVICES MATRIX
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

        {/* Informational Guidance Callout */}
        <div className="p-3 bg-amber-950/20 border-b border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
          <Layers className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-200">
              {language === 'mr-IN'
                ? 'अँड्रॉइड हार्डवेअर एकात्मता व परवानगी पारदर्शकता:'
                : 'Android Hardware & Permissions Transparency:'}
            </p>
            <p className="text-amber-400/80 text-[11px] mt-0.5">
              {language === 'mr-IN'
                ? 'मायक्रोफोन, कॅमेरा, बॅटरी, व्हायब्रेशन आणि बायोमेट्रिक्स थेट चालू आहेत. मात्र स्क्रीन बंद असताना सतत "Mruneel" वेक-वर्ड ऐकण्यासाठी Native Android Foreground Service (APK) लागते.'
                : 'Microphone, camera, battery, and haptics function via Web APIs. Background screen-off hotword listening requires an Android Foreground Service with WakeLock (available in the APK build).'}
            </p>
          </div>
        </div>

        {/* Matrix List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {permissions.map(perm => (
            <div
              key={perm.id}
              className={`p-3.5 rounded-xl border transition-all ${
                perm.isNativeOnly
                  ? 'bg-zinc-950/70 border-amber-700/30'
                  : 'bg-black/60 border-amber-500/20 hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-300 text-xs">{perm.name}</span>
                    {perm.isNativeOnly ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-900/40 border border-amber-600/40 text-amber-300 text-[10px] font-mono">
                        NATIVE ANDROID SERVICE
                      </span>
                    ) : perm.webApiStatus === 'granted' ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> GRANTED
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-400 text-[10px] font-mono">
                        WEB API AVAILABLE
                      </span>
                    )}
                  </div>

                  <p className="font-mono text-[11px] text-amber-400/60">
                    Manifest: <code className="text-amber-300">{perm.androidManifestKey}</code>
                  </p>
                  <p className="text-xs text-amber-200/80 leading-relaxed">{perm.description}</p>
                </div>

                <button
                  onClick={() => testPermission(perm)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 cursor-pointer ${
                    perm.isNativeOnly
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700'
                      : 'bg-amber-600 hover:bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  }`}
                >
                  {perm.isNativeOnly ? 'माहिती (Info)' : 'चाचणी (Test)'}
                </button>
              </div>

              {/* Individual test feedback */}
              {testResult?.id === perm.id && (
                <div className={`mt-2.5 p-2 rounded-lg text-xs font-mono flex items-center gap-2 ${
                  testResult.status === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                    : testResult.status === 'native_required'
                    ? 'bg-amber-950/50 border border-amber-500/30 text-amber-300'
                    : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
                }`}>
                  {testResult.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : testResult.status === 'native_required' ? (
                    <HelpCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{testResult.detail}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
