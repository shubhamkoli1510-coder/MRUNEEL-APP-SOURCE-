export type MRUNEELIntent = "conversation" | "coding" | "device" | "research" | "sensitive" | "unknown";
export type MRUNEELRisk = "low" | "medium" | "high";

export interface Decision {
  intent: MRUNEELIntent;
  risk: MRUNEELRisk;
  requiresApproval: boolean;
  reason: string;
  normalizedInput: string;
}

const patterns: Record<Exclude<MRUNEELIntent, "sensitive" | "unknown">, RegExp[]> = {
  coding: [/\b(code|coding|debug|bug|compile|build|github|pull request|commit|patch|file)\b/i, /कोड|coding|github|बग|फाईल|फाइल|कोडिंग/i],
  device: [/\b(open|launch|turn on|turn off|set alarm|call|send message|camera|bluetooth|wifi|flashlight)\b/i, /उघड|चालू कर|बंद कर|अलार्म|कॉल|मेसेज|कॅमेरा|ब्लूटूथ|वाई.?फाय/i],
  research: [/\b(search|research|look up|latest|news|weather|find|browse|website)\b/i, /शोध|माहिती शोध|बातमी|हवामान|वेबसाईट/i],
  conversation: [/\b(what|why|how|explain|tell me|translate|summarize|meaning)\b/i, /काय|का|कसे|समजाव|सांग|अर्थ|भाषांतर/i],
};

const highRiskPatterns = [
  /\b(send|delete|erase|purchase|buy|pay|transfer|publish|share|call|install|uninstall|grant permission|change password)\b/i,
  /पाठव|डिलीट|हटव|खरेदी|पैसे|पेमेंट|ट्रान्सफर|प्रकाशित|शेअर|कॉल कर|इन्स्टॉल|परवानगी दे|पासवर्ड बदल/i,
];
const mediumRiskPatterns = [
  /\b(open|launch|turn on|turn off|set alarm|change setting|edit|write|apply patch|run test)\b/i,
  /उघड|चालू कर|बंद कर|सेटिंग बदल|बदल कर|टेस्ट चालव/i,
];

export function decide(input: string): Decision {
  const normalizedInput = input.trim().replace(/\s+/g, " ");
  if (!normalizedInput) {
    return { intent: "unknown", risk: "low", requiresApproval: false, reason: "Empty request.", normalizedInput };
  }

  if (highRiskPatterns.some((pattern) => pattern.test(normalizedInput))) {
    return { intent: "sensitive", risk: "high", requiresApproval: true, reason: "This request may cause an external, irreversible, or sensitive action; explicit approval is required.", normalizedInput };
  }

  const intent = (Object.keys(patterns) as Array<keyof typeof patterns>).find((key) =>
    patterns[key].some((pattern) => pattern.test(normalizedInput)),
  ) ?? "unknown";

  const risk: MRUNEELRisk = mediumRiskPatterns.some((pattern) => pattern.test(normalizedInput)) ? "medium" : "low";
  return {
    intent,
    risk,
    requiresApproval: risk === "medium",
    reason: risk === "medium" ? "Action request detected; confirm before execution." : "No approval-triggering action detected.",
    normalizedInput,
  };
}
