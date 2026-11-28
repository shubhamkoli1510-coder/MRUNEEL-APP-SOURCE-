import { Capacitor, registerPlugin } from '@capacitor/core';

type DeviceStatus = {
  batteryLevel: number | null;
  isCharging: boolean;
  isOnline: boolean;
  networkType: string;
  musicVolume: number;
  musicVolumeMax: number;
  torchEnabled: boolean;
};
interface AndroidDeviceActionsPlugin {
  setTorch(options: { enabled: boolean }): Promise<{ enabled: boolean }>;
  adjustVolume(options: { direction: -1 | 1 }): Promise<{ volume: number; max: number }>;
  vibrate(options: { durationMs?: number }): Promise<void>;
  getDeviceStatus(): Promise<DeviceStatus>;
  openScreen(options: { target: 'wifi' | 'bluetooth' | 'settings' | 'camera' | 'dialer' }): Promise<void>;
  launchApp(options: { appId: 'whatsapp' | 'youtube' | 'chrome' | 'maps' | 'phone' | 'camera' | 'calculator' | 'settings' }): Promise<{ appId: string; packageName: string }>;
}
const NativeActions = registerPlugin<AndroidDeviceActionsPlugin>('AndroidDeviceActions');

export const androidDeviceActions = {
  isAndroid: () => Capacitor.getPlatform() === 'android',
  setTorch: (enabled: boolean) => NativeActions.setTorch({ enabled }),
  volumeUp: () => NativeActions.adjustVolume({ direction: 1 }),
  volumeDown: () => NativeActions.adjustVolume({ direction: -1 }),
  vibrate: (durationMs = 100) => NativeActions.vibrate({ durationMs }),
  getStatus: () => NativeActions.getDeviceStatus(),
  openScreen: (target: 'wifi' | 'bluetooth' | 'settings' | 'camera' | 'dialer') => NativeActions.openScreen({ target }),
  launchApp: (appId: 'whatsapp' | 'youtube' | 'chrome' | 'maps' | 'phone' | 'camera' | 'calculator' | 'settings') => NativeActions.launchApp({ appId }),
};
