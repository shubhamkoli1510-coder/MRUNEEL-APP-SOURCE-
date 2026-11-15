import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Security Engine for MRUNEEL Assistant.
 * PIN verification and lockout are local; biometric verification is delegated
 * to Android's native BiometricPrompt and fails closed when unavailable.
 */

const PIN_STORAGE_KEY = 'mruneel_pin_hash';
const LOCKOUT_KEY = 'mruneel_lockout_until';
const DEFAULT_PIN = '1234';

interface NativeBiometricPlugin {
  authenticate(): Promise<{ success: boolean; message: string }>;
}

const NativeBiometric = registerPlugin<NativeBiometricPlugin>('NativeBiometric');

export async function hashPin(pin: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + '_mruneel_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Compatibility fallback only. Production Android builds should provide Web Crypto.
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
    // Temporary compatibility for existing installations. Replace during PIN setup migration.
    const defaultHash = await hashPin(DEFAULT_PIN);
    return enteredHash === defaultHash;
  }

  return enteredHash === currentHash;
}

export async function saveNewPin(newPin: string): Promise<void> {
  if (!/^\\d{4}$/.test(newPin)) {
    throw new Error('PIN must contain exactly four digits.');
  }
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
 * Authenticate using Android BiometricPrompt.
 * No browser/demo fallback may grant access without a real verified challenge.
 */
export async function authenticateBiometric(): Promise<{ success: boolean; message: string }> {
  if (Capacitor.getPlatform() !== 'android') {
    return {
      success: false,
      message: 'खरे बायोमेट्रिक प्रमाणीकरण फक्त Android APK मध्ये उपलब्ध आहे.'
    };
  }

  try {
    return await NativeBiometric.authenticate();
  } catch {
    return {
      success: false,
      message: 'बायोमेट्रिक सेवा सुरू झाली नाही. PIN वापरून अनलॉक करा.'
    };
  }
}
