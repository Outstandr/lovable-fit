import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pushNotificationService } from '@/services/pushNotificationService';
import { Capacitor } from '@capacitor/core';

interface NotificationStepProps {
  onNext: () => void;
}

export function NotificationStep({ onNext }: NotificationStepProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleContinue = async () => {
    setIsRequesting(true);
    
    try {
      if (Capacitor.isNativePlatform() && pushNotificationService.isSupported()) {
        await pushNotificationService.requestPermission();
        await pushNotificationService.initialize();
      }
    } catch (error) {
      console.log('[Onboarding] Notification permission error:', error);
    }
    
    setIsRequesting(false);
    onNext();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress indicator */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-border" />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">Step 4 of 5</p>
      </div>

      {/* Main content - scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="flex flex-col items-center">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-24 h-24 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center mb-6"
          >
            <motion.div
              animate={{ 
                rotate: [0, -10, 10, -10, 10, 0],
              }}
              transition={{ 
                duration: 0.5,
                delay: 0.5,
                repeat: Infinity,
                repeatDelay: 2
              }}
            >
              <Bell className="w-12 h-12 text-accent" />
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-foreground text-center mb-3"
          >
            Stay Motivated
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground text-center text-sm mb-2 max-w-xs"
          >
            Get gentle reminders to hit your daily goals
          </motion.p>

          {/* Stats callout */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-6 px-4 py-2 rounded-full bg-accent/10 border border-accent/30"
          >
            <span className="text-sm font-medium text-accent">
              89% higher goal achievement
            </span>
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full max-w-sm space-y-3"
          >
            {[
              { time: '6:00 AM', label: 'Morning motivation' },
              { time: '12:00 PM', label: 'Midday check-in' },
              { time: '8:00 PM', label: 'Evening reminder' },
            ].map((item, index) => (
              <motion.div
                key={item.time}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/50"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{item.time.split(' ')[0]}</span>
                </div>
                <span className="text-sm text-foreground">{item.label}</span>
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
              Enabling...
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
