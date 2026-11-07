import React from 'react';
import { AssistantState, SupportedLanguage } from '../types/assistant';
import { Mic, Volume2, Sparkles, AlertCircle, Eye, Loader2 } from 'lucide-react';

interface ArcReactorCoreProps {
  state: AssistantState;
  language: SupportedLanguage;
  wakeWordEnabled: boolean;
  onCoreClick: () => void;
  interimTranscript?: string;
}

export const ArcReactorCore: React.FC<ArcReactorCoreProps> = ({
  state,
  language,
  wakeWordEnabled,
  onCoreClick,
  interimTranscript,
}) => {
  // Label based on current language and state
  const getStateLabel = () => {
    if (interimTranscript) {
      return `"${interimTranscript}"`;
    }
    switch (state) {
      case 'listening':
        return language === 'mr-IN' ? 'ऐकत आहे... बोला (Listening...)' : 'LISTENING... SPEAK NOW';
      case 'thinking':
        return language === 'mr-IN' ? 'विचार करत आहे... (Processing)' : 'PROCESSING INTELLIGENCE...';
      case 'speaking':
        return language === 'mr-IN' ? 'मृणील बोलत आहे... (Speaking)' : 'TRANSMITTING VOICE...';
      case 'scanning':
        return language === 'mr-IN' ? 'ऑप्टिकल स्कॅनिंग... (Scanning)' : 'OPTICAL VISION ACTIVE';
      case 'error':
        return language === 'mr-IN' ? 'सिस्टीम त्रुटी (System Alert)' : 'CORE WARNING';
      default:
        if (wakeWordEnabled) {
          return language === 'mr-IN'
            ? 'सज्ज: "मृणील" म्हणा किंवा टॅप करा'
            : 'READY: SAY "MRUNEEL" OR TAP CORE';
        }
        return language === 'mr-IN' ? 'सज्ज: टॅप करा (TAP TO SPEAK)' : 'ONLINE: TAP TO SPEAK';
    }
  };

  const getRingColor = () => {
    switch (state) {
      case 'listening':
        return 'border-cyan-300 shadow-[0_0_52px_rgba(34,211,238,0.8)] scale-105';
      case 'thinking':
        return 'border-amber-300 shadow-[0_0_58px_rgba(251,191,36,0.7)] animate-pulse';
      case 'speaking':
        return 'border-sky-400 shadow-[0_0_54px_rgba(56,189,248,0.85)]';
      case 'scanning':
        return 'border-emerald-400 shadow-[0_0_45px_rgba(52,211,153,0.7)]';
      case 'error':
        return 'border-rose-500 shadow-[0_0_45px_rgba(244,63,94,0.8)]';
      default:
        return 'border-sky-500/70 shadow-[0_0_34px_rgba(14,165,233,0.5)]';
    }
  };

  const getCoreGlow = () => {
    switch (state) {
      case 'listening':
        return 'bg-gradient-to-tr from-blue-700 via-cyan-300 to-white shadow-[0_0_42px_#22d3ee] animate-pulse';
      case 'thinking':
        return 'bg-gradient-to-tr from-amber-600 via-yellow-300 to-white shadow-[0_0_48px_#fbbf24] animate-spin-slow';
      case 'error':
        return 'bg-gradient-to-tr from-red-600 via-rose-500 to-amber-400 shadow-[0_0_40px_#ef4444]';
      default:
        return 'bg-gradient-to-tr from-blue-950 via-sky-500 to-cyan-100 shadow-[0_0_30px_#0ea5e9]';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center my-1 sm:my-2.5 relative select-none shrink-0">
      {/* Outer Holographic Radar Reticle */}
      <div
        onClick={onCoreClick}
        role="button"
        tabIndex={0}
        aria-label="Activate MRUNEEL Assistant Voice Core"
        className="relative w-44 h-44 sm:w-56 sm:h-56 flex items-center justify-center cursor-pointer group transition-transform duration-300 active:scale-95 focus:outline-none"
      >
        {/* Layer 1: Outermost Rotating Telemetry Ring */}
        <div
          className={`absolute inset-0 rounded-full border border-dashed border-sky-400/40 transition-all duration-700 ${
            state === 'thinking' ? 'animate-spin-reverse' : 'animate-spin-slow'
          }`}
          style={{ borderSpacing: '8px' }}
        >
          {/* Compass / HUD Ticks */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-400 rounded-full shadow-[0_0_8px_#fbbf24]"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-400 rounded-full shadow-[0_0_8px_#fbbf24]"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-amber-400 rounded-full shadow-[0_0_8px_#fbbf24]"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-amber-400 rounded-full shadow-[0_0_8px_#fbbf24]"></div>
        </div>

        {/* Layer 2: Middle Segmented Arc Ring */}
        <div
          className={`absolute inset-4 rounded-full border-2 border-t-cyan-300 border-r-sky-500/40 border-b-amber-400/50 border-l-blue-400/50 transition-all duration-500 ${
            state === 'thinking' ? 'animate-spin' : 'animate-spin-reverse'
          }`}
        ></div>

        {/* Layer 3: Concentric Geometric Arc SVG */}
        <svg
          className={`absolute inset-8 w-48 h-48 sm:w-56 sm:h-56 transition-transform duration-700 ${
            state === 'listening' ? 'rotate-45' : ''
          }`}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="rgba(56, 189, 248, 0.34)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />
          <circle
            cx="50"
            cy="50"
            r="36"
            fill="none"
            stroke="rgba(34, 211, 238, 0.5)"
            strokeWidth="2"
            strokeDasharray="20 15 30 10"
          />
          <circle
            cx="50"
            cy="50"
            r="28"
            fill="none"
            stroke="rgba(251, 191, 36, 0.38)"
            strokeWidth="1"
          />
        </svg>

        {/* Layer 4: Floating Reactive Core Sphere */}
        <div
          className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 ${getRingColor()} flex items-center justify-center bg-[#061426]/90 backdrop-blur-md transition-all duration-500 z-10 group-hover:scale-105`}
        >
          {/* Central Golden Energy Nucleus */}
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${getCoreGlow()} flex items-center justify-center transition-all duration-500`}>
            {state === 'thinking' && <Loader2 className="w-8 h-8 text-black animate-spin" />}
            {state === 'listening' && <Mic className="w-8 h-8 text-black animate-pulse" />}
            {state === 'speaking' && <Volume2 className="w-8 h-8 text-black animate-bounce" />}
            {state === 'scanning' && <Eye className="w-8 h-8 text-black" />}
            {state === 'error' && <AlertCircle className="w-8 h-8 text-white" />}
            {state === 'idle' && <Sparkles className="w-7 h-7 text-black drop-shadow-md" />}
          </div>

          {/* Micro HUD Crosshair */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
            <div className="w-full h-[1px] bg-amber-400"></div>
            <div className="h-full w-[1px] bg-amber-400 absolute"></div>
          </div>
        </div>
      </div>

      {/* Dynamic Status Display & Telemetry Indicator */}
      <div className="mt-2 text-center max-w-sm px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/50 border border-sky-400/35 text-sky-200 text-xs tracking-wider uppercase font-semibold">
          <span className={`w-2 h-2 rounded-full ${state === 'listening' ? 'bg-amber-400 animate-ping' : state === 'error' ? 'bg-rose-500' : 'bg-emerald-400'}`}></span>
          <span className="truncate">{getStateLabel()}</span>
        </div>

        <p className="text-[11px] text-sky-300/60 mt-1 font-mono tracking-widest uppercase">
          MRUNEEL CORE v3.8 • JARVIS PROTOCOL
        </p>
      </div>
    </div>
  );
};
