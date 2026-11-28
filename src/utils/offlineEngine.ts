import { SupportedLanguage } from '../types/assistant';
import {
  ConversationalContext,
  getMarathiConversationalResponse,
  detectEmotion,
  EmotionType,
} from './marathiConversationalEngine';
import { solveMathOrLogic } from './localMathAndReasoning';
import { getLocalGeneralKnowledge } from './localGeneralKnowledge';

export interface OfflineAction {
  type:
    | 'SET_ALARM'
    | 'CHECK_BATTERY'
    | 'TOGGLE_TORCH'
    | 'ADJUST_VOLUME'
    | 'OPEN_SCREEN'
    | 'ADD_NOTE'
    | 'SET_REMINDER'
    | 'OPEN_CAMERA'
    | 'LOCK_SYSTEM'
    | 'MATHEMATICS'
    | 'GENERAL_KNOWLEDGE'
    | 'CONVERSATIONAL'
    | 'EMOTIONAL_SUPPORT'
    | 'INTERNET_LIMITATION'
    | 'GENERAL_RESPONSE'
    | 'UNKNOWN';
  spokenResponse: string;
  payload?: Record<string, unknown>;
  actionTaken?: string;
  newContext?: ConversationalContext;
  detectedEmotion?: EmotionType;
}

/**
 * Extracts a time string (HH:MM in 24h format) from text
 */
export function extractTimeFromText(text: string): string | null {
  const lower = text.toLowerCase();

  // Matches "7:30", "07:30", "7:30 am", "8:15 pm"
  const colonMatch = lower.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/);
  if (colonMatch) {
    let hours = parseInt(colonMatch[1], 10);
    const minutes = colonMatch[2].padStart(2, '0');
    const meridiem = colonMatch[3];
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  // Matches "7 am", "8 pm", "7 वाजता", "८ वाजता", "7 बजे"
  const devanagariDigits: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };
  let normalizedText = lower;
  for (const [d, num] of Object.entries(devanagariDigits)) {
    normalizedText = normalizedText.replaceAll(d, num);
  }

  const hourMatch = normalizedText.match(/(\d{1,2})\s*(am|pm|वाजता|बजे|o'clock)?/);
  if (hourMatch) {
    let hours = parseInt(hourMatch[1], 10);
    const meridiem = hourMatch[2];
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (hours >= 0 && hours <= 23) {
      return `${hours.toString().padStart(2, '0')}:00`;
    }
  }

  return null;
}

/**
 * Detect language of a given text prompt
 */
export function detectLanguage(text: string, preferred: SupportedLanguage = 'mr-IN'): SupportedLanguage {
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  if (!hasDevanagari) return 'en-US';

  const marathiMarkers = [
    'आहे', 'आहेत', 'करा', 'लावा', 'दाखवा', 'सांगा', 'नाही', 'मी', 'माझे', 'माझ्या', 'माझ्याकडे',
    'वाजता', 'मदत', 'कसे', 'काय', 'होय', 'वाटत', 'फार', 'खूप', 'उदास', 'राग', 'आनंद', 'ताण',
    'कधी', 'असतो', 'असतात', 'कोणती', 'कोणता', 'कोणते', 'किती', 'झाले', 'झाली', 'झाला', 'होतात',
    'राहिले', 'उरले', 'मिळाले', 'दिला', 'दिले', 'दिली', 'परत', 'केला', 'केली', 'केले', 'तुला',
    'आंबे', 'रुपये', 'अधिक', 'वजा', 'गुणिले', 'भागिले', 'टक्के', 'वर्ग', 'घन', 'सूत्र', 'दिन', 'भाषा'
  ];

  const hindiMarkers = [
    'है', 'हैं', 'करो', 'लगाओ', 'बताओ', 'बताइए', 'नहीं', 'मेरा', 'मेरी', 'मुझे', 'मुझको',
    'बजे', 'मदद', 'कैसे', 'कितना', 'क्या', 'समय', 'था', 'थी', 'होगी', 'होगा', 'सकते'
  ];

  const isMarathi = marathiMarkers.some(marker => text.includes(marker));
  const isHindi = hindiMarkers.some(marker => text.includes(marker));

  if (isMarathi && !isHindi) return 'mr-IN';
  if (isHindi && !isMarathi) return 'hi-IN';
  return preferred === 'hi-IN' ? 'hi-IN' : 'mr-IN';
}

/**
 * Executes offline intent parsing and response generation with deep Marathi conversational & emotional capabilities
 */
export function parseOfflineCommand(
  text: string,
  preferredLanguage: SupportedLanguage = 'mr-IN',
  context?: {
    batteryLevel?: number | null;
    isCharging?: boolean | null;
    conversationalContext?: ConversationalContext;
    honorific?: string;
  }
): OfflineAction {
  const clean = text.toLowerCase().trim();
  const lang = detectLanguage(text, preferredLanguage);
  const honorific = context?.honorific || (lang === 'mr-IN' ? 'सर' : (lang === 'hi-IN' ? 'श्रीमान' : 'Sir'));

  // 1. ALARM COMMANDS
  if (
    clean.includes('alarm') ||
    clean.includes('अलार्म') ||
    clean.includes('जागे करा') ||
    clean.includes('वेळ लावा')
  ) {
    const time = extractTimeFromText(clean) || '07:00';
    if (lang === 'mr-IN') {
      return {
        type: 'SET_ALARM',
        spokenResponse: `अलार्मची ${time} वाजताची वेळ अॅपमध्ये नोंदवली. पण फोनचा प्रत्यक्ष system alarm अजून सेट झालेला नाही.`,
        payload: { time, label: 'MRUNEEL अलार्म' },
        actionTaken: `अॅपमध्ये अलार्म नोंद: ${time} (system alarm नाही)`,
        newContext: { ...context?.conversationalContext, lastTopic: 'alarm' }
      };
    } else if (lang === 'hi-IN') {
      return {
        type: 'SET_ALARM',
        spokenResponse: `अलार्म की ${time} बजे वाली समय-सूचना ऐप में दर्ज है; फोन का system alarm अभी सेट नहीं हुआ है।`,
        payload: { time, label: 'MRUNEEL अलार्म' },
        actionTaken: `अलार्म सेट: ${time}`,
        newContext: { ...context?.conversationalContext, lastTopic: 'alarm' }
      };
    } else {
      return {
        type: 'SET_ALARM',
        spokenResponse: `The ${time} alarm time is saved in the app list; the Android system alarm has not been scheduled.`,
        payload: { time, label: 'MRUNEEL Alarm' },
        actionTaken: `App alarm entry saved: ${time} (not an OS alarm)`,
        newContext: { ...context?.conversationalContext, lastTopic: 'alarm' }
      };
    }
  }

  // 2. BATTERY & SYSTEM TELEMETRY
  if (
    clean.includes('battery') ||
    clean.includes('चार्जिंग') ||
    clean.includes('बॅटरी') ||
    clean.includes('बैटरी') ||
    clean.includes('power level')
  ) {
    const levelPercent = context?.batteryLevel !== null && context?.batteryLevel !== undefined
      ? Math.round(context.batteryLevel * 100)
      : null;
    const chargingText = context?.isCharging === true ? 'चार्जिंग सुरू आहे' : context?.isCharging === false ? 'चार्जिंग सुरू नाही' : 'चार्जिंग स्थिती उपलब्ध नाही';

    if (lang === 'mr-IN') {
      return {
        type: 'CHECK_BATTERY',
        spokenResponse: levelPercent !== null ? `${honorific}, सध्या तुमच्या फोनची बॅटरी ${levelPercent}% आहे आणि डिव्हाइस ${chargingText}.` : `${honorific}, सध्या बॅटरीची अचूक माहिती उपलब्ध नाही. डिव्हाइस status तपासल्याशिवाय मी अंदाज सांगणार नाही.`,
        payload: { batteryLevel: levelPercent },
        actionTaken: levelPercent !== null ? `बॅटरी स्थिती: ${levelPercent}%` : 'बॅटरी माहिती उपलब्ध नाही',
        newContext: { ...context?.conversationalContext, lastTopic: 'battery' }
      };
    } else if (lang === 'hi-IN') {
      return {
        type: 'CHECK_BATTERY',
        spokenResponse: levelPercent !== null ? `${honorific}, फोन की बैटरी ${levelPercent}% है।` : `${honorific}, बैटरी की वास्तविक जानकारी उपलब्ध नहीं है; अनुमान नहीं बताऊँगा।`,
        payload: { batteryLevel: levelPercent },
        actionTaken: levelPercent !== null ? `बैटरी स्टेटस: ${levelPercent}%` : 'Battery status unavailable',
        newContext: { ...context?.conversationalContext, lastTopic: 'battery' }
      };
    } else {
      return {
        type: 'CHECK_BATTERY',
        spokenResponse: levelPercent !== null ? `Current device battery is ${levelPercent}%. ${context?.isCharging === true ? 'Charging.' : context?.isCharging === false ? 'Not charging.' : 'Charging state unavailable.'}` : `Current battery data is unavailable; I will not guess the percentage.`,
        payload: { batteryLevel: levelPercent },
        actionTaken: levelPercent !== null ? `Battery status: ${levelPercent}%` : 'Battery data unavailable',
        newContext: { ...context?.conversationalContext, lastTopic: 'battery' }
      };
    }
  }

  // 3. SAFE DEVICE BRIDGE COMMANDS (screen launches + bounded volume)
  const openScreenTarget =
    /wifi|wi-fi|वाय.?फाय|वाई.?फाय/.test(clean) ? 'wifi' :
    /bluetooth|ब्लूटूथ/.test(clean) ? 'bluetooth' :
    /open settings|settings उघड|सेटिंग्ज उघड|सेटिंग खोल|android settings/.test(clean) ? 'settings' :
    /phone camera|native camera|फोन कॅमेरा|कॅमेरा अॅप/.test(clean) ? 'camera' :
    /dialer|डायलर|फोन लावण्याचा स्क्रीन/.test(clean) ? 'dialer' : null;
  if (openScreenTarget && /(open|उघड|चालू कर|खोल|दाखव)/.test(clean)) {
    const targetLabels: Record<string, string> = { wifi: 'Wi-Fi settings', bluetooth: 'Bluetooth settings', settings: 'Android settings', camera: 'फोन कॅमेरा', dialer: 'फोन डायलर' };
    return {
      type: 'OPEN_SCREEN',
      payload: { target: openScreenTarget },
      spokenResponse: lang === 'mr-IN' ? `${targetLabels[openScreenTarget]} उघडतो. फोनची सेटिंग्ज तुझ्या नियंत्रणात राहतील.` : `Opening ${targetLabels[openScreenTarget]}. Android will keep system settings under your control.`,
      actionTaken: `${targetLabels[openScreenTarget]} उघडण्याची विनंती`,
    };
  }
  const volumeDirection =
    /(volume up|increase volume|आवाज वाढव|व्हॉल्यूम वाढव|आवाज मोठा)/.test(clean) ? 1 :
    /(volume down|decrease volume|आवाज कमी|व्हॉल्यूम कमी|आवाज छोटा)/.test(clean) ? -1 : 0;
  if (volumeDirection) {
    return {
      type: 'ADJUST_VOLUME',
      payload: { direction: volumeDirection },
      spokenResponse: lang === 'mr-IN' ? (volumeDirection > 0 ? 'आवाज एक पायरी वाढवतो.' : 'आवाज एक पायरी कमी करतो.') : (volumeDirection > 0 ? 'Increasing media volume one step.' : 'Decreasing media volume one step.'),
      actionTaken: volumeDirection > 0 ? 'मीडिया आवाज +१' : 'मीडिया आवाज −१',
    };
  }

  // 3. FLASHLIGHT / TORCH
  if (
    clean.includes('torch') ||
    clean.includes('flashlight') ||
    clean.includes('टॉर्च') ||
    clean.includes('फ्लॅश') ||
    clean.includes('दिवा')
  ) {
    const isTurnOn = !clean.includes('off') && !clean.includes('बंद');
    if (lang === 'mr-IN') {
      return {
        type: 'TOGGLE_TORCH',
        spokenResponse: isTurnOn ? `होय ${honorific}, मी टॉर्च चालू करत आहे.` : `टॉर्च बंद केली आहे ${honorific}.`,
        payload: { state: isTurnOn },
        actionTaken: isTurnOn ? 'टॉर्च चालू' : 'टॉर्च बंद',
        newContext: { ...context?.conversationalContext, lastTopic: 'torch' }
      };
    } else if (lang === 'hi-IN') {
      return {
        type: 'TOGGLE_TORCH',
        spokenResponse: isTurnOn ? `जी ${honorific}, टॉर्च चालू कर दी गई है।` : `टॉर्च बंद कर दी गई है।`,
        payload: { state: isTurnOn },
        actionTaken: isTurnOn ? 'टॉर्च ऑन' : 'टॉर्च ऑफ',
        newContext: { ...context?.conversationalContext, lastTopic: 'torch' }
      };
    } else {
      return {
        type: 'TOGGLE_TORCH',
        spokenResponse: isTurnOn ? 'Illumination active, Sir.' : 'Flashlight deactivated, Sir.',
        payload: { state: isTurnOn },
        actionTaken: isTurnOn ? 'Torch ON' : 'Torch OFF',
        newContext: { ...context?.conversationalContext, lastTopic: 'torch' }
      };
    }
  }

  // 4. NOTES & MEMOS
  if (
    clean.includes('note') ||
    clean.includes('नोट') ||
    clean.includes('टीप') ||
    clean.includes('लिहा') ||
    clean.includes('लिखो')
  ) {
    let content = text
      .replace(/^(मृणील|मिस्टर मृणील|mruneel|नोट लिहा|टीप लिहा|नोट करो|take note|write note|add note)\s*/i, '')
      .trim();
    if (!content) content = 'नवीन टीप (New Note)';

    if (lang === 'mr-IN') {
      return {
        type: 'ADD_NOTE',
        spokenResponse: `मी तुमची टीप स्थानिक मेमरीमध्ये सुरक्षित केली आहे: "${content}"`,
        payload: { content, title: 'मृणील टीप' },
        actionTaken: `टीप जतन केली: ${content}`,
        newContext: { ...context?.conversationalContext, lastTopic: 'note' }
      };
    } else if (lang === 'hi-IN') {
      return {
        type: 'ADD_NOTE',
        spokenResponse: `मैंने आपकी नोट सुरक्षित कर ली है: "${content}"`,
        payload: { content, title: 'मृणील नोट' },
        actionTaken: `नोट सुरक्षित की`,
        newContext: { ...context?.conversationalContext, lastTopic: 'note' }
      };
    } else {
      return {
        type: 'ADD_NOTE',
        spokenResponse: `I have recorded your note in local secure memory: "${content}"`,
        payload: { content, title: 'MRUNEEL Note' },
        actionTaken: `Note saved: ${content}`,
        newContext: { ...context?.conversationalContext, lastTopic: 'note' }
      };
    }
  }

  // 5. REMINDERS
  if (
    clean.includes('remind') ||
    clean.includes('reminder') ||
    clean.includes('रिमाइंडर') ||
    clean.includes('आठवण') ||
    clean.includes('स्मरणपत्र')
  ) {
    let reminderText = text
      .replace(/^(मृणील|mruneel|रिमाइंडर लावा|स्मरणपत्र ठेवा|remind me to|set reminder)\s*/i, '')
      .trim();
    if (!reminderText) reminderText = 'महत्त्वाचे कार्य (Important Task)';

    if (lang === 'mr-IN') {
      return {
        type: 'SET_REMINDER',
        spokenResponse: `स्मरणपत्र अॅपमध्ये नोंदवले: "${reminderText}". प्रत्यक्ष notification schedule अजून जोडलेला नाही.`,
        payload: { title: reminderText },
        actionTaken: `अॅपमध्ये स्मरणपत्र नोंद (notification नाही): ${reminderText}`,
        newContext: { ...context?.conversationalContext, lastTopic: 'reminder' }
      };
    } else if (lang === 'hi-IN') {
      return {
        type: 'SET_REMINDER',
        spokenResponse: `रिमाइंडर ऐप में दर्ज किया: "${reminderText}". Notification schedule अभी उपलब्ध नहीं है.`,
        payload: { title: reminderText },
        actionTaken: `रिमाइंडर सेट: ${reminderText}`,
        newContext: { ...context?.conversationalContext, lastTopic: 'reminder' }
      };
    } else {
      return {
        type: 'SET_REMINDER',
        spokenResponse: `Reminder saved in the app list: "${reminderText}". A system notification has not been scheduled yet.`,
        payload: { title: reminderText },
        actionTaken: `App reminder saved (no notification scheduled): ${reminderText}`,
        newContext: { ...context?.conversationalContext, lastTopic: 'reminder' }
      };
    }
  }

  // 6. CAMERA / OBJECT SCANNER
  if (
    clean.includes('camera') ||
    clean.includes('scanner') ||
    clean.includes('कॅमेरा') ||
    clean.includes('स्कॅन') ||
    clean.includes('फोटो') ||
    clean.includes('बघ')
  ) {
    if (lang === 'mr-IN') {
      return {
        type: 'OPEN_CAMERA',
        spokenResponse: `ऑप्टिकल दृष्टी संवेदी सेन्सर्स सक्रिय करत आहे, ${honorific}. कॅमेरा व्ह्यूफाइंडर उघडला आहे.`,
        actionTaken: 'कॅमेरा उघडला',
        newContext: { ...context?.conversationalContext, lastTopic: 'camera' }
      };
    } else {
      return {
        type: 'OPEN_CAMERA',
        spokenResponse: 'Optical sensors engaged, Sir. Camera viewfinder is active.',
        actionTaken: 'Camera HUD Opened',
        newContext: { ...context?.conversationalContext, lastTopic: 'camera' }
      };
    }
  }

  // 7. SECURITY / LOCK SYSTEM
  if (
    clean.includes('lock') ||
    clean.includes('लॉक') ||
    clean.includes('बंद करा') ||
    clean.includes('सुरक्षा')
  ) {
    if (lang === 'mr-IN') {
      return {
        type: 'LOCK_SYSTEM',
        spokenResponse: `सिस्टीम बायोमेट्रिक सुरक्षा लॉक सक्रिय करण्यात आली आहे, ${honorific}.`,
        actionTaken: 'सिस्टीम लॉक'
      };
    } else {
      return {
        type: 'LOCK_SYSTEM',
        spokenResponse: 'Biometric and PIN security protocols engaged. System locked, Sir.',
        actionTaken: 'System Locked'
      };
    }
  }

  // 8. IDENTITY & GREETINGS
  if (
    clean.includes('who are you') ||
    clean.includes('नाव काय') ||
    clean.includes('तू कोण') ||
    clean.includes('तुम कौन हो') ||
    clean.includes('hello') ||
    clean.includes('नमस्कार') ||
    clean.includes('हाय') ||
    clean.includes('hi')
  ) {
    if (lang === 'mr-IN') {
      return {
        type: 'GENERAL_RESPONSE',
        spokenResponse: `नमस्कार! मी मृणील (MRUNEEL), तुमचा प्रगत वैयक्तिक एआय सहाय्यक. जार्व्हिसच्या संकल्पनेवर आधारित, मी मराठी, हिंदी आणि इंग्रजीत बोलू शकतो आणि ऑफलाइनही तुमची कामे सांभाळू शकतो.`,
        newContext: { ...context?.conversationalContext, lastTopic: 'greeting' }
      };
    } else if (lang === 'hi-IN') {
      return {
        type: 'GENERAL_RESPONSE',
        spokenResponse: `नमस्ते! मैं मृणील (MRUNEEL) हूँ, आपका आधुनिक पर्सनल एआई असिस्टेंट।`,
        newContext: { ...context?.conversationalContext, lastTopic: 'greeting' }
      };
    } else {
      return {
        type: 'GENERAL_RESPONSE',
        spokenResponse: 'Greetings, Sir. I am MRUNEEL, your personal AI assistant inspired by JARVIS, built with dual-core online intelligence and offline autonomy.',
        newContext: { ...context?.conversationalContext, lastTopic: 'greeting' }
      };
    }
  }

  // 9. LOCAL MATHEMATICAL REASONING & WORD PROBLEMS (100% Offline)
  const mathResult = solveMathOrLogic(text, context?.conversationalContext, honorific);
  if (mathResult) {
    return {
      type: 'MATHEMATICS',
      spokenResponse: mathResult.spokenResponse,
      actionTaken: mathResult.actionTaken,
      payload: {
        result: mathResult.result,
        numericValue: mathResult.numericValue,
        type: mathResult.type
      },
      newContext: {
        ...context?.conversationalContext,
        lastTopic: 'math',
        lastCalculationResult: mathResult.numericValue,
        lastQuery: text
      }
    };
  }

  // 10. LOCAL GENERAL KNOWLEDGE & FACT ENGINE (100% Offline)
  const gkResult = getLocalGeneralKnowledge(text, lang, honorific);
  if (gkResult) {
    return {
      type: 'GENERAL_KNOWLEDGE',
      spokenResponse: gkResult.answer,
      actionTaken: `माहिती: ${gkResult.topic}`,
      newContext: {
        ...context?.conversationalContext,
        lastTopic: 'knowledge',
        lastQuery: text
      }
    };
  }

  // 11. DEEP MARATHI CONVERSATIONAL & EMOTIONAL INTELLIGENCE
  const conversationResult = getMarathiConversationalResponse(text, context?.conversationalContext, honorific);
  if (conversationResult.matched) {
    return {
      type: conversationResult.detectedEmotion
        ? 'EMOTIONAL_SUPPORT'
        : conversationResult.requiresInternet
        ? 'INTERNET_LIMITATION'
        : 'CONVERSATIONAL',
      spokenResponse: conversationResult.response,
      detectedEmotion: conversationResult.detectedEmotion,
      newContext: {
        ...context?.conversationalContext,
        lastTopic: conversationResult.topic || 'general',
        lastEmotion: conversationResult.detectedEmotion,
        lastQuery: text
      }
    };
  }

  // 10. NON-REPETITIVE CONTEXT-AWARE INTELLIGENT FALLBACK
  // Never repeat the same command menu! Address the user's specific statement thoughtfully.
  const emotion = detectEmotion(text);
  if (lang === 'mr-IN') {
    return {
      type: 'UNKNOWN',
      spokenResponse: `${honorific}, मी आपले म्हणणे ("${text}") ऐकले. सध्या डिव्हाइस ऑफलाइन असल्याने या विषयावर सखोल माहिती देण्यासाठी क्लाउड नेटवर्क उपलब्ध नाही. मी खोटे उत्तर देणार नाही; तरीही आपले गजर, बॅटरी, स्मरणपत्रे किंवा नोट्स यासारखे सर्व स्थानिक प्रोटोकॉल पूर्णपणे सक्रिय आहेत.`,
      newContext: { ...context?.conversationalContext, lastTopic: 'general', lastQuery: text }
    };
  } else if (lang === 'hi-IN') {
    return {
      type: 'UNKNOWN',
      spokenResponse: `${honorific}, मैंने आपका संदेश ("${text}") सुना। वर्तमान में ऑफलाइन होने के कारण इस विषय पर विस्तृत उत्तर सीमित है, लेकिन आपके सभी डिवाइस कमांड्स सक्रिय हैं।`,
      newContext: { ...context?.conversationalContext, lastTopic: 'general', lastQuery: text }
    };
  } else {
    return {
      type: 'UNKNOWN',
      spokenResponse: `Understood, Sir. While operating in autonomous offline mode, cloud database access for "${text}" is restricted. Device hardware controls, alarms, and personal notes remain fully operational.`,
      newContext: { ...context?.conversationalContext, lastTopic: 'general', lastQuery: text }
    };
  }
}
