import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Check, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { healthService } from '@/services/healthService';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';

interface HealthKitPermissionStepProps {
  onNext: () => void;
}

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied';

export function HealthKitPermissionStep({ onNext }: HealthKitPermissionStepProps) {
  const [permissionState, setPermissionState] = useState<PermissionState>('idle');
  const platform = Capacitor.getPlatform();

  // Auto-skip on non-iOS platforms
  useEffect(() => {
    if (platform !== 'ios') {
      console.log('[HealthKitPermissionStep] Skipping - not iOS platform');
      onNext();
    }
  }, [platform, onNext]);

  const openHealthSettings = async () => {
    try {
      await NativeSettings.openIOS({
        option: IOSSettings.App,
      });
    } catch (error) {
      console.error('[HealthKitPermissionStep] Error opening settings:', error);
    }
  };

  const handleContinue = async () => {
    setPermissionState('requesting');

    try {
      // First ensure the health service is available
      const isAvailable = await healthService.checkAvailability();
      if (!isAvailable) {
        console.log('[HealthKitPermissionStep] HealthKit not available');
        setPermissionState('denied');
        return;
      }

      // Request permission
      const granted = await healthService.requestPermission();
      
      if (granted) {
        console.log('[HealthKitPermissionStep] Permission granted');
        setPermissionState('granted');
        // Auto-advance after showing success briefly
        setTimeout(() => onNext(), 800);
      } else {
        console.log('[HealthKitPermissionStep] Permission denied');
        setPermissionState('denied');
      }
    } catch (error) {
      console.error('[HealthKitPermissionStep] Error requesting permission:', error);
      setPermissionState('denied');
    }
  };

  // Don't render on non-iOS platforms (component will auto-skip)
  if (platform !== 'ios') {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background p-6 pt-12">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
        className="flex justify-center mb-8"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center shadow-lg">
          <Heart className="w-12 h-12 text-white" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold text-center mb-3"
      >
        Connect Apple Health
      </motion.h1>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground text-center mb-8"
      >
        Sync your step data with Apple Health to capture steps taken while the app is in the background.
      </motion.p>

      {/* Benefits List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card rounded-xl p-5 mb-6 border border-border"
      >
        <h3 className="font-semibold mb-4 text-foreground">Why connect Apple Health?</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">
              Sync background steps automatically when you return to the app
            </span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">
              Access your historical step data for accurate tracking
            </span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">
              Combine steps from all your devices and apps
            </span>
          </li>
        </ul>
      </motion.div>

      {/* Privacy Note */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-muted/50 rounded-lg p-4 mb-8"
      >
        <p className="text-xs text-muted-foreground text-center">
          🔒 We only <strong>read</strong> your step, distance, and calorie data. We never write to or modify your Apple Health data.
        </p>
      </motion.div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Error State */}
      {permissionState === 'denied' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4"
        >
          <div className="flex items-start gap-3">
            <X className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-foreground font-medium">Permission not granted</p>
              <p className="text-xs text-muted-foreground mt-1">
                You can enable Apple Health access later in Settings → Health → Data Access.
              </p>
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto mt-2 text-primary"
                onClick={openHealthSettings}
              >
                Open Settings <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-3"
      >
        {permissionState === 'granted' ? (
          <Button
            className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
            disabled
          >
            <Check className="w-5 h-5 mr-2" />
            Connected to Apple Health
          </Button>
        ) : (
          <Button
            className="w-full h-14 text-lg"
            onClick={handleContinue}
            disabled={permissionState === 'requesting'}
          >
            {permissionState === 'requesting' ? (
              'Requesting Access...'
            ) : permissionState === 'denied' ? (
              'Try Again'
            ) : (
              'Connect Apple Health'
            )}
          </Button>
        )}

        {permissionState !== 'granted' && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={onNext}
            disabled={permissionState === 'requesting'}
          >
            {permissionState === 'denied' ? 'Continue without Apple Health' : 'Skip for now'}
          </Button>
        )}
      </motion.div>
    </div>
  );
}
