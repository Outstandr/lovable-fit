import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.hotstepper',
  appName: 'Lionel X',
  webDir: 'dist',
  // Dev server removed for production release
  android: {
    minWebViewVersion: 55,
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      signingType: 'apksigner'
    }
  },
  ios: {
    // iOS deployment target - iOS 15.0 for Health Connect API parity
    scheme: 'App',
    // Content inset behavior for safe areas
    contentInset: 'automatic',
    // Allow mixed content for development
    allowsLinkPreview: true,
    // Scroll behavior
    scrollEnabled: true,
    // Background modes handled in Info.plist
    // HealthKit, Push Notifications, Location configured in Xcode
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#FF6B35'
    }
  }
};

export default config;
