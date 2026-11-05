import React, { useState, useRef, useEffect } from 'react';
import { Send, Volume2, Mic, Bot, User, Check, Sparkles } from 'lucide-react';
import { ChatMessage, SupportedLanguage } from '../types/assistant';
import { soundFx } from '../utils/audioSynthesizer';

interface ChatHUDProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onVoiceTrigger: () => void;
  onReplaySpeech: (text: string, lang?: SupportedLanguage) => void;
  isListening: boolean;
  language: SupportedLanguage;
}

export const ChatHUD: React.FC<ChatHUDProps> = ({
  messages,
  onSendMessage,
  onVoiceTrigger,
  onReplaySpeech,
  isListening,
  language,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    soundFx.playKeyClick();
    onSendMessage(inputText.trim());
    setInputText('');
  };

  // Quick suggestion chips depending on active language
  const getSuggestions = () => {
    if (language === 'mr-IN') {
      return [
        'बॅटरी तपासा',
        '५ आंबे होते २ दिले १ परत केला',
        '२५ अधिक १५ किती?',
        '५० चा २० टक्के किती?',
        'भारताची राजधानी कोणती?',
        'सकाळी ७ वाजता अलार्म लावा',
        'टॉर्च चालू करा'
      ];
    } else if (language === 'hi-IN') {
      return [
        'बैटरी चेक करो',
        '२५ प्लस १५ कितना होगा?',
        '५० का २० प्रतिशत कितना है?',
        'भारत की राजधानी क्या है?',
        'सुबह 7 बजे अलार्म लगाओ',
        'टॉर्च चालू करो'
      ];
    } else {
      return [
        'Check battery status',
        '5 mangoes, gave 2, returned 1',
        'Calculate 25 + 15',
        '20% of 500',
        'What is capital of India?',
        'Set alarm for 7:00 AM',
        'Toggle flashlight'
      ];
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-[220px] max-h-[380px] bg-black/60 rounded-xl border border-amber-500/20 backdrop-blur-md overflow-hidden relative">
      {/* Top Banner */}
      <div className="px-3 py-1.5 bg-amber-950/30 border-b border-amber-500/20 flex items-center justify-between text-[11px] font-mono text-amber-300 select-none">
        <div className="flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-amber-400" />
          <span>MRUNEEL CONVERSATIONAL HUD</span>
        </div>
        <span className="text-amber-500/70">{messages.length} संदेश</span>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-amber-400/60">
            <Sparkles className="w-8 h-8 text-amber-500/40 mb-2 animate-pulse" />
            <p className="text-xs">
              {language === 'mr-IN'
                ? 'मी मृणील. बोला किंवा खालील कमांड निवडा.'
                : 'MRUNEEL core ready. Speak or enter command.'}
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'mruneel' && (
                <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs relative ${
                  msg.sender === 'user'
                    ? 'bg-amber-900/40 border border-amber-500/30 text-amber-100 rounded-tr-none'
                    : 'bg-zinc-950/80 border border-amber-500/20 text-amber-200 rounded-tl-none shadow-[0_0_15px_rgba(245,158,11,0.06)]'
                }`}
              >
                {/* Vision thumbnail if image was attached */}
                {msg.visionThumbnail && (
                  <div className="mb-1.5 rounded overflow-hidden border border-amber-500/30 max-h-32">
                    <img
                      src={msg.visionThumbnail}
                      alt="Camera Vision Scan"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}

                <p className="whitespace-pre-wrap leading-relaxed select-text">{msg.text}</p>

                {/* Actions Taken Tag */}
                {msg.actionsTaken && msg.actionsTaken.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-amber-500/20 flex flex-wrap gap-1">
                    {msg.actionsTaken.map((act, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono"
                      >
                        <Check className="w-2.5 h-2.5" />
                        {act}
                      </span>
                    ))}
                  </div>
                )}

                {/* Offline Badge & TTS Button */}
                <div className="mt-1 flex items-center justify-between text-[10px] text-amber-500/50">
                  <span className="font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.isOfflineResponse ? ' • ऑफलाइन' : ''}
                  </span>

                  {msg.sender === 'mruneel' && (
                    <button
                      onClick={() => onReplaySpeech(msg.text, msg.language)}
                      aria-label="Replay speech"
                      className="p-0.5 hover:text-amber-300 transition-colors cursor-pointer"
                      title="Speak again"
                    >
                      <Volume2 className="w-3 h-3 text-amber-400" />
                    </button>
                  )}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-6 h-6 rounded-full bg-amber-600/30 border border-amber-400/40 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-amber-300" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="px-2 py-1 flex items-center gap-1.5 overflow-x-auto bg-black/40 border-t border-amber-500/10 no-scrollbar">
        {getSuggestions().map((chip, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(chip)}
            className="whitespace-nowrap px-2 py-0.5 rounded-full bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/25 text-amber-300 text-[10px] transition-colors cursor-pointer shrink-0"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="p-2 bg-black/90 border-t border-amber-500/20 flex items-center gap-2">
        <button
          type="button"
          onClick={onVoiceTrigger}
          aria-label={isListening ? 'Stop listening' : 'Start voice recognition'}
          className={`p-2 rounded-lg border transition-all cursor-pointer ${
            isListening
              ? 'bg-amber-500 text-black border-amber-300 animate-pulse shadow-[0_0_15px_#fbbf24]'
              : 'bg-zinc-900 text-amber-400 border-amber-500/30 hover:border-amber-400'
          }`}
          title="Voice Command"
        >
          <Mic className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder={
            language === 'mr-IN'
              ? 'मृणीलला संदेश पाठवा किंवा विचारा...'
              : language === 'hi-IN'
              ? 'मृणील से कुछ पूछें या आदेश दें...'
              : 'Type command for MRUNEEL...'
          }
          className="flex-1 bg-zinc-950/80 border border-amber-500/25 rounded-lg px-3 py-1.5 text-xs text-amber-100 placeholder:text-amber-500/40 focus:outline-none focus:border-amber-400 transition-colors"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          aria-label="Send message to assistant"
          className="p-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:pointer-events-none text-black font-semibold transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
