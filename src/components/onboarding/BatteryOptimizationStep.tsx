import { useState } from 'react';
import { motion } from 'framer-motion';
import { BatteryCharging, ChevronRight, Zap } from 'lucide-react';
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
        console.log('[Onboarding] Battery optimization request - would open settings on native');
      }
    } catch (error) {
      console.log('[Onboarding] Battery optimization error:', error);
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
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-border" />
          <div className="h-1 flex-1 rounded-full bg-border" />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">Step 3 of 5</p>
      </div>

      {/* Main content - scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="flex flex-col items-center">
          {/* Battery icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative mb-6"
          >
            <div className="w-20 h-32 rounded-2xl border-4 border-primary/50 relative overflow-hidden bg-secondary/30">
              {/* Battery cap */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-primary/50 rounded-t-lg" />
              {/* Battery fill */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: '70%' }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-primary/70 rounded-b-lg"
              />
              {/* Lightning bolt */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Zap className="w-8 h-8 text-primary-foreground" fill="currentColor" />
              </motion.div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-foreground text-center mb-3"
          >
            Battery Optimization
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground text-center text-sm mb-6 max-w-xs"
          >
            Allow Hotstepper to run in the background for continuous step tracking.
          </motion.p>

          {/* Info box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full max-w-sm p-4 rounded-xl bg-primary/10 border border-primary/30"
          >
            <div className="flex items-start gap-3">
              <BatteryCharging className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-foreground font-medium mb-1">
                  When prompted, select "Allow"
                </p>
                <p className="text-xs text-muted-foreground">
                  This lets Hotstepper track steps even when the app is closed.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Reassurance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span>Minimal battery impact</span>
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
