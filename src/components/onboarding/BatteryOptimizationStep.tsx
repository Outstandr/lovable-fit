import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { BatteryOptimization } from '@capawesome-team/capacitor-android-battery-optimization';
import { NativeSettings, AndroidSettings } from 'capacitor-native-settings';

interface BatteryOptimizationStepProps {
  onNext: () => void;
}

export function BatteryOptimizationStep({ onNext }: BatteryOptimizationStepProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  // Auto-skip on non-Android platforms
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') {
      console.log('[Onboarding] Skipping battery step - not Android');
      onNext();
    }
  }, [onNext]);

  const handleContinue = async () => {
    setIsRequesting(true);

    try {
      if (Capacitor.getPlatform() === 'android') {
        try {
          // Always try to show the battery optimization dialog
          await BatteryOptimization.requestIgnoreBatteryOptimization();
          console.log('[Onboarding] Battery optimization request completed');
        } catch (pluginError) {
          // Fallback: Open battery settings if the plugin fails
          console.log('[Onboarding] Battery plugin failed, opening settings:', pluginError);
          try {
            await NativeSettings.openAndroid({
              option: AndroidSettings.ApplicationDetails,
            });
          } catch (settingsError) {
            console.log('[Onboarding] Failed to open settings:', settingsError);
          }
        }
      }
    } catch (error) {
      console.log('[Onboarding] Battery optimization error:', error);
    }

    setIsRequesting(false);
    onNext();
  };

  const handleSkip = () => {
    console.log('[Onboarding] Battery optimization skipped');
    onNext();
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col items-center justify-center px-6 py-8 min-h-full">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative mb-8"
          >
            {/* Battery icon with fill */}
            <div className="w-24 h-40 rounded-2xl border-4 border-muted-foreground/50 relative overflow-hidden">
              {/* Battery cap */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-3 bg-muted-foreground/50 rounded-t-lg" />
              {/* Battery fill */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: '70%' }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="absolute bottom-0 left-0 right-0 bg-accent rounded-b-lg"
              />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-foreground text-center mb-4"
          >
            Battery Optimization
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground text-center max-w-xs leading-relaxed"
          >
            Allow Hotstepper to run in the background to count your steps when you don't have the app open.
          </motion.p>

          {/* Info box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 p-4 rounded-xl bg-secondary/50 max-w-xs"
          >
            <p className="text-sm text-foreground/80 text-center">
              When prompted, select <span className="font-semibold text-primary">"Allow"</span> to let Hotstepper run in the background without battery restrictions.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Fixed Continue Button - Always Visible */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex-shrink-0 px-6 pt-4 safe-area-pb-cta"
      >
        <Button
          onClick={handleContinue}
          disabled={isRequesting}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold text-base"
        >
          {isRequesting ? 'Requesting...' : 'Enable Background Activity'}
        </Button>
        <Button
          variant="ghost"
          onClick={handleSkip}
          disabled={isRequesting}
          className="w-full h-12 text-muted-foreground mt-2"
        >
          Skip for now
        </Button>
      </motion.div>
    </div>
  );
}
