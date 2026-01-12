import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SplashScreen } from '@capacitor/splash-screen';

// Hide splash screen after app loads
const hideSplash = async () => {
  try {
    await SplashScreen.hide({
      fadeOutDuration: 500
    });
  } catch (error) {
    // Splash screen not available in browser, only shows in mobile app
    console.log('Splash screen not available');
  }
};

// Hide splash after minimum display time
setTimeout(hideSplash, 2000);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
