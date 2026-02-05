import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.miniminds.app',
  appName: 'Miniminds',
  webDir: 'dist/miniminds-web/browser',

  // Server configuration for deep linking
  server: {
    // Handle deep links within the app
    androidScheme: 'https'
  },

  // iOS specific settings
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: true,
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
    preferredContentMode: 'mobile'
  },

  // Android specific settings
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },

  plugins: {
    // Enable native HTTP to bypass CORS on mobile
    CapacitorHttp: {
      enabled: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: false,
      splashImmersive: false
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    // MLKit Barcode Scanner configuration
    CapacitorMLKitBarcodeScanning: {
      // Automatically check for Google Barcode Scanner availability
      checkGoogleBarcodeScannerAvailability: true
    }
  }
};

export default config;
