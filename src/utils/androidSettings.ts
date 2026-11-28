import { Capacitor, registerPlugin } from '@capacitor/core';

interface AndroidSettingsPlugin {
  openAppSettings(): Promise<void>;
  openDeveloperOptions(): Promise<void>;
  openAccessibilitySettings(): Promise<void>;
  openNotificationSettings(): Promise<void>;
  openBatterySettings(): Promise<void>;
  openAssistantSettings(): Promise<void>;
  openExactAlarmSettings(): Promise<void>;
}

const AndroidSettings = registerPlugin<AndroidSettingsPlugin>('AndroidSettings');

export const androidSettings = {
  isAndroid: () => Capacitor.getPlatform() === 'android',
  openAppSettings: () => AndroidSettings.openAppSettings(),
  openDeveloperOptions: () => AndroidSettings.openDeveloperOptions(),
  openAccessibilitySettings: () => AndroidSettings.openAccessibilitySettings(),
  openNotificationSettings: () => AndroidSettings.openNotificationSettings(),
  openBatterySettings: () => AndroidSettings.openBatterySettings(),
  openAssistantSettings: () => AndroidSettings.openAssistantSettings(),
  openExactAlarmSettings: () => AndroidSettings.openExactAlarmSettings(),
};
