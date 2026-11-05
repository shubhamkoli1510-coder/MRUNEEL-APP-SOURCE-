import React, { useState, useEffect } from 'react';
import { Fingerprint, Shield, Delete, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { verifyPin, isLockedOut, triggerLockout, authenticateBiometric } from '../utils/security';
import { soundFx } from '../utils/audioSynthesizer';
import { deviceBridge } from '../utils/deviceBridge';
import { SupportedLanguage } from '../types/assistant';

interface LockScreenProps {
  onUnlockSuccess: () => void;
  language: SupportedLanguage;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlockSuccess, language }) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutSec, setLockoutSec] = useState<number>(0);
  const [isBiometricScanning, setIsBiometricScanning] = useState<boolean>(false);
  const [biometricSuccess, setBiometricSuccess] = useState<boolean>(false);

  // Check lockout on mount and tick
  useEffect(() => {
    const checkLock = () => {
      const status = isLockedOut();
      setLockoutSec(status.remainingSeconds);
    };
    checkLock();
    const interval = setInterval(checkLock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleKeyPress = async (num: string) => {
    if (lockoutSec > 0) return;
    if (pin.length >= 4) return;

    soundFx.playKeyClick();
    deviceBridge.vibrate(30);
    const nextPin = pin + num;
    setPin(nextPin);
    setErrorMsg('');

    if (nextPin.length === 4) {
      const isCorrect = await verifyPin(nextPin);
      if (isCorrect) {
        soundFx.playAffirmative();
        deviceBridge.vibrate([40, 60, 100]);
        setBiometricSuccess(true);
        setTimeout(() => {
          onUnlockSuccess();
        }, 400);
      } else {
        soundFx.playWarning();
        deviceBridge.vibrate([100, 50, 150]);
        const newFails = failedAttempts + 1;
        setFailedAttempts(newFails);
        setPin('');

        if (newFails >= 3) {
          triggerLockout(30);
          setLockoutSec(30);
          setErrorMsg(
            language === 'mr-IN'
              ? 'अनेक अयशस्वी प्रयत्न! सुरक्षा लॉक ३० सेकंदांसाठी सक्रिय.'
              : 'Too many attempts. System locked for 30s.'
          );
        } else {
          setErrorMsg(
            language === 'mr-IN'
              ? `चुकीचा पिन. (डीफॉल्ट पिन: 1234) शिल्लक प्रयत्न: ${3 - newFails}`
              : `Incorrect PIN. (Default: 1234) Remaining: ${3 - newFails}`
          );
        }
      }
    }
  };

  const handleDelete = () => {
    soundFx.playKeyClick();
    deviceBridge.vibrate(20);
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleBiometricAuth = async () => {
    if (lockoutSec > 0 || isBiometricScanning) return;

    soundFx.playScanBlip();
    deviceBridge.vibrate(60);
    setIsBiometricScanning(true);
    setErrorMsg('');

    try {
      const result = await authenticateBiometric();
      if (result.success) {
        soundFx.playAffirmative();
        deviceBridge.vibrate([50, 50, 100]);
        setBiometricSuccess(true);
        setTimeout(() => {
          onUnlockSuccess();
        }, 500);
      } else {
        soundFx.playWarning();
        setErrorMsg(result.message);
      }
    } catch {
      setErrorMsg('Biometric sensor error');
    } finally {
      setIsBiometricScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#030303]/98 backdrop-blur-2xl z-50 flex flex-col items-center justify-center p-4 select-none">
      {/* Background Holographic Hex Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>

      <div className="relative w-full max-w-xs flex flex-col items-center z-10">
        {/* Security Shield Icon */}
        <div className="w-16 h-16 rounded-full border-2 border-amber-500/50 flex items-center justify-center bg-amber-950/30 shadow-[0_0_25px_rgba(245,158,11,0.3)] mb-3">
          {biometricSuccess ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
          ) : (
            <Shield className="w-8 h-8 text-amber-400 animate-pulse" />
          )}
        </div>

        <h1 className="text-xl font-bold tracking-widest text-amber-300 font-mono text-center">
          MRUNEEL SECURITY
        </h1>
        <p className="text-xs text-amber-400/70 mb-4 font-mono text-center">
          {language === 'mr-IN'
            ? 'बायोमेट्रिक किंवा ४-अंकी पिन प्रविष्ट करा'
            : 'ENTER 4-DIGIT MASTER PIN OR BIOMETRICS'}
        </p>

        {/* PIN Indicators */}
        <div className="flex items-center gap-4 my-3">
          {[0, 1, 2, 3].map(idx => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                idx < pin.length
                  ? 'bg-amber-400 border-amber-300 shadow-[0_0_12px_#fbbf24] scale-110'
                  : 'border-amber-600/40 bg-black/60'
              }`}
            />
          ))}
        </div>

        {/* Error / Lockout Alert */}
        {lockoutSec > 0 ? (
          <div className="my-2 px-3 py-1.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>लॉकाऊट: {lockoutSec}s प्रतीक्षा करा</span>
          </div>
        ) : errorMsg ? (
          <div className="my-2 text-rose-400 text-xs text-center font-mono">
            {errorMsg}
          </div>
        ) : (
          <div className="h-6"></div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full my-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              disabled={lockoutSec > 0}
              aria-label={`Digit ${num}`}
              className="h-14 rounded-xl hud-panel flex items-center justify-center text-xl font-mono text-amber-200 hover:text-amber-100 hover:border-amber-400 active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            >
              {num}
            </button>
          ))}

          {/* Biometric Trigger */}
          <button
            onClick={handleBiometricAuth}
            disabled={lockoutSec > 0}
            aria-label="Scan Fingerprint or Face Biometric"
            className={`h-14 rounded-xl hud-panel flex flex-col items-center justify-center text-amber-300 hover:text-amber-100 hover:border-amber-400 active:scale-95 transition-all cursor-pointer relative overflow-hidden ${
              isBiometricScanning ? 'border-amber-400 shadow-[0_0_15px_#fbbf24]' : ''
            }`}
          >
            <Fingerprint className={`w-6 h-6 ${isBiometricScanning ? 'text-amber-300 animate-pulse' : 'text-amber-400'}`} />
            <span className="text-[9px] uppercase tracking-wider font-mono">बायो</span>
            {isBiometricScanning && (
              <div className="absolute inset-x-0 h-1 bg-amber-400 top-0 animate-hud-scan"></div>
            )}
          </button>

          {/* Zero Button */}
          <button
            onClick={() => handleKeyPress('0')}
            disabled={lockoutSec > 0}
            aria-label="Digit 0"
            className="h-14 rounded-xl hud-panel flex items-center justify-center text-xl font-mono text-amber-200 hover:text-amber-100 hover:border-amber-400 active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            0
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            disabled={lockoutSec > 0 || pin.length === 0}
            aria-label="Delete last digit"
            className="h-14 rounded-xl hud-panel flex items-center justify-center text-amber-400 hover:text-amber-300 active:scale-95 transition-all cursor-pointer disabled:opacity-30"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[11px] text-amber-500/50 mt-4 text-center font-mono">
          MRUNEEL BIOMETRIC SECURITY SUBSYSTEM
        </p>
      </div>
    </div>
  );
};
