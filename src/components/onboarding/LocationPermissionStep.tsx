import { useState } from 'react';
import { MapPin, Navigation, Route, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { motion } from 'framer-motion';

interface LocationPermissionStepProps {
  onNext: () => void;
}

export const LocationPermissionStep = ({ onNext }: LocationPermissionStepProps) => {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleContinue = async () => {
    setIsRequesting(true);
    
    try {
      if (Capacitor.isNativePlatform()) {
        // Request location permission with timeout
        const permissionPromise = Geolocation.requestPermissions();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Permission timeout')), 10000)
        );
        
        await Promise.race([permissionPromise, timeoutPromise]);
      }
    } catch (error) {
      console.log('Location permission request completed or timed out:', error);
    }
    
    // Short delay for better UX
    setTimeout(() => {
      setIsRequesting(false);
      onNext();
    }, 500);
  };

  const benefits = [
    { icon: Navigation, text: 'Track your walking routes in real-time' },
    { icon: Route, text: 'Record your path for session history' },
    { icon: Gauge, text: 'Calculate accurate distance & speed' },
  ];

  return (
    <div className="flex flex-col min-h-screen-safe p-6 safe-area-x">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
          className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8"
        >
          <MapPin className="w-12 h-12 text-primary" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-foreground text-center mb-3"
        >
          Enable Location Access
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-center mb-8"
        >
          Allow Hotstepper to access your location for GPS tracking during active sessions
        </motion.p>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full space-y-4 mb-8"
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <benefit.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-foreground">{benefit.text}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Privacy note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs text-muted-foreground text-center mb-6"
        >
          Location is only used during active sessions and is never shared with third parties
        </motion.p>
      </div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="safe-area-bottom"
      >
        <Button
          onClick={handleContinue}
          disabled={isRequesting}
          className="w-full h-14 text-lg font-semibold"
          size="lg"
        >
          {isRequesting ? 'Requesting...' : 'Continue'}
        </Button>
      </motion.div>
    </div>
  );
};
