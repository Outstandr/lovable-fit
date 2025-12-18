import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.hotstepper',
  appName: 'Hotstepper',
  webDir: 'dist',
  // Uncomment below for development hot-reload:
  // server: {
  //   url: 'https://5220bb0a-2720-4ce5-ad2f-a5b6636b045c.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  android: {
    minWebViewVersion: 55,
    backgroundColor: '#0A1128',
    allowMixedContent: true,
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      signingType: 'apksigner'
    }
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A1128'
    }
  }
};

export default config;
