import { useState } from 'react';
import { motion } from 'framer-motion';
import { Battery } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';

interface BatteryOptimizationStepProps {
  onNext: () => void;
}

export function BatteryOptimizationStep({ onNext }: BatteryOptimizationStepProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleContinue = async () => {
    setIsRequesting(true);
    
    try {
      if (Capacitor.isNativePlatform()) {
        // On Android, we would typically open battery optimization settings
        // This is a platform-specific API that requires a native plugin
        // For now, we'll just inform the user and continue
        console.log('[Onboarding] Battery optimization request - would open settings on native');
      }
    } catch (error) {
      console.log('[Onboarding] Battery optimization error:', error);
    }
    
    setIsRequesting(false);
    onNext();
  };

  return (
    <div className="min-h-screen-safe flex flex-col px-6 py-8">
      {/* Icon */}
      <div className="flex-1 flex flex-col items-center justify-center">
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

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="safe-area-pb"
      >
        <Button
          onClick={handleContinue}
          disabled={isRequesting}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold text-base"
        >
          {isRequesting ? 'Requesting...' : 'Continue'}
        </Button>
      </motion.div>
    </div>
  );
}
