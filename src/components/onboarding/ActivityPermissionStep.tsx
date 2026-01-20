import { useState } from 'react';
import { motion } from 'framer-motion';
import { Footprints } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { pedometerService } from '@/services/pedometerService';

interface ActivityPermissionStepProps {
  onNext: () => void;
}

export function ActivityPermissionStep({ onNext }: ActivityPermissionStepProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleContinue = async () => {
    setIsRequesting(true);
    
    if (Capacitor.isNativePlatform()) {
      try {
        console.log('[Onboarding] Requesting activity recognition permission...');
        
        // Wrap permission request in a timeout to prevent hanging
        const permissionPromise = pedometerService.requestPermission();
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => {
            console.log('[Onboarding] Permission request timed out after 5s');
            resolve(false);
          }, 5000);
        });
        
        // Race between permission result and timeout
        const granted = await Promise.race([permissionPromise, timeoutPromise]);
        console.log('[Onboarding] Permission result:', granted);
        
        // If permission granted, start tracking immediately to avoid sync issues
        if (granted) {
          console.log('[Onboarding] Starting pedometer tracking immediately...');
          
          const startPromise = pedometerService.start((data) => {
            console.log('[Onboarding] Pedometer data received:', data);
          });
          
          const startTimeout = new Promise<boolean>((resolve) => {
            setTimeout(() => {
              console.log('[Onboarding] Pedometer start timed out after 5s');
              resolve(false);
            }, 5000);
          });
          
          const started = await Promise.race([startPromise, startTimeout]);
          console.log('[Onboarding] Pedometer tracking started:', started);
        }
        
      } catch (error) {
        console.log('[Onboarding] Permission/start error:', error);
      }
    }
    
    // Always proceed to next step
    setIsRequesting(false);
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

        {/* Description - Apple Guideline 5.1.1 Compliant */}
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
      </div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="px-6 pb-6 safe-area-pb"
      >
        <Button
          onClick={handleContinue}
          disabled={isRequesting}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold text-base"
        >
          {isRequesting ? 'Requesting...' : 'Enable Step Tracking'}
        </Button>
      </motion.div>
    </div>
  );
}
