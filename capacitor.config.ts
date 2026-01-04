import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.miniminds.app',
  appName: 'miniminds',
  webDir: 'dist/miniminds-web/browser',
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: true,
    contentInset: 'automatic'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
