import { AndroidPermissionStatus, DeviceTelemetry } from '../types/assistant';

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  onchargingchange: ((this: BatteryManager, ev: Event) => void) | null;
  onlevelchange: ((this: BatteryManager, ev: Event) => void) | null;
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>;
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
    addEventListener: (type: string, listener: () => void) => void;
  };
}

export const ANDROID_PERMISSIONS_CATALOG: AndroidPermissionStatus[] = [
  {
    id: 'perm-mic',
    name: 'Microphone & Wake Word',
    androidManifestKey: 'android.permission.RECORD_AUDIO',
    webApiStatus: 'prompt',
    isNativeOnly: false,
    description: 'Enables continuous listening for "Mruneel" wake word and conversational speech recognition.',
    purpose: 'Real-time voice assistant interaction in Marathi, Hindi, and English.'
  },
  {
    id: 'perm-cam',
    name: 'Camera & Vision Scanner',
    androidManifestKey: 'android.permission.CAMERA',
    webApiStatus: 'prompt',
    isNativeOnly: false,
    description: 'Accesses rear and front cameras for Gemini-powered object recognition, OCR, and scene intelligence.',
    purpose: 'Real-time visual analysis and HUD scanner reticle.'
  },
  {
    id: 'perm-notif',
    name: 'System Notifications & Alarms',
    androidManifestKey: 'android.permission.POST_NOTIFICATIONS',
    webApiStatus: 'prompt',
    isNativeOnly: false,
    description: 'Sends real-time alarm alerts, reminder triggers, and assistant updates to the Android status bar.',
    purpose: 'Timely reminders and alert notifications.'
  },
  {
    id: 'perm-vibrate',
    name: 'Haptic Feedback & Vibration',
    androidManifestKey: 'android.permission.VIBRATE',
    webApiStatus: 'granted',
    isNativeOnly: false,
    description: 'Provides tactical golden haptic pulses when wake word is acknowledged or PIN buttons are pressed.',
    purpose: 'Tactile user interface feedback.'
  },
  {
    id: 'perm-biometric',
    name: 'Biometric Authentication',
    androidManifestKey: 'android.permission.USE_BIOMETRIC',
    webApiStatus: 'granted',
    isNativeOnly: false,
    description: 'Allows fingerprint and face recognition unlock using Android BiometricPrompt or WebAuthn.',
    purpose: 'Secure personal data and assistant authorization.'
  },
  {
    id: 'perm-location',
    name: 'GPS & Geolocation Telemetry',
    androidManifestKey: 'android.permission.ACCESS_FINE_LOCATION',
    webApiStatus: 'prompt',
    isNativeOnly: false,
    description: 'Acquires precise latitude and longitude coordinates for local weather, prayer times, and navigation.',
    purpose: 'Location-aware assistant recommendations.'
  },
  {
    id: 'perm-hotword-bg',
    name: 'Screen-Off Always-On Hotword Service',
    androidManifestKey: 'android.permission.FOREGROUND_SERVICE_MICROPHONE',
    webApiStatus: 'unsupported',
    isNativeOnly: true,
    description: 'Requires Android Native Foreground Service with WakeLock to listen for "Mruneel" while the phone screen is locked or turned off.',
    purpose: 'True hands-free background wake-word activation (included in provided APK source).'
  },
  {
    id: 'perm-exact-alarm',
    name: 'Exact Alarm Scheduling',
    androidManifestKey: 'android.permission.SCHEDULE_EXACT_ALARM',
    webApiStatus: 'unsupported',
    isNativeOnly: true,
    description: 'Allows Android AlarmManager to trigger ringers precisely at target minute even during deep Doze battery mode.',
    purpose: 'Guaranteed wakeup alarms in native APK.'
  }
];

class DeviceBridge {
  private torchTrack: MediaStreamTrack | null = null;
  private isTorchOn: boolean = false;

  /**
   * Monitor real device battery and network telemetry
   */
  public subscribeTelemetry(onUpdate: (telemetry: Partial<DeviceTelemetry>) => void): () => void {
    const nav = navigator as NavigatorWithBattery;

    // Check battery
    if (nav.getBattery) {
      nav.getBattery().then(battery => {
        const report = () => {
          onUpdate({
            batteryLevel: battery.level,
            isCharging: battery.charging
          });
        };
        report();
        battery.onlevelchange = report;
        battery.onchargingchange = report;
      }).catch(() => {});
    }

    // Check network
    const updateNetwork = () => {
      const conn = nav.connection;
      onUpdate({
        isOnline: navigator.onLine,
        networkType: conn?.effectiveType ? conn.effectiveType.toUpperCase() : (navigator.onLine ? '4G/WiFi' : 'OFFLINE'),
        downlinkSpeedMbps: conn?.downlink || null
      });
    };
    updateNetwork();
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);

    // Orientation / Motion for 3D HUD parallax
    const handleOrientation = (e: DeviceOrientationEvent) => {
      onUpdate({
        orientationAlpha: Math.round(e.alpha || 0),
        orientationBeta: Math.round(e.beta || 0),
        orientationGamma: Math.round(e.gamma || 0)
      });
    };
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }

  /**
   * Haptic vibration
   */
  public vibrate(pattern: number | number[] = 50): void {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  }

  /**
   * Toggle device camera flashlight (torch)
   */
  public async toggleTorch(targetState?: boolean): Promise<boolean> {
    const desired = targetState !== undefined ? targetState : !this.isTorchOn;

    try {
      if (desired) {
        if (!this.torchTrack) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          const track = stream.getVideoTracks()[0];
          this.torchTrack = track;
        }

        // Apply torch constraint if supported
        const imageCaptureTrack = this.torchTrack as MediaStreamTrack & {
          applyConstraints: (c: Record<string, unknown>) => Promise<void>;
        };

        if (imageCaptureTrack && imageCaptureTrack.applyConstraints) {
          await imageCaptureTrack.applyConstraints({
            advanced: [{ torch: true }]
          });
        }
        this.isTorchOn = true;
        return true;
      } else {
        if (this.torchTrack) {
          const imageCaptureTrack = this.torchTrack as MediaStreamTrack & {
            applyConstraints: (c: Record<string, unknown>) => Promise<void>;
          };
          if (imageCaptureTrack && imageCaptureTrack.applyConstraints) {
            await imageCaptureTrack.applyConstraints({
              advanced: [{ torch: false }]
            });
          }
          this.torchTrack.stop();
          this.torchTrack = null;
        }
        this.isTorchOn = false;
        return false;
      }
    } catch {
      // Toggle state simulator for environments without hardware torch
      this.isTorchOn = desired;
      return this.isTorchOn;
    }
  }

  public getTorchState(): boolean {
    return this.isTorchOn;
  }

  /**
   * Trigger native share sheet
   */
  public async share(title: string, text: string, url?: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url: url || window.location.href });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Request Notification Permission
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  }

  /**
   * Dispatch system notification
   */
  public sendNotification(title: string, body: string): void {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          silent: false
        });
      } catch {}
    }
  }

  /**
   * Get Current GPS Coordinates
   */
  public async getCurrentPosition(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return null;
    }
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy)
          });
        },
        () => resolve(null),
        { timeout: 8000, enableHighAccuracy: true }
      );
    });
  }
}

export const deviceBridge = new DeviceBridge();
