/**
 * Security Engine for MRUNEEL Assistant
 * Handles PIN hashing, biometric credential verification, and brute-force lockout protection.
 */

const PIN_STORAGE_KEY = 'mruneel_pin_hash';
const LOCKOUT_KEY = 'mruneel_lockout_until';
const DEFAULT_PIN = '1234';
const PBKDF2_ITERATIONS = 210_000;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}

async function derivePinKey(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Secure device cryptography is unavailable');
  }
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

async function legacyHashPin(pin: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Secure device cryptography is unavailable');
  }
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(pin + '_mruneel_salt_2026')
  );
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle || !crypto.getRandomValues) {
    throw new Error('Secure device cryptography is unavailable; PIN was not saved');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derivePinKey(pin, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256${PBKDF2_ITERATIONS}${toBase64(salt)}${toBase64(derived)}`;
}

export async function verifyPin(enteredPin: string): Promise<boolean> {
  try {
    const currentHash = localStorage.getItem(PIN_STORAGE_KEY);
    if (!currentHash) {
      const matchesDefault = (await legacyHashPin(enteredPin)) === (await legacyHashPin(DEFAULT_PIN));
      if (matchesDefault) await saveNewPin(enteredPin);
      return matchesDefault;
    }

    if (currentHash.startsWith('pbkdf2-sha256

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
)) {
      const [, iterationText, saltText, expectedText] = currentHash.split('

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
);
      const iterations = Number(iterationText);
      if (!Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > 1_000_000 || !saltText || !expectedText) {
        return false;
      }
      const actual = await derivePinKey(enteredPin, fromBase64(saltText), iterations);
      const expected = fromBase64(expectedText);
      if (actual.length !== expected.length) return false;
      let difference = 0;
      for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
      return difference === 0;
    }

    // Upgrade existing fixed-salt SHA-256 PINs after a successful match.
    if ((await legacyHashPin(enteredPin)) === currentHash) {
      await saveNewPin(enteredPin);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function saveNewPin(newPin: string): Promise<void> {
  if (!/^\\d{4}$/.test(newPin)) throw new Error('PIN must contain exactly four digits');
  const encodedHash = await hashPin(newPin);
  localStorage.setItem(PIN_STORAGE_KEY, encodedHash);
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
