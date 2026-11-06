import { SupportedLanguage } from '../types/assistant';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { soundFx } from './audioSynthesizer';


interface NativeTTSPlugin {
  speak(options: {
    text: string;
    lang: string;
    rate: number;
    pitch: number;
  }): Promise<void>;
  stop(): Promise<void>;
}

const NativeTTS = registerPlugin<NativeTTSPlugin>('NativeTTS');


// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

class SpeechService {
  private recognition: SpeechRecognitionInstance | null = null;
  private wakeWordRecognition: SpeechRecognitionInstance | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private isWakeWordActive: boolean = false;
  private isListeningForCommand: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.synthesis = window.speechSynthesis;
        this.loadVoices();
        if (this.synthesis.onvoiceschanged !== undefined) {
          this.synthesis.onvoiceschanged = () => this.loadVoices();
        }
      }
    }
  }

  private loadVoices() {
    if (this.synthesis) {
      this.availableVoices = this.synthesis.getVoices();
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return this.availableVoices;
  }

  public isSpeechSupported(): boolean {
    return typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Check if transcript matches wake word "Mruneel" in English, Marathi or Hindi phonetics
   */
  public checkWakeWordMatch(transcript: string): boolean {
    const clean = transcript.toLowerCase().trim();
    const wakePatterns = [
      'mruneel',
      'mrunil',
      'marunil',
      'mrunal',
      'mrunal',
      'runeel',
      'मृणील',
      'मृणाल',
      'म्रुनील',
      'मरुनिल',
      'मृणिल',
      'हे मृणील',
      'hey mruneel',
      'hi mruneel',
      'ok mruneel',
      'jarvis'
    ];
    return wakePatterns.some(pattern => clean.includes(pattern));
  }

  /**
   * Start continuous background wake-word listening
   */
  public startWakeWordListener(
    onWakeWordDetected: (extractedCommand?: string) => void,
    lang: SupportedLanguage = 'mr-IN'
  ) {
    if (!this.isSpeechSupported() || this.isListeningForCommand) return;

    try {
      const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechClass) return;

      if (this.wakeWordRecognition) {
        try { this.wakeWordRecognition.stop(); } catch {}
      }

      this.wakeWordRecognition = new SpeechClass();
      this.wakeWordRecognition.continuous = true;
      this.wakeWordRecognition.interimResults = true;
      this.wakeWordRecognition.lang = lang;

      this.wakeWordRecognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (this.checkWakeWordMatch(transcript)) {
            soundFx.playWakeWordChime();
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([80, 50, 100]);
            }
            this.stopWakeWordListener();

            // Extract any trailing command spoken immediately after the wake word
            let extractedCommand = transcript;
            const wakePatterns = ['mruneel', 'mrunil', 'मृणील', 'म्रुनील', 'jarvis'];
            for (const p of wakePatterns) {
              const idx = extractedCommand.toLowerCase().indexOf(p);
              if (idx !== -1) {
                extractedCommand = extractedCommand.slice(idx + p.length).trim();
                break;
              }
            }

            onWakeWordDetected(extractedCommand.length > 2 ? extractedCommand : undefined);
            return;
          }
        }
      };

      this.wakeWordRecognition.onerror = () => {
        // Automatically restart if silent error or timeout
        if (this.isWakeWordActive && !this.isListeningForCommand) {
          setTimeout(() => {
            if (this.isWakeWordActive && !this.isListeningForCommand) {
              try { this.wakeWordRecognition?.start(); } catch {}
            }
          }, 1000);
        }
      };

      this.wakeWordRecognition.onend = () => {
        if (this.isWakeWordActive && !this.isListeningForCommand) {
          try { this.wakeWordRecognition?.start(); } catch {}
        }
      };

      this.isWakeWordActive = true;
      this.wakeWordRecognition.start();
    } catch {
      this.isWakeWordActive = false;
    }
  }

  public stopWakeWordListener() {
    this.isWakeWordActive = false;
    if (this.wakeWordRecognition) {
      try {
        this.wakeWordRecognition.stop();
      } catch {}
    }
  }

  /**
   * Listen for user voice query / command
   */
  public listenForCommand(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (err: string) => void,
    onEnd: () => void,
    lang: SupportedLanguage = 'mr-IN'
  ): () => void {
    this.stopWakeWordListener();
    this.isListeningForCommand = true;

    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechClass) {
      onError('Speech Recognition not supported in this browser/device.');
      onEnd();
      return () => {};
    }

    try {
      this.recognition = new SpeechClass();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = lang;

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          onResult(finalTranscript.trim(), true);
        } else if (interimTranscript) {
          onResult(interimTranscript.trim(), false);
        }
      };

      this.recognition.onerror = (e) => {
        const rawErr = (e as { error?: string }).error || 'Microphone capture error';
        let friendlyErr = rawErr;
        if (rawErr === 'not-allowed' || rawErr === 'permission-denied') {
          friendlyErr = lang === 'mr-IN'
            ? 'मायक्रोफोन परवानगी नाकारली आहे. कृपया ब्राउझरमध्ये मायक्रोफोन परवानगी द्या.'
            : 'Microphone permission denied. Please allow microphone access in settings.';
        } else if (rawErr === 'no-speech') {
          friendlyErr = lang === 'mr-IN'
            ? 'कोणताही आवाज ऐकू आला नाही. पुन्हा बोला.'
            : 'No speech detected.';
        }
        onError(friendlyErr);
      };

      this.recognition.onend = () => {
        this.isListeningForCommand = false;
        onEnd();
      };

      this.recognition.start();

      return () => {
        try {
          this.recognition?.stop();
        } catch {}
        this.isListeningForCommand = false;
      };
    } catch (e) {
      this.isListeningForCommand = false;
      onError((e as Error).message || 'Failed to start voice recognition');
      onEnd();
      return () => {};
    }
  }

  /**
   * Speak response using SpeechSynthesis with optimized Marathi/Hindi/English voice lookup
   */
  public speak(
    text: string,
    lang: SupportedLanguage = 'mr-IN',
    speed: number = 1.0,
    pitch: number = 1.0,
    onEnd?: () => void
  ) {
    const cleanText = text
      .replace(/[*_#`~>]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();

    if (!cleanText) {
      onEnd?.();
      return;
    }

    if (Capacitor.getPlatform() === 'android') {
      NativeTTS.speak({
        text: cleanText,
        lang,
        rate: speed,
        pitch
      }).then(() => {
        onEnd?.();
      }).catch(() => {
        this.speakWithWebSpeech(cleanText, lang, speed, pitch, onEnd);
      });
      return;
    }

    this.speakWithWebSpeech(cleanText, lang, speed, pitch, onEnd);
  }

  private speakWithWebSpeech(
    cleanText: string,
    lang: SupportedLanguage,
    speed: number,
    pitch: number,
    onEnd?: () => void
  ) {
    if (!this.synthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      onEnd?.();
      return;
    }

    try {
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang;
      utterance.rate = speed;
      utterance.pitch = pitch;

      const voices = this.availableVoices.length > 0
        ? this.availableVoices
        : this.synthesis.getVoices();

      let targetVoice: SpeechSynthesisVoice | undefined;

      if (lang === 'mr-IN') {
        targetVoice = voices.find(v =>
          v.lang.toLowerCase().includes('mr') ||
          v.name.toLowerCase().includes('marathi')
        );

        if (!targetVoice) {
          targetVoice = voices.find(v =>
            v.lang.toLowerCase().includes('hi-in') ||
            v.name.toLowerCase().includes('hindi')
          );
        }
      } else if (lang === 'hi-IN') {
        targetVoice = voices.find(v =>
          v.lang.toLowerCase().includes('hi') ||
          v.name.toLowerCase().includes('hindi')
        );
      } else {
        targetVoice = voices.find(v =>
          (v.name.toLowerCase().includes('male') ||
            v.name.toLowerCase().includes('david') ||
            v.name.toLowerCase().includes('george')) &&
          v.lang.toLowerCase().includes('en')
        ) || voices.find(v =>
          v.lang.toLowerCase().includes('en-us') ||
          v.lang.toLowerCase().includes('en-in')
        );
      }

      if (targetVoice) {
        utterance.voice = targetVoice;
      }

      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onEnd?.();

      this.synthesis.speak(utterance);
    } catch {
      onEnd?.();
    }
  }

  public stopSpeaking() {
    if (this.synthesis) {
      try {
        this.synthesis.cancel();
      } catch {}
    }

    if (Capacitor.getPlatform() === 'android') {
      NativeTTS.stop().catch(() => {});
    }
  }
}

export const speechService = new SpeechService();
