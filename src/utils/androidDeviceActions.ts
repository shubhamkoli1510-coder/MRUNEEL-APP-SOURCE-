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
}
const NativeActions = registerPlugin<AndroidDeviceActionsPlugin>('AndroidDeviceActions');

export const androidDeviceActions = {
  isAndroid: () => Capacitor.getPlatform() === 'android',
  setTorch: (enabled: boolean) => NativeActions.setTorch({ enabled }),
  volumeUp: () => NativeActions.adjustVolume({ direction: 1 }),
  volumeDown: () => NativeActions.adjustVolume({ direction: -1 }),
  vibrate: (durationMs = 100) => NativeActions.vibrate({ durationMs }),
  getStatus: () => NativeActions.getDeviceStatus(),
};
