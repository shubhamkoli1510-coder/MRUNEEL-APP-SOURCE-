import { MemoryStore, type MemoryStorageAdapter } from "./memoryStore";

export type MemoryCommandResult = { handled: false } | { handled: true; response: string; action: "saved" | "listed" | "cleared" | "blocked" | "empty" };
const SENSITIVE_HINTS = /\b(password|passcode|pin|otp|token|api key|secret|bank account|card number|credit card|debit card|passport|aadhaar|identity|address|exact location|political|religion|sexual|caste|race|medical|diagnosis|medicine|health|salary|income|financial)\b|पासवर्ड|पिन|ओटीपी|आरोग्य|औषध|बँक|पगार|आधार|पत्ता|धर्म|जात|राजकीय|वैद्यकीय/i;

/** Create a browser-backed memory store only when local storage exists; never sync to cloud. */
export function createMemoryCommandStore(adapter?: MemoryStorageAdapter): MemoryStore | null {
  if (adapter) return new MemoryStore(adapter);
  try { if (typeof localStorage === "undefined") return null; return new MemoryStore(localStorage); } catch { return null; }
}

/** Handles only explicit remember/recall/forget phrasing. No implicit background saving. */
export function handleMemoryCommand(text: string, store: MemoryStore | null, language: "mr-IN" | "en-US" = "mr-IN"): MemoryCommandResult {
  const input = text.trim();
  if (!input) return { handled: false };
  const isMarathi = language === "mr-IN";
  if (/^(forget all memories|clear all memories|delete all memories|सगळ्या आठवणी पुस|सर्व आठवणी पुस)/i.test(input)) {
    if (!store) return { handled: true, action: "blocked", response: isMarathi ? "या डिव्हाइसवर local memory उपलब्ध नाही." : "Local memory is unavailable on this device." };
    store.clear();
    return { handled: true, action: "cleared", response: isMarathi ? "स्थानिक MRUNEEL आठवणी पुसल्या." : "Local MRUNEEL memories cleared." };
  }
  if (/^(what do you remember|show memories|माझ्याबद्दल काय आठवतं|काय आठवतं)/i.test(input)) {
    const records = store?.list().filter((record) => record.sensitivity === "ordinary") ?? [];
    return { handled: true, action: "listed", response: records.length ? (isMarathi ? "माझ्या स्थानिक आठवणी:\n" : "My local memories:\n") + records.map((record) => "• " + record.text).join("\n") : (isMarathi ? "सध्या कोणतीही सेव्ह केलेली सामान्य आठवण नाही." : "No ordinary memories are saved yet.") };
  }
  const match = input.match(/^(?:remember(?:\s+that)?|save\s+this|लक्षात\s+ठेव(?:\s+की)?|हे\s+लक्षात\s+ठेव)\s*[:,-]?\s*(.+)$/i);
  if (!match) return { handled: false };
  const memoryText = match[1].trim();
  if (!memoryText) return { handled: true, action: "empty", response: isMarathi ? "काय लक्षात ठेवायचं ते सांग." : "Tell me what you want me to remember." };
  if (SENSITIVE_HINTS.test(memoryText)) return { handled: true, action: "blocked", response: isMarathi ? "संवेदनशील माहिती (पासवर्ड, आरोग्य, आर्थिक तपशील इ.) मी memory मध्ये सेव्ह करत नाही." : "I won't save sensitive information such as credentials, health, or financial details." };
  if (!store) return { handled: true, action: "blocked", response: isMarathi ? "या डिव्हाइसवर local memory उपलब्ध नाही; काहीही सेव्ह केलेलं नाही." : "Local memory is unavailable; nothing was saved." };
  let result: ReturnType<MemoryStore["save"]>;
  try { result = store.save(memoryText, { explicitConsent: true, sensitivity: "ordinary" }); } catch { return { handled: true, action: "blocked", response: isMarathi ? "डिव्हाइस storage मध्ये अडचण आली; memory सेव्ह झाली नाही." : "Local storage failed; the memory was not saved." }; }
  if (result.saved === true) {
    return { handled: true, action: "saved", response: isMarathi ? "ठीक, ही सामान्य आठवण या डिव्हाइसवर सेव्ह केली. Cloud वर पाठवलेली नाही." : "Saved this ordinary memory locally on this device. It was not sent to the cloud." };
  }
  return { handled: true, action: "blocked", response: result.reason };
}
