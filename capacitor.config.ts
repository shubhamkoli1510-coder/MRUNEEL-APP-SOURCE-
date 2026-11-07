import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mruneel.assistant.bluejarvis',
  appName: 'MRUNEEL',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#030303',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#030303',
    },
  },
};

export default config;
