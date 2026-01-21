import { useState } from 'react';
import { motion } from 'framer-motion';
import { Footprints, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { pedometerService } from '@/services/pedometerService';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';

interface ActivityPermissionStepProps {
  onNext: () => void;
}

export function ActivityPermissionStep({ onNext }: ActivityPermissionStepProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [step, setStep] = useState<'idle' | 'notifications' | 'activity' | 'starting'>('idle');

  const handleContinue = async () => {
    setIsRequesting(true);

    if (Capacitor.isNativePlatform()) {
      try {
        // Step 1: Request POST_NOTIFICATIONS first (Android 13+ requirement for foreground service)
        // This must be done BEFORE activity recognition on Android 14+
        console.log('[Onboarding] Step 1: Requesting notification permission (Android 13+)...');
        setStep('notifications');
        try {
          const notifResult = await PushNotifications.requestPermissions();
          console.log('[Onboarding] Notification permission result:', notifResult.receive);
        } catch (notifError) {
          console.log('[Onboarding] Notification permission error (non-critical):', notifError);
        }

        // Small delay to let Android process the permission
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Step 2: Request activity recognition permission
        console.log('[Onboarding] Step 2: Requesting activity recognition permission...');
        setStep('activity');
        
        // Request permission directly - this triggers the system dialog
        const permResult = await CapacitorPedometer.requestPermissions();
        console.log('[Onboarding] Activity recognition result:', permResult.activityRecognition);
        
        // Step 3: IMMEDIATELY start tracking while both keys are fresh!
        // Key 1 (User Consent) = just granted via dialog
        // Key 2 (OS Declaration) = manifest permissions are active
        if (permResult.activityRecognition === 'granted') {
          console.log('[Onboarding] ✅ Permission granted - starting tracker NOW!');
          setStep('starting');
          
          // Start the sensor immediately - this is the critical moment
          const startResult = await pedometerService.start((data) => {
            console.log('[Onboarding] First sensor data:', data.steps, 'steps');
          });
          
          if (startResult.success) {
            console.log('[Onboarding] ✅ Step tracker started successfully during onboarding!');
            pedometerService.setStartedDuringOnboarding(true);
          } else {
            console.log('[Onboarding] ⚠️ Tracker start failed:', startResult.error, startResult.guidance);
            // Still continue - user can retry from debug page
          }
        } else {
          console.log('[Onboarding] ⚠️ Permission not granted:', permResult.activityRecognition);
        }
        
      } catch (error) {
        console.log('[Onboarding] Permission/start error (proceeding):', error);
      }
    }

    setIsRequesting(false);
    setStep('idle');
    onNext();
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-background safe-area-y">
      {/* Icon */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-32 h-32 rounded-3xl bg-accent/20 flex items-center justify-center mb-8"
        >
          <Footprints className="w-16 h-16 text-accent" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-foreground text-center mb-4"
        >
          Step Tracking
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-center max-w-xs leading-relaxed"
        >
          We need access to your device's physical activity sensor so that you can see your step count and activity progress in real-time.
        </motion.p>

        {/* Benefits list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 space-y-3 w-full max-w-xs"
        >
          {[
            'Automatic step counting',
            'Real-time progress updates',
            'Background step tracking',
            'Calorie estimation',
          ].map((benefit) => (
            <div
              key={benefit}
              className="flex items-center gap-3 text-sm text-foreground/80"
            >
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>{benefit}</span>
            </div>
          ))}
        </motion.div>

        {/* Android 13+ notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 rounded-xl bg-muted/50 border border-border w-full max-w-xs"
        >
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Why notifications?</span> Android requires notification permission to track steps in the background. We'll only use it for step tracking, not marketing.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="px-6 pb-6 safe-area-pb"
      >
        <Button
          onClick={handleContinue}
          disabled={isRequesting}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold text-base"
        >
          {isRequesting 
            ? step === 'notifications' 
              ? 'Requesting Notifications...' 
              : step === 'activity'
                ? 'Requesting Activity...'
                : 'Starting Step Tracker...'
            : 'Enable Step Tracking'}
        </Button>
      </motion.div>
    </div>
  );
}
