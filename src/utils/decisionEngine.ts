export type IntentCategory =
  | 'conversation'
  | 'device_status'
  | 'local_action'
  | 'external_action'
  | 'coding'
  | 'web_research'
  | 'sensitive'
  | 'unknown';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ExecutionMode = 'answer' | 'offline_tool' | 'cloud_tool' | 'approval_required' | 'blocked';

export interface DecisionInput {
  text: string;
  online?: boolean;
  offlineFirst?: boolean;
  toolAvailable?: boolean;
  permissionGranted?: boolean;
  userApproved?: boolean;
}

export interface Decision {
  category: IntentCategory;
  risk: RiskLevel;
  mode: ExecutionMode;
  requiresApproval: boolean;
  reason: string;
}

/**
 * Deterministic routing layer. It only recommends a route; it never executes a tool.
 * All device, external, or sensitive actions require explicit approval.
 */
export function decideNextStep(input: DecisionInput): Decision {
  const text = input.text.trim().toLocaleLowerCase();
  if (!text) return { category: 'unknown', risk: 'low', mode: 'answer', requiresApproval: false, reason: 'Empty input; ask the user to clarify.' };

  if (/\b(password|passcode|otp|one[- ]time code|api key|secret|private key)\b|पासवर्ड|ओटीपी|गुप्त/.test(text)) {
    return { category: 'sensitive', risk: 'critical', mode: 'blocked', requiresApproval: true, reason: 'Credential or secret handling is not routed to autonomous tools.' };
  }

  if (/\b(call|phone|dial|send (?:a )?(?:text|message|email)|pay|purchase|buy|delete|share|post|publish)\b|फोन करा|कॉल करा|मेसेज पाठव|पैसे पाठव|खरेदी कर|डिलीट कर|शेअर कर/.test(text)) {
    return { category: 'external_action', risk: 'high', mode: 'approval_required', requiresApproval: true, reason: 'External, irreversible, or privacy-impacting actions require user confirmation.' };
  }

  if (/\b(code|coding|program|bug|fix|edit file|github|pull request|commit|deploy|apk)\b|कोड|कोडिंग|बग|फाइल बदल|गिटहब|डिप्लॉय|एपीके/.test(text)) {
    return { category: 'coding', risk: 'medium', mode: input.toolAvailable ? 'approval_required' : 'answer', requiresApproval: true, reason: 'Coding changes must be isolated, tested, and reviewed before they are applied.' };
  }

  if (/\b(weather|news|latest|search|look up|web|internet|price today)\b|हवामान|बातम्या|शोध|आजचा भाव/.test(text)) {
    const online = input.online !== false && !input.offlineFirst;
    return { category: 'web_research', risk: 'low', mode: online && input.toolAvailable ? 'cloud_tool' : 'answer', requiresApproval: false, reason: online ? 'Fresh information may need an available web tool.' : 'Offline mode; answer only from known context and disclose freshness limits.' };
  }

  if (/\b(battery|charging|torch|flashlight|alarm|reminder|note|open app|settings|bluetooth|wifi|location)\b|बॅटरी|चार्ज|टॉर्च|गजर|अलार्म|आठवण|टीप|अॅप उघड|सेटिंग|ब्लूटूथ|वाईफाय|लोकेशन/.test(text)) {
    const permitted = input.permissionGranted === true;
    return { category: 'local_action', risk: 'medium', mode: permitted && input.toolAvailable ? 'approval_required' : 'answer', requiresApproval: true, reason: permitted ? 'Local device action needs a supported tool and explicit confirmation.' : 'Device permission or bridge capability has not been confirmed.' };
  }

  if (/\b(status|battery level|what time|who are you|explain|calculate|translate|hello|hi)\b|किती टक्के|वेळ किती|तू कोण|समजाव|गणित|भाषांतर|नमस्कार|हॅलो/.test(text)) {
    return { category: 'conversation', risk: 'low', mode: 'answer', requiresApproval: false, reason: 'No tool side-effect is needed for this request.' };
  }

  return { category: 'unknown', risk: 'low', mode: 'answer', requiresApproval: false, reason: 'Intent is uncertain; answer or ask a clarifying question without taking action.' };
}
