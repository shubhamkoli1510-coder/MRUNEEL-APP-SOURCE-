import React, { useState } from 'react';
import {
  FileCode,
  Terminal,
  Copy,
  Check,
  X,
  Smartphone,
  Download,
  ExternalLink,
} from 'lucide-react';
import { soundFx } from '../utils/audioSynthesizer';

interface AndroidApkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidApkExportModal: React.FC<AndroidApkExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'manifest' | 'config' | 'service'>('guide');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    soundFx.playKeyClick();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const ANDROID_MANIFEST_XML = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.mruneel.assistant">

    <!-- Essential Permissions for MRUNEEL Assistant -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="MRUNEEL"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:screenOrientation="portrait"
            android:theme="@style/AppTheme.NoActionBarLaunch">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
                <!-- Registered as Assist Action for Android Home Button Long Press -->
                <action android:name="android.intent.action.ASSIST" />
                <category android:name="android.intent.category.DEFAULT" />
            </intent-filter>
        </activity>

        <!-- Native Background Hotword Service for Screen-Off "Mruneel" Detection -->
        <service
            android:name=".service.WakeWordForegroundService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="microphone" />
    </application>
</manifest>`;

  const CAPACITOR_CONFIG_JSON = `{
  "appId": "com.mruneel.assistant",
  "appName": "MRUNEEL",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "server": {
    "androidScheme": "https",
    "cleartext": true
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 1500,
      "backgroundColor": "#030303"
    },
    "StatusBar": {
      "style": "DARK",
      "backgroundColor": "#030303"
    }
  }
}`;

  const KOTLIN_HOTWORD_SERVICE = `package com.mruneel.assistant.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.mruneel.assistant.R

/**
 * Android Native Foreground Service for continuous screen-off "Mruneel" wake word detection.
 * Integrates with on-device Vosk or Porcupine Hotword engine.
 */
class WakeWordForegroundService : Service() {

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val channelId = "mruneel_wake_channel"
        val channel = NotificationChannel(
            channelId,
            "MRUNEEL Background Listener",
            NotificationManager.IMPORTANCE_LOW
        )
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)

        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("MRUNEEL Assistant Active")
            .setContentText("Listening for wake word 'Mruneel'...")
            .setSmallIcon(R.drawable.ic_stat_mruneel)
            .setOngoing(true)
            .build()

        startForeground(1001, notification)
        startHotwordRecognition()

        return START_STICKY
    }

    private fun startHotwordRecognition() {
        // Initializes low-power audio record buffer and Porcupine/Vosk engine
    }

    override fun onBind(intent: Intent?): IBinder? = null
}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-3xl bg-zinc-950 border border-amber-500/30 rounded-2xl overflow-hidden flex flex-col max-h-[88vh] shadow-[0_0_60px_rgba(245,158,11,0.25)]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-amber-950/40 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-400" />
            <h2 className="font-mono text-sm tracking-wider text-amber-300 font-bold">
              ANDROID APK BUILD STUDIO & SOURCE CODE
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-full text-amber-400/80 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-amber-500/20 bg-black/40 overflow-x-auto">
          <button
            onClick={() => { soundFx.playKeyClick(); setActiveTab('guide'); }}
            className={`px-4 py-2.5 text-xs font-mono font-semibold flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'guide'
                ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-950/30'
                : 'text-amber-500/60 hover:text-amber-400'
            }`}
          >
            <Terminal className="w-4 h-4" /> APK Build Steps
          </button>

          <button
            onClick={() => { soundFx.playKeyClick(); setActiveTab('manifest'); }}
            className={`px-4 py-2.5 text-xs font-mono font-semibold flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'manifest'
                ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-950/30'
                : 'text-amber-500/60 hover:text-amber-400'
            }`}
          >
            <FileCode className="w-4 h-4" /> AndroidManifest.xml
          </button>

          <button
            onClick={() => { soundFx.playKeyClick(); setActiveTab('config'); }}
            className={`px-4 py-2.5 text-xs font-mono font-semibold flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'config'
                ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-950/30'
                : 'text-amber-500/60 hover:text-amber-400'
            }`}
          >
            <FileCode className="w-4 h-4" /> capacitor.config.json
          </button>

          <button
            onClick={() => { soundFx.playKeyClick(); setActiveTab('service'); }}
            className={`px-4 py-2.5 text-xs font-mono font-semibold flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'service'
                ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-950/30'
                : 'text-amber-500/60 hover:text-amber-400'
            }`}
          >
            <FileCode className="w-4 h-4" /> HotwordService.kt
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: BUILD GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-amber-200">
              <div className="p-3.5 rounded-xl hud-panel space-y-2">
                <h3 className="font-bold text-amber-300 text-sm font-mono flex items-center gap-2">
                  <span>How to compile MRUNEEL into a release Android .APK or .AAB</span>
                </h3>
                <p className="leading-relaxed">
                  MRUNEEL is engineered to compile directly into a native Android project using <strong>Capacitor</strong> or <strong>Android Studio</strong>.
                </p>
              </div>

              {/* Step 1 */}
              <div className="p-3 rounded-xl bg-black/60 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 font-mono">1. Build Frontend Distribution Assets</span>
                  <button
                    onClick={() => copyToClipboard('npm run build', 'step1')}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-white cursor-pointer font-mono"
                  >
                    {copiedKey === 'step1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>
                </div>
                <pre className="p-2 rounded bg-zinc-950 border border-zinc-800 font-mono text-amber-300 text-[11px] overflow-x-auto">
                  npm run build
                </pre>
              </div>

              {/* Step 2 */}
              <div className="p-3 rounded-xl bg-black/60 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 font-mono">2. Initialize Android Platform with Capacitor</span>
                  <button
                    onClick={() => copyToClipboard('npm i @capacitor/core @capacitor/cli @capacitor/android && npx cap add android', 'step2')}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-white cursor-pointer font-mono"
                  >
                    {copiedKey === 'step2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>
                </div>
                <pre className="p-2 rounded bg-zinc-950 border border-zinc-800 font-mono text-amber-300 text-[11px] overflow-x-auto">
                  npm i @capacitor/core @capacitor/cli @capacitor/android && npx cap add android
                </pre>
              </div>

              {/* Step 3 */}
              <div className="p-3 rounded-xl bg-black/60 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 font-mono">3. Sync Web Assets to Android Studio Project</span>
                  <button
                    onClick={() => copyToClipboard('npx cap sync && npx cap open android', 'step3')}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-white cursor-pointer font-mono"
                  >
                    {copiedKey === 'step3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>
                </div>
                <pre className="p-2 rounded bg-zinc-950 border border-zinc-800 font-mono text-amber-300 text-[11px] overflow-x-auto">
                  npx cap sync && npx cap open android
                </pre>
                <p className="text-[11px] text-amber-400/70 mt-1">
                  In Android Studio: Click <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>. The resulting APK will be placed in <code className="text-amber-300">android/app/build/outputs/apk/debug/app-debug.apk</code>.
                </p>
              </div>

              {/* Alternative: PWA / WebAPK One-Click Install */}
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                <div className="font-bold text-amber-300">Quick Android Installation (WebAPK / PWA):</div>
                <p className="text-[11px] leading-relaxed">
                  On an Android phone running Chrome: Tap the <strong>three dots menu (&vellip;) &gt; &quot;Install App&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>. Android automatically creates a sandboxed WebAPK with full-screen immersive JARVIS interface and native camera/microphone privileges.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: MANIFEST */}
          {activeTab === 'manifest' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-amber-300">android/app/src/main/AndroidManifest.xml</span>
                <button
                  onClick={() => copyToClipboard(ANDROID_MANIFEST_XML, 'manifest')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs cursor-pointer"
                >
                  {copiedKey === 'manifest' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy Manifest
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-zinc-950 border border-amber-500/20 font-mono text-amber-300 text-[11px] overflow-x-auto max-h-96">
                {ANDROID_MANIFEST_XML}
              </pre>
            </div>
          )}

          {/* TAB 3: CONFIG */}
          {activeTab === 'config' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-amber-300">capacitor.config.json</span>
                <button
                  onClick={() => copyToClipboard(CAPACITOR_CONFIG_JSON, 'config')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs cursor-pointer"
                >
                  {copiedKey === 'config' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy Config
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-zinc-950 border border-amber-500/20 font-mono text-amber-300 text-[11px] overflow-x-auto">
                {CAPACITOR_CONFIG_JSON}
              </pre>
            </div>
          )}

          {/* TAB 4: KOTLIN BACKGROUND SERVICE */}
          {activeTab === 'service' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-amber-300">android/app/src/main/java/.../WakeWordForegroundService.kt</span>
                <button
                  onClick={() => copyToClipboard(KOTLIN_HOTWORD_SERVICE, 'service')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs cursor-pointer"
                >
                  {copiedKey === 'service' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy Kotlin Code
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-zinc-950 border border-amber-500/20 font-mono text-amber-300 text-[11px] overflow-x-auto max-h-96">
                {KOTLIN_HOTWORD_SERVICE}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
