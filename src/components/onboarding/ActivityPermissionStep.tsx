import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ChevronRight } from 'lucide-react';
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
    
    try {
      if (Capacitor.isNativePlatform()) {
        await pedometerService.requestPermission();
        await pedometerService.start();
      }
    } catch (error) {
      console.log('[Onboarding] Activity permission error:', error);
    }
    
    setIsRequesting(false);
    onNext();
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Progress indicator */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-border" />
          <div className="h-1 flex-1 rounded-full bg-border" />
          <div className="h-1 flex-1 rounded-full bg-border" />
          <div className="h-1 flex-1 rounded-full bg-border" />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">Step 1 of 5</p>
      </div>

      {/* Main content - scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="flex flex-col items-center">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-24 h-24 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-6"
          >
            <Activity className="w-12 h-12 text-primary" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-foreground text-center mb-3"
          >
            Physical Activity Access
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground text-center text-sm mb-6 max-w-xs"
          >
            Hotstepper needs access to your physical activity data to accurately count your steps.
          </motion.p>

          {/* Benefits list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full max-w-sm space-y-3"
          >
            {[
              { title: 'Automatic step counting', desc: 'Track steps without opening the app' },
              { title: 'Accurate distance', desc: 'Precise measurement of your walks' },
              { title: 'Real-time updates', desc: 'See your progress instantly' },
            ].map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border/50"
              >
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-foreground">{benefit.title}</span>
                  <p className="text-xs text-muted-foreground">{benefit.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Fixed bottom button */}
      <div className="px-6 pb-6 pt-4 border-t border-border/30 bg-background">
        <Button
          onClick={handleContinue}
          disabled={isRequesting}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base"
        >
          {isRequesting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Requesting...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Continue
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
