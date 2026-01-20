import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.hotstepper',
  appName: 'Hotstepper',
  webDir: 'dist',
  
  android: {
    minWebViewVersion: 55,
    
  },
  
  ios: {
    scheme: 'App',
    contentInset: 'automatic',
    allowsLinkPreview: true,
    scrollEnabled: true,
  },
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: "#0a0a0a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
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
