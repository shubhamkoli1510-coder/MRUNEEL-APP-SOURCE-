/**
 * Security Engine for MRUNEEL Assistant
 * Handles PIN hashing, biometric credential verification, and brute-force lockout protection.
 */

const PIN_STORAGE_KEY = 'mruneel_pin_hash';
const LOCKOUT_KEY = 'mruneel_lockout_until';
const DEFAULT_PIN = '1234';

// Simple fast SHA-256 equivalent hash using Web Crypto API or fallback
export async function hashPin(pin: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + '_mruneel_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple deterministic hash
  let hash = 0;
  const salted = pin + '_mruneel_salt';
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

export async function verifyPin(enteredPin: string): Promise<boolean> {
  const currentHash = localStorage.getItem(PIN_STORAGE_KEY);
  const enteredHash = await hashPin(enteredPin);

  if (!currentHash) {
    // Check against default PIN 1234
    const defaultHash = await hashPin(DEFAULT_PIN);
    return enteredHash === defaultHash;
  }

  return enteredHash === currentHash;
}

export async function saveNewPin(newPin: string): Promise<void> {
  const hash = await hashPin(newPin);
  localStorage.setItem(PIN_STORAGE_KEY, hash);
}

export function isLockedOut(): { locked: boolean; remainingSeconds: number } {
  const lockoutUntil = localStorage.getItem(LOCKOUT_KEY);
  if (!lockoutUntil) return { locked: false, remainingSeconds: 0 };

  const until = parseInt(lockoutUntil, 10);
  const now = Date.now();
  if (now < until) {
    return { locked: true, remainingSeconds: Math.ceil((until - now) / 1000) };
  }

  localStorage.removeItem(LOCKOUT_KEY);
  return { locked: false, remainingSeconds: 0 };
}

export function triggerLockout(seconds: number = 30): void {
  const until = Date.now() + seconds * 1000;
  localStorage.setItem(LOCKOUT_KEY, until.toString());
}

/**
 * Trigger Biometric Authentication via WebAuthn if supported on Android / Mobile browser
 */
/**
 * Fail closed until a real native Android BiometricPrompt challenge is wired.
 * Merely detecting an available fingerprint/face sensor is NOT authentication.
 */
export async function authenticateBiometric(): Promise<{ success: boolean; message: string }> {
  return {
    success: false,
    message: 'बायोमेट्रिक सुरक्षा अजून native पद्धतीने जोडलेली नाही. सध्या ४-अंकी PIN वापरा.'
  };
}
