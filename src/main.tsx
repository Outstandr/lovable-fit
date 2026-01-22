import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Configure status bar for native iOS feel
const configureStatusBar = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Make status bar overlay the webview (true edge-to-edge)
      await StatusBar.setOverlaysWebView({ overlay: true });
      // Light text for dark background (Midnight Ops theme)
      await StatusBar.setStyle({ style: Style.Dark });
    } catch (e) {
      console.log('StatusBar not available');
    }
  }
};

// Hide splash screen after app loads
const hideSplash = async () => {
  try {
    await SplashScreen.hide({
      fadeOutDuration: 500
    });
  } catch (error) {
    console.log('Splash screen not available');
  }
};

// Initialize native features
configureStatusBar();
setTimeout(hideSplash, 2000);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
