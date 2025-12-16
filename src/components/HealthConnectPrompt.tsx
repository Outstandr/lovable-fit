import { motion } from "framer-motion";
import { Activity, Smartphone, ExternalLink, X, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { HealthConnectStatus } from "@/services/healthConnectService";

interface HealthConnectPromptProps {
  platform: 'android' | 'ios' | 'web';
  healthConnectAvailable?: HealthConnectStatus;
  dataSource?: 'healthconnect' | 'pedometer' | 'unavailable';
  onSkipHealthConnect?: () => void;
  isInitializing?: boolean;
}

export const HealthConnectPrompt = ({
  platform,
  healthConnectAvailable = 'Unknown',
  dataSource = 'unavailable',
  onSkipHealthConnect,
  isInitializing = false,
}: HealthConnectPromptProps) => {
  const [dismissed, setDismissed] = useState(false);

  // Check if user has dismissed before
  useEffect(() => {
    const wasDismissed = localStorage.getItem('healthConnectSetupDismissed');
    if (wasDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  // Web platform notice
  if (platform === 'web') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="tactical-card border-primary/30"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-1">
              Mobile App Required
            </h3>
            <p className="text-xs text-muted-foreground">
              Step tracking requires the mobile app. Download from the App Store or Google Play.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Loading state
  if (isInitializing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="tactical-card"
      >
        <div className="flex items-center justify-center gap-3 py-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Checking health data sources...</span>
        </div>
      </motion.div>
    );
  }

  // Already using Health Connect - no prompt needed
  if (dataSource === 'healthconnect') {
    return null;
  }

  // Already using pedometer and dismissed
  if (dataSource === 'pedometer' && dismissed) {
    return null;
  }

  // Health Connect available but not yet connected - informational only
  if (healthConnectAvailable === 'Available' && dataSource !== 'pedometer' && !dismissed) {
    const handleDismiss = () => {
      setDismissed(true);
      localStorage.setItem('healthConnectSetupDismissed', 'true');
      if (onSkipHealthConnect) {
        onSkipHealthConnect();
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="tactical-card border-accent/30"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-accent/20">
            <Activity className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-1">
              Health Connect Ready
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              Health Connect will request permission when you start tracking. This syncs with Google Fit, Samsung Health, and wearables.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>Permissions are managed by Android system</span>
            </div>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismiss}
                className="border-border/50"
              >
                Got It
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  // Health Connect not installed
  if (healthConnectAvailable === 'NotInstalled' && !dismissed) {
    const handleInstall = () => {
      window.open('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata', '_blank');
    };

    const handleSkip = () => {
      setDismissed(true);
      localStorage.setItem('healthConnectSetupDismissed', 'true');
      if (onSkipHealthConnect) {
        onSkipHealthConnect();
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="tactical-card border-accent/30"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-accent/20">
            <Activity className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-1">
              Install Health Connect
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              For better step accuracy, install Health Connect to sync with Google Fit, Samsung Health, and wearables.
            </p>
            <div className="flex gap-2">
              <Button
                variant="tactical"
                size="sm"
                onClick={handleInstall}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Install from Play Store
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkip}
                className="border-border/50"
              >
                <Smartphone className="h-4 w-4 mr-1" />
                Skip
              </Button>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  return null;
};