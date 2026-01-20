import { useState } from 'react';
import { MapPin, Navigation, Route, Gauge, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { motion } from 'framer-motion';

interface LocationPermissionStepProps {
  onNext: () => void;
}

export const LocationPermissionStep = ({ onNext }: LocationPermissionStepProps) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [alreadyGranted, setAlreadyGranted] = useState(false);

  const handleContinue = async () => {
    setIsRequesting(true);

    try {
      if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Geolocation')) {
        // First check if permission is already granted
        const currentStatus = await Geolocation.checkPermissions();
        if (currentStatus.location === 'granted' || currentStatus.coarseLocation === 'granted') {
          console.log('[Onboarding] Location permission already granted');
          setAlreadyGranted(true);
          setTimeout(() => onNext(), 1000);
          return;
        }

        // Request permission - this triggers the native system dialog
        const result = await Geolocation.requestPermissions({ permissions: ['location'] });
        console.log('[Onboarding] Location permission result:', result);
      } else {
        console.log('[Onboarding] Geolocation plugin not available on this platform');
      }
    } catch (error) {
      console.log('[Onboarding] Location permission error:', error);
    }

    setIsRequesting(false);
    onNext();
  };

  const benefits = [
    { icon: Navigation, text: 'Track walking routes' },
    { icon: Route, text: 'Record session history' },
    { icon: Gauge, text: 'Accurate distance & speed' },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden p-6 safe-area-x">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6"
        >
          <MapPin className="w-10 h-10 text-primary" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-bold text-foreground text-center mb-2"
        >
          Enable Location Access
        </motion.h1>

        {/* Description - Apple Guideline 5.1.1 Compliant */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-center text-sm mb-6 px-4"
        >
          We need access to your location to track your walking routes with GPS accuracy during workouts.
        </motion.p>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full space-y-3 mb-6"
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <benefit.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-foreground font-medium">{benefit.text}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Privacy note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-[10px] text-muted-foreground text-center mb-4"
        >
          Location is only used during active sessions and is never shared with third parties.
        </motion.p>
      </div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="safe-area-bottom space-y-3 w-full"
      >
        <Button
          onClick={handleContinue}
          disabled={isRequesting || alreadyGranted}
          className="w-full h-12 text-base font-semibold"
        >
          {alreadyGranted ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Permission Granted
            </>
          ) : isRequesting ? (
            'Requesting...'
          ) : (
            'Enable Location'
          )}
        </Button>
        {!alreadyGranted && (
          <Button
            onClick={onNext}
            disabled={isRequesting}
            variant="ghost"
            className="w-full h-10 text-sm text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </Button>
        )}
      </motion.div>
    </div>
  );
};
