import React, { useState, useEffect } from 'react';
import {
  Battery,
  BatteryCharging,
  Wifi,
  WifiOff,
  Flashlight,
  Lock,
  Globe,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DeviceTelemetry, SupportedLanguage } from '../types/assistant';
import { soundFx } from '../utils/audioSynthesizer';

interface TelemetryBarProps {
  telemetry: DeviceTelemetry;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  isTorchOn: boolean;
  onToggleTorch: () => void;
  onLockSystem: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isOnlineMode: boolean;
  onToggleOfflineMode?: () => void;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  telemetry,
  language,
  onLanguageChange,
  isTorchOn,
  onToggleTorch,
  onLockSystem,
  soundEnabled,
  onToggleSound,
  isOnlineMode,
  onToggleOfflineMode,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const cycleLanguage = () => {
    soundFx.playKeyClick();
    if (language === 'mr-IN') {
      onLanguageChange('hi-IN');
    } else if (language === 'hi-IN') {
      onLanguageChange('en-US');
    } else {
      onLanguageChange('mr-IN');
    }
  };

  const getLanguageLabel = () => {
    if (language === 'mr-IN') return 'मराठी';
    if (language === 'hi-IN') return 'हिंदी';
    return 'ENG';
  };

  const batteryPercent = telemetry.batteryLevel !== null
    ? Math.round(telemetry.batteryLevel * 100)
    : 85;

  return (
    <header className="w-full bg-black/90 border-b border-amber-500/20 px-2 sm:px-3 py-1.5 text-xs flex items-center justify-between backdrop-blur-md sticky top-0 z-40 select-none overflow-x-hidden">
      {/* Left: Assistant Logo & Time */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]"></div>
        <span className="font-bold tracking-wider text-amber-300 font-mono text-[11px] sm:text-xs">MRUNEEL</span>
        <span className="text-amber-500/40 hidden xs:inline">|</span>
        <span className="font-mono text-amber-200/90 tracking-wider text-[10px] sm:text-xs hidden xs:inline">{timeStr}</span>
      </div>

      {/* Middle: Online / Offline Intelligence Protocol */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleOfflineMode}
          className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded border text-[10px] sm:text-[11px] font-mono uppercase transition-colors cursor-pointer ${
            isOnlineMode && telemetry.isOnline
              ? 'bg-amber-950/30 border-amber-500/40 text-amber-300 hover:bg-amber-900/40'
              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
          }`}
          title={isOnlineMode ? 'Online Gemini Active (Click to switch to Offline Mode)' : 'Offline Autonomous Mode (Click to switch to Online)'}
          aria-label={isOnlineMode ? 'Online Gemini Active. Click to switch to Offline Mode' : 'Offline Autonomous Mode. Click to switch to Online Mode'}
        >
          {telemetry.isOnline && isOnlineMode ? (
            <Wifi className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
          ) : (
            <WifiOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400" />
          )}
          <span>{isOnlineMode && telemetry.isOnline ? 'ONLINE' : 'OFFLINE'}</span>
        </button>
      </div>

      {/* Right: Hardware Telemetry Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Language Switcher */}
        <button
          onClick={cycleLanguage}
          aria-label={`Current language: ${getLanguageLabel()}. Click to switch language.`}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-900/40 hover:bg-amber-800/60 border border-amber-500/30 text-amber-200 transition-colors cursor-pointer"
        >
          <Globe className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
          <span className="font-semibold text-[10px] sm:text-[11px]">{getLanguageLabel()}</span>
        </button>

        {/* Torch / Flashlight Quick Toggle */}
        <button
          onClick={onToggleTorch}
          aria-label={isTorchOn ? 'Flashlight ON' : 'Flashlight OFF'}
          className={`p-1 rounded transition-all cursor-pointer ${
            isTorchOn
              ? 'bg-amber-400 text-black shadow-[0_0_12px_#fbbf24]'
              : 'bg-zinc-900 text-amber-400/80 hover:text-amber-300 border border-amber-500/20'
          }`}
          title="Toggle Android Flashlight"
        >
          <Flashlight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>

        {/* Sound FX Toggle */}
        <button
          onClick={onToggleSound}
          aria-label={soundEnabled ? 'Futuristic Sound Effects ON' : 'Sound Effects Muted'}
          className="p-1 rounded bg-zinc-900 text-amber-400/80 hover:text-amber-300 border border-amber-500/20 transition-all cursor-pointer"
          title="Toggle Sound Effects"
        >
          {soundEnabled ? <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-500" />}
        </button>

        {/* Battery Telemetry */}
        <div
          className="flex items-center gap-0.5 sm:gap-1 text-amber-300 font-mono text-[10px] sm:text-[11px]"
          title={`Android Battery: ${batteryPercent}% ${telemetry.isCharging ? '(Charging)' : ''}`}
        >
          {telemetry.isCharging ? (
            <BatteryCharging className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400 animate-pulse" />
          ) : (
            <Battery className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
          )}
          <span>{batteryPercent}%</span>
        </div>

        {/* Lock System */}
        <button
          onClick={onLockSystem}
          aria-label="Engage Security Lock Screen"
          className="p-1 rounded bg-zinc-900 hover:bg-amber-950/60 text-amber-400/80 hover:text-amber-300 border border-amber-500/20 transition-all cursor-pointer"
          title="Engage Biometric / PIN Lock"
        >
          <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>
      </div>
    </header>
  );
};
