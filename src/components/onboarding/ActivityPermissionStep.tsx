import { useState } from 'react';
import { motion } from 'framer-motion';
import { Footprints } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { stepTrackingService } from '@/services/stepTrackingService';

interface ActivityPermissionStepProps {
  onNext: () => void;
}

export function ActivityPermissionStep({ onNext }: ActivityPermissionStepProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const platform = Capacitor.getPlatform();

  const handleContinue = async () => {
    setIsRequesting(true);

    if (Capacitor.isNativePlatform()) {
      console.log('[Onboarding] Starting step tracking...');
      
      // Use platform-aware step tracking service
      const result = await stepTrackingService.requestPermissionAndStart((data) => {
        console.log('[Onboarding] Step update:', data.steps, 'steps');
      });
      
      if (result.success) {
        console.log('[Onboarding] ✅ Step tracking started!');
      } else {
        console.log('[Onboarding] ⚠️ Tracking failed:', result.error);
        // User can still continue - they can grant permission later in settings
      }
    }

    setIsRequesting(false);
    onNext();
  };

  // Platform-specific messaging
  const permissionName = platform === 'ios' ? 'Motion & Fitness' : 'Physical Activity';

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

        {/* Info notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 rounded-xl bg-muted/50 border border-border w-full max-w-xs"
        >
          <p className="text-xs text-muted-foreground leading-relaxed text-center">
            When prompted, please <span className="font-medium text-foreground">Allow</span> access to {permissionName} to enable step tracking.
          </p>
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
          {isRequesting ? 'Starting...' : 'Enable Step Tracking'}
        </Button>
      </motion.div>
    </div>
  );
}
