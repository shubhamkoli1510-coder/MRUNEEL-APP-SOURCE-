import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Sparkles, Upload, Flashlight, AlertCircle } from 'lucide-react';
import { SupportedLanguage } from '../types/assistant';
import { soundFx } from '../utils/audioSynthesizer';
import { deviceBridge } from '../utils/deviceBridge';

const API_BASE_URL = 'https://mruneel-core-api.onrender.com';

interface CameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (analysisText: string, imageThumbnail: string) => void;
  language: SupportedLanguage;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  isOpen,
  onClose,
  onScanResult,
  language,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [torchActive, setTorchActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start camera stream when open
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    startCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setCameraError('');
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.warn('Camera access issue:', err);
      setCameraError(
        'कॅमेरा थेट सुरू होऊ शकला नाही. कृपया खालील अपलोड पर्याय वापरा किंवा कॅमेरा परवानगी तपासा.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const flipCamera = () => {
    soundFx.playKeyClick();
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const toggleTorch = async () => {
    soundFx.playKeyClick();
    const next = !torchActive;
    setTorchActive(next);
    await deviceBridge.toggleTorch(next);
  };

  const captureFrame = async () => {
    if (isProcessing) return;
    soundFx.playScanBlip();
    deviceBridge.vibrate([40, 30, 40]);
    setIsProcessing(true);

    try {
      let base64Data = '';

      if (videoRef.current && videoRef.current.videoWidth) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          base64Data = canvas.toDataURL('image/jpeg', 0.85);
        }
      }

      if (!base64Data) {
        throw new Error('No frame data captured');
      }

      // Call Gemini Vision API on backend
      const res = await fetch(`${API_BASE_URL}/api/gemini/vision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          language,
          prompt:
            language === 'mr-IN'
              ? 'या चित्रात कोणती वस्तू, मजकूर, दृश्य किंवा कागदपत्र दिसत आहे ते ओळखून सविस्तर मराठीत सांगा.'
              : 'Identify and describe the objects, text, scene, and details in this image.'
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'Failed to analyze frame');
      }

      soundFx.playAffirmative();
      deviceBridge.vibrate(80);
      onScanResult(data.analysis, base64Data);
      onClose();
    } catch (err) {
      soundFx.playWarning();
      setCameraError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setIsProcessing(true);
      soundFx.playScanBlip();

      try {
        const res = await fetch(`${API_BASE_URL}/api/gemini/vision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            language,
            mimeType: file.type,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.details || 'Vision error');
        soundFx.playAffirmative();
        onScanResult(data.analysis, base64Data);
        onClose();
      } catch (err) {
        soundFx.playWarning();
        setCameraError((err as Error).message);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-amber-400 animate-pulse" />
          <span className="font-mono text-sm tracking-widest text-amber-300 font-bold">
            MRUNEEL OPTICAL VISION
          </span>
        </div>

        <button
          onClick={onClose}
          aria-label="Close Camera Scanner"
          className="p-1.5 rounded-full bg-zinc-900 border border-amber-500/30 text-amber-400 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Viewport & Reticle */}
      <div className="relative flex-1 my-3 flex items-center justify-center rounded-2xl overflow-hidden border border-amber-500/40 bg-zinc-950">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* HUD Target Overlay Reticle */}
        <div className="absolute inset-8 sm:inset-16 pointer-events-none border border-amber-400/30 flex flex-col justify-between p-2">
          {/* 4 Corner Crosshairs */}
          <div className="flex justify-between">
            <div className="w-6 h-6 border-t-2 border-l-2 border-amber-400 shadow-[0_0_8px_#fbbf24]"></div>
            <div className="w-6 h-6 border-t-2 border-r-2 border-amber-400 shadow-[0_0_8px_#fbbf24]"></div>
          </div>

          {/* Center Target Ring */}
          <div className="self-center w-24 h-24 rounded-full border border-dashed border-amber-400/50 flex items-center justify-center animate-spin-slow">
            <div className="w-3 h-3 rounded-full bg-amber-400/80 shadow-[0_0_10px_#fbbf24]"></div>
          </div>

          <div className="flex justify-between">
            <div className="w-6 h-6 border-b-2 border-l-2 border-amber-400 shadow-[0_0_8px_#fbbf24]"></div>
            <div className="w-6 h-6 border-b-2 border-r-2 border-amber-400 shadow-[0_0_8px_#fbbf24]"></div>
          </div>

          {/* Scanning sweep laser */}
          {isProcessing && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#fbbf24] animate-hud-scan"></div>
          )}
        </div>

        {/* Error notification */}
        {cameraError && (
          <div className="absolute bottom-4 inset-x-4 bg-zinc-900/90 border border-amber-500/40 p-3 rounded-xl text-xs text-amber-200 flex items-start gap-2 z-30">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{cameraError}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-amber-400 underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> गॅलरीतून फोटो निवडा (Upload Image)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Actions Bar */}
      <div className="flex items-center justify-around py-2 z-20">
        {/* Gallery Upload Fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload photo from Android device"
          className="p-3 rounded-full bg-zinc-900 border border-amber-500/30 text-amber-400 hover:text-white cursor-pointer"
          title="Upload Photo"
        >
          <Upload className="w-5 h-5" />
        </button>

        {/* Primary Scan Button */}
        <button
          onClick={captureFrame}
          disabled={isProcessing}
          aria-label="Capture and identify object with Gemini Vision"
          className="px-6 py-3.5 rounded-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 text-black font-bold flex items-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.6)] active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className="w-5 h-5 animate-spin" />
          <span className="font-mono text-sm tracking-wider uppercase">
            {isProcessing ? 'स्कॅनिंग...' : 'वस्तू ओळखा (SCAN)'}
          </span>
        </button>

        {/* Camera Flip */}
        <button
          onClick={flipCamera}
          aria-label="Switch between Front and Rear camera"
          className="p-3 rounded-full bg-zinc-900 border border-amber-500/30 text-amber-400 hover:text-white cursor-pointer"
          title="Switch Camera"
        >
          <RefreshCw className="w-5 h-5" />
        </button>

        {/* Torch Toggle */}
        <button
          onClick={toggleTorch}
          aria-label="Toggle Camera Flashlight"
          className={`p-3 rounded-full border cursor-pointer ${
            torchActive
              ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_#fbbf24]'
              : 'bg-zinc-900 border-amber-500/30 text-amber-400 hover:text-white'
          }`}
          title="Torch"
        >
          <Flashlight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
