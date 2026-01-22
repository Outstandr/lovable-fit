import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Initialize native features after DOM is ready
const initializeNativeFeatures = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Configure status bar for native iOS feel
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({ style: Style.Dark });
    } catch (e) {
      console.log('StatusBar not available');
    }
  }
  
  // Hide splash screen
  try {
    await SplashScreen.hide({ fadeOutDuration: 500 });
  } catch (e) {
    console.log('Splash screen not available');
  }
};

// Render React app first, then initialize native features
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Initialize native features after a brief delay to ensure app is mounted
setTimeout(initializeNativeFeatures, 2000);
