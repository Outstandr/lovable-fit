import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
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
        // Only request OS permission during onboarding - don't trigger Firebase/FCM registration
        // Firebase registration will happen later after onboarding is complete
        await Promise.race([
          pushNotificationService.requestPermission(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]);
        console.log('[NotificationStep] Permission request completed (no FCM registration during onboarding)');
      }
    } catch (error) {
      // Gracefully handle any errors including Firebase not configured - don't block onboarding
      console.warn('[NotificationStep] Notification permission error (continuing anyway):', error);
    }
    
    // Delay to let native side stabilize before proceeding
    await new Promise(resolve => setTimeout(resolve, 500));
    
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
          className="w-32 h-32 rounded-3xl bg-accent flex items-center justify-center mb-8"
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
            <Bell className="w-16 h-16 text-accent-foreground" />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-foreground text-center mb-4"
        >
          Goal Reminder
        </motion.h1>

        {/* Description - Apple Guideline 5.1.1 Compliant */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-center max-w-xs leading-relaxed"
        >
          We need to send you notifications so that you can receive daily reminders and goal achievements.
        </motion.p>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 space-y-3 w-full max-w-xs"
        >
          {[
            'Morning motivation',
            'Midday progress check',
            'Evening goal reminders',
          ].map((benefit) => (
            <div
              key={benefit}
              className="flex items-center gap-3 text-sm text-foreground/80"
            >
              <div className="w-2 h-2 rounded-full bg-accent" />
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
          {isRequesting ? 'Enabling...' : 'Continue'}
        </Button>
      </motion.div>
    </div>
  );
}
