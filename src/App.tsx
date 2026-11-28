import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  Camera,
  Bell,
  Settings,
  Smartphone,
  Download,
  Mic,
  Volume2,
  Sparkles,
  Code2,
} from 'lucide-react';
import {
  AssistantSettings,
  AssistantState,
  ChatMessage,
  DeviceTelemetry,
  SupportedLanguage,
} from './types/assistant';
import { MemoryManager } from './utils/memoryManager';
import { soundFx } from './utils/audioSynthesizer';
import { speechService } from './utils/speechService';
import { deviceBridge } from './utils/deviceBridge';
import { androidDeviceActions } from './utils/androidDeviceActions';
import { parseOfflineCommand } from './utils/offlineEngine';
import { ConversationalContext } from './utils/marathiConversationalEngine';
import { runAgentTurn } from './core/agentKernel';
import { createTaskPlan } from './core/taskPlanner';
import { executePlanStep } from './core/taskExecutor';
import { androidDeviceAdapter } from './core/androidDeviceAdapterNative';
import { createMemoryCommandStore, handleMemoryCommand } from './core/memoryCommands';
import { formatResearchResponse, type ResearchSource } from './core/researchGrounding';

// Components
import { TelemetryBar } from './components/TelemetryBar';
import { ArcReactorCore } from './components/ArcReactorCore';
import { VoiceWaveVisualizer } from './components/VoiceWaveVisualizer';
import { ChatHUD } from './components/ChatHUD';
import { LockScreen } from './components/LockScreen';
import { CameraScanner } from './components/CameraScanner';
import { AlarmsRemindersModal } from './components/AlarmsRemindersModal';
import { AndroidPermissionsHub } from './components/AndroidPermissionsHub';
import { AndroidApkExportModal } from './components/AndroidApkExportModal';
import { SettingsModal } from './components/SettingsModal';
import { CodingLab } from './components/CodingLab';

interface NativeWakeWordPlugin {
  start(): Promise<void>;
  stop(): Promise<void>;
  addListener(eventName: 'wakeWordDetected', listenerFunc: (event: { transcript: string }) => void): Promise<{ remove: () => Promise<void> }>;
}

const NativeWakeWord = registerPlugin<NativeWakeWordPlugin>('NativeWakeWord');
const API_BASE_URL = 'https://mruneel-core-api.onrender.com';

export default function App() {
  // Settings & Memory
  const [settings, setSettings] = useState<AssistantSettings>(() => MemoryManager.getSettings());
  const [language, setLanguage] = useState<SupportedLanguage>(settings.defaultLanguage || 'mr-IN');
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    // Check if ?autostart=1 in query params to bypass lock in tests
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return false;
    }
    return settings.biometricLockEnabled;
  });

  // Assistant State
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [interimVoiceText, setInterimVoiceText] = useState<string>('');
  const [isTorchActive, setIsTorchActive] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(settings.soundEffectsEnabled);
  const [conversationalContext, setConversationalContext] = useState<ConversationalContext>({});

  // Hardware Telemetry
  const [telemetry, setTelemetry] = useState<DeviceTelemetry>({
    // Never invent device readings before the APIs report them.
    batteryLevel: null,
    isCharging: null,
    networkType: 'UNAVAILABLE',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
    downlinkSpeedMbps: null,
    orientationAlpha: 0,
    orientationBeta: 0,
    orientationGamma: 0,
  });

  // Active Modals
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [showAlarms, setShowAlarms] = useState<boolean>(false);
  const [showPermissions, setShowPermissions] = useState<boolean>(false);
  const [showApkExport, setShowApkExport] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showCodingLab, setShowCodingLab] = useState<boolean>(false);

  // Conversation Log
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg-init',
      sender: 'mruneel',
      text:
        settings.defaultLanguage === 'mr-IN'
          ? `हा बछा, मी इथंच आहे, बोल! "मृणील" म्हणा किंवा कोरवर टॅप करा.`
          : `MRUNEEL ready. Say "Mruneel" or tap the core. Phone actions depend on supported integrations and permissions.`,
      language: settings.defaultLanguage,
      timestamp: Date.now(),
    },
  ]);

  const activeListenStopRef = useRef<(() => void) | null>(null);

  // Sync sound settings with audioSynthesizer
  useEffect(() => {
    soundFx.setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  // Subscribe to real hardware telemetry
  useEffect(() => {
    const unsubscribe = deviceBridge.subscribeTelemetry(update => {
      setTelemetry(prev => ({ ...prev, ...update }));
    });
    return () => unsubscribe();
  }, []);

  // Android uses the native foreground listener; other platforms keep Web Speech.
  // The listener is armed only while unlocked and idle.
  useEffect(() => {
    let cancelled = false;
    let nativeListener: { remove: () => Promise<void> } | null = null;
    const shouldListen = !isLocked && settings.wakeWordEnabled && !showCamera && assistantState === 'idle';

    speechService.stopWakeWordListener();
    if (!shouldListen) {
      void NativeWakeWord.stop().catch(() => undefined);
      return () => { cancelled = true; };
    }

    if (Capacitor.getPlatform() === 'android') {
      const startNativeListener = async () => {
        try {
          nativeListener = await NativeWakeWord.addListener('wakeWordDetected', () => {
            if (!cancelled) startVoiceListening();
          });
          if (cancelled) {
            await nativeListener.remove();
            nativeListener = null;
            return;
          }
          await NativeWakeWord.start();
          if (cancelled) await NativeWakeWord.stop().catch(() => undefined);
        } catch (error) {
          console.warn('Native wake-word listener unavailable; using Web Speech fallback.', error);
          if (nativeListener) {
            await nativeListener.remove().catch(() => undefined);
            nativeListener = null;
          }
          if (!cancelled) {
            speechService.startWakeWordListener(
              extractedCommand => {
                if (extractedCommand) handleUserQuery(extractedCommand);
                else startVoiceListening();
              },
              language
            );
          }
        }
      };
      void startNativeListener();
    } else {
      speechService.startWakeWordListener(
        extractedCommand => {
          if (extractedCommand) handleUserQuery(extractedCommand);
          else startVoiceListening();
        },
        language
      );
    }

    return () => {
      cancelled = true;
      speechService.stopWakeWordListener();
      if (nativeListener) void nativeListener.remove().catch(() => undefined);
      if (Capacitor.getPlatform() === 'android') {
        void NativeWakeWord.stop().catch(() => undefined);
      }
    };
  }, [isLocked, settings.wakeWordEnabled, language, showCamera, assistantState]);

  // Execute Voice Command or Query
  const handleUserQuery = async (queryText: string, visionSnapshot?: string) => {
    if (!queryText.trim()) return;

    // Brain Router: classify and gate high-risk external actions before AI processing.
    const agentTurn = runAgentTurn({ text: queryText });
    const brainRoute = agentTurn.route;

    // Add user message to conversation log
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: Date.now(),
      visionThumbnail: visionSnapshot,
    };
    setMessages(prev => [...prev, userMsg]);
    setAssistantState('thinking');
    setInterimVoiceText('');

    // Explicit local-memory commands: save, recall, and clear only.
    // Storage stays on this device; nothing is uploaded or implicitly remembered.
    const memoryCommand = handleMemoryCommand(queryText, createMemoryCommandStore(), language === 'mr-IN' ? 'mr-IN' : 'en-US');
    if (memoryCommand.handled) {
      const memoryReply: ChatMessage = {
        id: `bot-${Date.now()}`, sender: 'mruneel', text: memoryCommand.response, language, timestamp: Date.now(),
        isOfflineResponse: !navigator.onLine, actionsTaken: [`Local memory: ${memoryCommand.action}`],
      };
      setMessages(prev => [...prev, memoryReply]);
      setAssistantState('speaking');
      speechService.speak(memoryCommand.response, language, settings.voiceSpeed, settings.voicePitch, () => setAssistantState('idle'));
      return;
    }

    // Never let high-risk requests be treated as completed actions by the chat model.
    if (brainRoute.disposition === 'approval_required' && brainRoute.decision.risk === 'high') {
      const gateText = language === 'mr-IN'
        ? 'ही कृती संवेदनशील आहे. मी कोणताही मेसेज पाठवला, कॉल केला, पैसे हलवले किंवा डेटा शेअर केला नाही. पुढे जाण्यापूर्वी स्पष्ट मंजुरी आवश्यक आहे. हवं असल्यास मी आधी मजकूर/योजना तयार करून देऊ शकतो.'
        : 'This is a sensitive action. I have not sent anything, called anyone, transferred money, or shared data. Explicit approval is required before proceeding. I can help prepare a draft or plan first.';
      const gateReply: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'mruneel',
        text: gateText,
        language,
        timestamp: Date.now(),
        actionsTaken: ['Brain Router: approval gate', 'No external action performed'],
      };
      setMessages(prev => [...prev, gateReply]);
      setAssistantState('speaking');
      speechService.speak(gateText, language, settings.voiceSpeed, settings.voicePitch, () => setAssistantState('idle'));
      return;
    }

    // Coding intents open the proposal-only Coding Lab; no automatic source mutation.
    if (agentTurn.route.decision.intent === 'coding') {
      setShowCodingLab(true);
      const codingNotice = language === 'mr-IN'
        ? 'Coding Lab उघडलं. बदलाचा प्रस्ताव तयार करण्यासाठी संबंधित file path आणि source code तिथे दे. मी repository आपोआप बदलत नाही.'
        : 'Coding Lab opened. Provide the exact file path and source there to generate a reviewable proposal. Repository files are not changed automatically.';
      const reply: ChatMessage = { id: `bot-${Date.now()}`, sender: 'mruneel', text: codingNotice, language, timestamp: Date.now(), actionsTaken: ['Coding Lab opened', 'Proposal-only; no files changed'] };
      setMessages(prev => [...prev, reply]);
      setAssistantState('speaking');
      speechService.speak(codingNotice, language, settings.voiceSpeed, settings.voicePitch, () => setAssistantState('idle'));
      return;
    }

    // Safe native device intents go through the shared planner + executor + adapter.
    // A direct, explicit user command is consent for these allowlisted low-impact actions only.
    const deviceIntent = parseOfflineCommand(queryText, language, { honorific: settings.honorific });
    if (deviceIntent.type === 'OPEN_SCREEN' || deviceIntent.type === 'OPEN_APP' || deviceIntent.type === 'SET_ALARM' || deviceIntent.type === 'ADJUST_VOLUME') {
      if (deviceIntent.type === 'SET_ALARM' && typeof deviceIntent.payload?.time !== 'string') {
        const reply: ChatMessage = { id: `bot-${Date.now()}`, sender: 'mruneel', text: deviceIntent.spokenResponse, language, timestamp: Date.now(), actionsTaken: ['No alarm action executed; time needed'] };
        setMessages(prev => [...prev, reply]);
        setAssistantState('speaking');
        speechService.speak(deviceIntent.spokenResponse, language, settings.voiceSpeed, settings.voicePitch, () => setAssistantState('idle'));
        return;
      }
      const plan = createTaskPlan(queryText);
      const execution = await executePlanStep({ plan, adapter: androidDeviceAdapter, approved: true });
      let actionText = deviceIntent.spokenResponse;
      const performed: string[] = [];
      if (execution.status === 'completed') {
        performed.push(execution.summary);
        if (deviceIntent.type === 'OPEN_APP') {
          actionText = language === 'mr-IN' ? 'अॅप उघडलं. Android adapter ने launch ची पुष्टी दिली.' : 'App launched and confirmed by the Android adapter.';
        } else if (deviceIntent.type === 'SET_ALARM') {
          actionText = language === 'mr-IN' ? 'फोनचा Clock उघडला. अलार्म सेट करण्यासाठी तिथे वेळ तपासून confirm कर; confirm होईपर्यंत अलार्म सेट झालेला नाही.' : 'The system Clock alarm setup opened. Review and confirm there; the alarm is not scheduled until you confirm it.';
        } else if (deviceIntent.type === 'ADJUST_VOLUME') {
          const data = execution.summary.match(/(\d+\/\d+)/)?.[1];
          actionText = language === 'mr-IN'
            ? (data ? `आवाज आता ${data} आहे.` : 'आवाज बदलला; native adapter ने कृती पूर्ण झाल्याची पुष्टी दिली.')
            : (data ? `Media volume is now ${data}.` : 'Volume adjusted and confirmed by the native adapter.');
        }
      } else {
        actionText = language === 'mr-IN'
          ? 'ही डिव्हाइस कृती पूर्ण झाली नाही. फोनची परवानगी किंवा उपलब्धता तपास.'
          : 'That device action could not be completed. Check Android availability and permissions.';
        performed.push(execution.summary);
      }
      const deviceReply: ChatMessage = {
        id: `bot-${Date.now()}`, sender: 'mruneel', text: actionText, language, timestamp: Date.now(),
        isOfflineResponse: !navigator.onLine, actionsTaken: performed.length ? performed : undefined,
      };
      setMessages(prev => [...prev, deviceReply]);
      setAssistantState('speaking');
      speechService.speak(actionText, language, settings.voiceSpeed, settings.voicePitch, () => setAssistantState('idle'));
      return;
    }

    // Grounded Research: only send research-intent queries to the Search-enabled server endpoint.
    if (agentTurn.mode === 'research') {
      if (!navigator.onLine || settings.offlineFirstMode) {
        const unavailable = language === 'mr-IN'
          ? 'सध्या इंटरनेट शोध उपलब्ध नाही. Offline mode मुळे live sources तपासलेले नाहीत.'
          : 'Live web research is unavailable offline. I have not checked current sources.';
        const reply: ChatMessage = { id: `bot-${Date.now()}`, sender: 'mruneel', text: unavailable, language, timestamp: Date.now(), isOfflineResponse: true, actionsTaken: ['Research not executed: offline'] };
        setMessages(prev => [...prev, reply]);
        setAssistantState('speaking');
        speechService.speak(unavailable, language, settings.voiceSpeed, settings.voicePitch, () => setAssistantState('idle'));
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/gemini/research`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(45000),
          body: JSON.stringify({ message: queryText, language }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.details || data.error || 'Research request failed');
        const sources = Array.isArray(data.sources) ? data.sources as ResearchSource[] : [];
        const answer = typeof data.text === 'string' ? data.text : 'Research provider returned no answer.';
        const searchQueries = Array.isArray(data.searchQueries) ? data.searchQueries.filter((q: unknown): q is string => typeof q === 'string') : [];
        const displayText = formatResearchResponse(answer, sources, searchQueries);
        const reply: ChatMessage = { id: `bot-${Date.now()}`, sender: 'mruneel', text: displayText, language, timestamp: Date.now(), actionsTaken: [`Grounded research: ${sources.length} sources`] };
        setMessages(prev => [...prev, reply]);
        setAssistantState('speaking');
        speechService.speak(answer, language, settings.voiceSpeed, settings.voicePitch, () => setAssistantState('idle'));
      } catch (err) {
        const failed = language === 'mr-IN'
          ? 'वेब शोध पूर्ण झाला नाही. सर्व्हर किंवा Google Search grounding उपलब्ध आहे का तपास. कोणतेही अप्रमाणित उत्तर दिलेले नाही.'
          : 'Web research failed. Check the server and Google Search grounding availability. No unverified result was presented.';
        const reply: ChatMessage = { id: `bot-${Date.now()}`, sender: 'mruneel', text: failed, language, timestamp: Date.now(), isOfflineResponse: true, actionsTaken: ['Research failed', err instanceof Error ? err.message.slice(0, 100) : 'Unknown error'] };
        setMessages(prev => [...prev, reply]);
        setAssistantState('speaking');
        speechService.speak(failed, language, settings.voiceSpeed, settings.voicePitch, () => setAssistantState('idle'));
      }
      return;
    }

    // Dual-Core Strategy: Check if Offline or Online
    const isOnline = navigator.onLine && !settings.offlineFirstMode;

    if (!isOnline) {
      // Execute Autonomous Offline Engine with conversational & emotional intelligence
      const offlineResult = parseOfflineCommand(queryText, language, {
        batteryLevel: telemetry.batteryLevel,
        isCharging: telemetry.isCharging,
        conversationalContext,
        honorific: settings.honorific,
      });

      if (offlineResult.newContext) {
        setConversationalContext(offlineResult.newContext);
      }

      // Handle any side effects from offline action
      const actionsTaken: string[] = [];
      let offlineSpokenResponse = offlineResult.spokenResponse;
      if (offlineResult.actionTaken) {
        actionsTaken.push(offlineResult.actionTaken);
      }
      if (offlineResult.detectedEmotion) {
        actionsTaken.push(`भावना: ${offlineResult.detectedEmotion}`);
      }

      if (offlineResult.type === 'TOGGLE_TORCH') {
        const next = offlineResult.payload?.state as boolean;
        try {
          if (Capacitor.getPlatform() === 'android') {
            const result = await androidDeviceActions.setTorch(next);
            setIsTorchActive(result.enabled);
            actionsTaken.push(result.enabled ? 'Native torch enabled' : 'Native torch disabled');
          } else {
            const result = await deviceBridge.toggleTorch(next);
            setIsTorchActive(result);
            actionsTaken.push(result ? 'Torch enabled' : 'Torch disabled');
          }
        } catch {
          offlineSpokenResponse = language === 'mr-IN'
            ? 'Torch चालू किंवा बंद करता आला नाही. Camera permission किंवा फोनचा flash तपास.'
            : 'I could not change the torch. Check camera permission or flash hardware.';
          actionsTaken.push('Torch action failed; state not claimed');
        }
      } else if (offlineResult.type === 'SET_ALARM') {
        const time = (offlineResult.payload?.time as string) || '07:00';
        const label = (offlineResult.payload?.label as string) || 'MRUNEEL गजर';
        MemoryManager.addAlarm(time, label);
      } else if (offlineResult.type === 'ADD_NOTE') {
        const content = (offlineResult.payload?.content as string) || queryText;
        MemoryManager.addNote(content);
      } else if (offlineResult.type === 'SET_REMINDER') {
        const title = (offlineResult.payload?.title as string) || queryText;
        MemoryManager.addReminder(title);
      } else if (offlineResult.type === 'OPEN_CAMERA') {
        setShowCamera(true);
      } else if (offlineResult.type === 'LOCK_SYSTEM') {
        setIsLocked(true);
      }

      const botReply: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'mruneel',
        text: offlineSpokenResponse,
        language,
        timestamp: Date.now(),
        isOfflineResponse: true,
        actionsTaken: actionsTaken.length > 0 ? actionsTaken : undefined,
      };

      setMessages(prev => [...prev, botReply]);
      setAssistantState('speaking');

      speechService.speak(
        offlineSpokenResponse,
        language,
        settings.voiceSpeed,
        settings.voicePitch,
        () => setAssistantState('idle')
      );
    } else {
      // Online Gemini Endpoint
      try {
        const memories = MemoryManager.getMemoriesForPrompt();
        const res = await fetch(`${API_BASE_URL}/api/gemini/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(28000),
          body: JSON.stringify({
            message: queryText,
            history: messages,
            language,
            userProfile: {
              name: settings.userName || '',
              honorific: settings.honorific || '',
              conversationStyle: language === 'mr-IN' ? 'natural_kolhapuri_marathi' : 'natural_conversational',
            },
            personalMemories: settings.cloudMemoryConsent ? memories : '',
            telemetry: {
              batteryLevel: telemetry.batteryLevel,
              networkType: telemetry.networkType,
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.details || data.error || 'Server processing error');
        }

        const replyText = typeof data.text === 'string' ? data.text.trim() : '';
        if (!replyText) throw new Error('Cloud AI returned an empty answer');
        const provider = typeof data.provider === 'string' ? data.provider : 'unknown';
        const model = typeof data.model === 'string' ? data.model : '';
        const botReply: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'mruneel',
          text: replyText,
          language,
          timestamp: Date.now(),
          actionsTaken: [`AI Provider: ${provider}`, ...(model ? [`Model: ${model}`] : [])],
        };

        setMessages(prev => [...prev, botReply]);
        setAssistantState('speaking');

        speechService.speak(
          replyText,
          language,
          settings.voiceSpeed,
          settings.voicePitch,
          () => setAssistantState('idle')
        );
      } catch (err) {
        console.warn('Gemini chat error, fallback to offline engine:', err);
        // Seamless fallback to offline autonomous engine
        const fallback = parseOfflineCommand(queryText, language, {
          batteryLevel: telemetry.batteryLevel,
          isCharging: telemetry.isCharging,
          conversationalContext,
          honorific: settings.honorific,
        });

        if (fallback.newContext) {
          setConversationalContext(fallback.newContext);
        }

        let spokenText = fallback.spokenResponse;
        const actionsTaken: string[] = ['स्थानिक ऑफलाइन कोर'];
        if (fallback.actionTaken) {
          actionsTaken.push(fallback.actionTaken);
        }

        // If the query was purely online-dependent and failed to connect
        if (fallback.type === 'UNKNOWN') {
          spokenText = language === 'mr-IN'
            ? `${settings.honorific || 'सर'}, क्लाउड एआय सर्व्हरशी संपर्क होऊ शकला नाही. इंटरनेट जोडणी तपासा. तथापि, आपले स्थानिक फीचर्स (गणित, अलार्म, नोट्स, स्मरणपत्रे आणि बॅटरी) पूर्णपणे कार्यरत आहेत.`
            : `Sir, unable to reach cloud AI servers. Local offline functions (calculations, alarms, notes, and battery) remain active.`;
          actionsTaken.push('नेटवर्क मर्यादा');
        }

        const botReply: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'mruneel',
          text: spokenText,
          language,
          timestamp: Date.now(),
          isOfflineResponse: true,
          actionsTaken,
        };

        setMessages(prev => [...prev, botReply]);
        setAssistantState('speaking');

        speechService.speak(
          spokenText,
          language,
          settings.voiceSpeed,
          settings.voicePitch,
          () => setAssistantState('idle')
        );
      }
    }
  };

  // Start Voice Listening
  const startVoiceListening = useCallback(() => {
    soundFx.playWakeWordChime();
    deviceBridge.vibrate(50);
    setAssistantState('listening');
    setInterimVoiceText('');

    if (activeListenStopRef.current) {
      activeListenStopRef.current();
    }

    activeListenStopRef.current = speechService.listenForCommand(
      (transcript, isFinal) => {
        setInterimVoiceText(transcript);
        if (isFinal) {
          handleUserQuery(transcript);
        }
      },
      (errMsg) => {
        setAssistantState('idle');
        setInterimVoiceText('');
        if (errMsg && !errMsg.includes('No speech') && !errMsg.includes('कोणताही आवाज')) {
          setMessages(prev => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              sender: 'mruneel',
              text: language === 'mr-IN'
                ? `मायक्रोफोन सूचना: ${errMsg}`
                : `Microphone notification: ${errMsg}`,
              language,
              timestamp: Date.now(),
              actionsTaken: ['मायक्रोफोन तपासणी']
            }
          ]);
        }
      },
      () => {
        setAssistantState(prev => (prev === 'listening' ? 'idle' : prev));
      },
      language
    );
  }, [language]);

  const handleCoreClick = () => {
    if (assistantState === 'listening') {
      if (activeListenStopRef.current) {
        activeListenStopRef.current();
      }
      setAssistantState('idle');
    } else if (assistantState === 'speaking') {
      speechService.stopSpeaking();
      setAssistantState('idle');
    } else {
      startVoiceListening();
    }
  };

  const handleToggleTorch = async () => {
    soundFx.playKeyClick();
    const next = !isTorchActive;
    setIsTorchActive(next);
    await deviceBridge.toggleTorch(next);
  };

  const handleReplaySpeech = (text: string, lang?: SupportedLanguage) => {
    soundFx.playKeyClick();
    setAssistantState('speaking');
    speechService.speak(text, lang || language, settings.voiceSpeed, settings.voicePitch, () => {
      setAssistantState('idle');
    });
  };

  const handleCameraScanResult = (analysisText: string, imageThumbnail: string) => {
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: language === 'mr-IN' ? 'कॅमेऱ्यातील दृश्य ओळखा' : 'Analyze camera view',
      visionThumbnail: imageThumbnail,
      timestamp: Date.now(),
    };
    const botReply: ChatMessage = {
      id: `bot-${Date.now()}`,
      sender: 'mruneel',
      text: analysisText,
      language,
      timestamp: Date.now() + 50,
      actionsTaken: ['ऑप्टिकल व्हिजन स्कॅन पूर्ण'],
    };
    setMessages(prev => [...prev, userMsg, botReply]);
    setAssistantState('speaking');
    speechService.speak(analysisText, language, settings.voiceSpeed, settings.voicePitch, () => {
      setAssistantState('idle');
    });
  };

  return (
    <div className="min-h-screen bg-[#030916] text-sky-100 flex flex-col justify-between max-w-lg mx-auto border-x border-amber-950/40 relative shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden">
      {/* Background Holographic Hex Grid & Lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(#0ea5e9_1px,transparent_1px)] [background-size:28px_28px] opacity-10 pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Lockscreen Shield Overlay */}
      {isLocked && (
        <LockScreen
          onUnlockSuccess={() => setIsLocked(false)}
          language={language}
        />
      )}

      {/* Top Android Telemetry Bar */}
      <TelemetryBar
        telemetry={telemetry}
        language={language}
        onLanguageChange={newLang => {
          setLanguage(newLang);
          const update = { ...settings, defaultLanguage: newLang };
          setSettings(update);
          MemoryManager.saveSettings(update);
        }}
        isTorchOn={isTorchActive}
        onToggleTorch={handleToggleTorch}
        onLockSystem={() => {
          soundFx.playWarning();
          setIsLocked(true);
        }}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(prev => !prev)}
        isOnlineMode={telemetry.isOnline && !settings.offlineFirstMode}
        onToggleOfflineMode={() => {
          soundFx.playKeyClick();
          const next = !settings.offlineFirstMode;
          const update = { ...settings, offlineFirstMode: next };
          setSettings(update);
          MemoryManager.saveSettings(update);
        }}
      />

      {/* Main Body Viewport */}
      <main className="flex-1 flex flex-col items-center justify-between px-3 py-2 z-10 w-full overflow-hidden">
        {/* Arc Reactor Core Centerpiece */}
        <ArcReactorCore
          state={assistantState}
          language={language}
          wakeWordEnabled={settings.wakeWordEnabled}
          onCoreClick={handleCoreClick}
          interimTranscript={interimVoiceText}
        />

        {/* Real-Time Voice Wave Visualizer */}
        <VoiceWaveVisualizer state={assistantState} />

        {/* Conversational Chat HUD */}
        <ChatHUD
          messages={messages}
          onSendMessage={handleUserQuery}
          onVoiceTrigger={handleCoreClick}
          onReplaySpeech={handleReplaySpeech}
          isListening={assistantState === 'listening'}
          language={language}
        />

        {/* Bottom Feature Navigation Deck */}
        <nav
          aria-label="Assistant Modules"
          className="w-full grid grid-cols-6 gap-1 mt-2.5 pt-2 border-t border-amber-500/20 bg-black/80 backdrop-blur-md rounded-xl p-1 select-none"
        >
          {/* 1. Camera Vision Scanner */}
          <button
            onClick={() => { soundFx.playKeyClick(); setShowCamera(true); }}
            aria-label="Open Optical Vision Camera Scanner"
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-zinc-950/80 border border-amber-500/20 hover:border-amber-400 active:scale-95 transition-all cursor-pointer group"
          >
            <Camera className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] text-amber-300/90 font-mono mt-1">कॅमेरा</span>
          </button>

          {/* 2. Alarms & Reminders */}
          <button
            onClick={() => { soundFx.playKeyClick(); setShowAlarms(true); }}
            aria-label="Open Alarms, Reminders and Notes"
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-zinc-950/80 border border-amber-500/20 hover:border-amber-400 active:scale-95 transition-all cursor-pointer group"
          >
            <Bell className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] text-amber-300/90 font-mono mt-1">गजर/टास्क</span>
          </button>

          {/* 3. Android Permissions & Native Diagnostic */}
          <button
            onClick={() => { soundFx.playKeyClick(); setShowPermissions(true); }}
            aria-label="Open Android Permissions and Native Diagnostics"
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-zinc-950/80 border border-amber-500/20 hover:border-amber-400 active:scale-95 transition-all cursor-pointer group"
          >
            <Smartphone className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] text-amber-300/90 font-mono mt-1">परवानग्या</span>
          </button>

          {/* 4. Android APK Studio */}
          <button
            onClick={() => { soundFx.playKeyClick(); setShowApkExport(true); }}
            aria-label="Open Android APK Export and Source Code Studio"
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-zinc-950/80 border border-amber-500/20 hover:border-amber-400 active:scale-95 transition-all cursor-pointer group relative overflow-hidden"
          >
            <Download className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] text-amber-300/90 font-mono mt-1">APK बिल्ड</span>
          </button>

          {/* 5. Autonomous Coding Lab */}
          <button
            onClick={() => { soundFx.playKeyClick(); setShowCodingLab(true); }}
            aria-label="Open MRUNEEL Coding Lab"
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-zinc-950/80 border border-emerald-500/30 hover:border-emerald-400 active:scale-95 transition-all cursor-pointer group"
          >
            <Code2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] text-emerald-300/90 font-mono mt-1">CODING</span>
          </button>

          {/* 5. Settings & Personal Memory */}
          <button
            onClick={() => { soundFx.playKeyClick(); setShowSettings(true); }}
            aria-label="Open Assistant Settings and Memory"
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-zinc-950/80 border border-amber-500/20 hover:border-amber-400 active:scale-95 transition-all cursor-pointer group"
          >
            <Settings className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] text-amber-300/90 font-mono mt-1">सेटिंग्ज</span>
          </button>
        </nav>
      </main>

      {/* Modals */}
      <CameraScanner
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onScanResult={handleCameraScanResult}
        language={language}
      />

      <AlarmsRemindersModal
        isOpen={showAlarms}
        onClose={() => setShowAlarms(false)}
        language={language}
      />

      <AndroidPermissionsHub
        isOpen={showPermissions}
        onClose={() => setShowPermissions(false)}
        language={language}
      />

      <AndroidApkExportModal
        isOpen={showApkExport}
        onClose={() => setShowApkExport(false)}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />

      <CodingLab isOpen={showCodingLab} onClose={() => setShowCodingLab(false)} />
    </div>
  );
}
