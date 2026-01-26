import { useState } from 'react';
import { MapPin, Navigation, Route, Gauge, Check, AlertTriangle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { motion } from 'framer-motion';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';

interface LocationPermissionStepProps {
  onNext: () => void;
}

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'location_off';

export const LocationPermissionStep = ({ onNext }: LocationPermissionStepProps) => {
  const [permissionState, setPermissionState] = useState<PermissionState>('idle');

  const openSettings = async () => {
    try {
      if (Capacitor.getPlatform() === 'android') {
        await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
      } else if (Capacitor.getPlatform() === 'ios') {
        await NativeSettings.openIOS({ option: IOSSettings.App });
      }
    } catch (error) {
      console.log('[Onboarding] Error opening settings:', error);
    }
  };

  const openLocationSettings = async () => {
    try {
      if (Capacitor.getPlatform() === 'android') {
        await NativeSettings.openAndroid({ option: AndroidSettings.Location });
      } else if (Capacitor.getPlatform() === 'ios') {
        await NativeSettings.openIOS({ option: IOSSettings.LocationServices });
      }
    } catch (error) {
      console.log('[Onboarding] Error opening location settings:', error);
    }
  };

  const handleContinue = async () => {
    setPermissionState('requesting');

    try {
      if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Geolocation')) {
        // First check if permission is already granted
        const currentStatus = await Geolocation.checkPermissions();
        console.log('[Onboarding] Current location permission status:', currentStatus);

        if (currentStatus.location === 'granted' || currentStatus.coarseLocation === 'granted') {
          console.log('[Onboarding] Location permission already granted');
          
          // Test if location services are actually working
          try {
            await Geolocation.getCurrentPosition({ timeout: 5000 });
            setPermissionState('granted');
            setTimeout(() => onNext(), 1000);
            return;
          } catch (gpsError: any) {
            // Permission granted but GPS failed - likely location services off
            console.log('[Onboarding] GPS test failed:', gpsError);
            if (gpsError?.message?.includes('disabled') || gpsError?.code === 2) {
              setPermissionState('location_off');
              return;
            }
            // Other GPS error but permission is granted, proceed anyway
            setPermissionState('granted');
            setTimeout(() => onNext(), 1000);
            return;
          }
        }

        // Request permission - this triggers the native system dialog
        console.log('[Onboarding] Requesting location permission...');
        const result = await Geolocation.requestPermissions({ permissions: ['location'] });
        console.log('[Onboarding] Location permission result:', result);
        
        // Re-check permissions after request (some devices update state only after returning)
        const postRequestStatus = await Geolocation.checkPermissions();
        console.log('[Onboarding] Post-request status:', postRequestStatus);

        if (postRequestStatus.location === 'granted' || postRequestStatus.coarseLocation === 'granted') {
          // Permission granted! Test if location services work
          try {
            await Geolocation.getCurrentPosition({ timeout: 5000 });
            setPermissionState('granted');
            setTimeout(() => onNext(), 1000);
          } catch (gpsError: any) {
            console.log('[Onboarding] GPS test after grant failed:', gpsError);
            if (gpsError?.message?.includes('disabled') || gpsError?.code === 2) {
              setPermissionState('location_off');
            } else {
              // GPS timeout but permission granted - proceed
              setPermissionState('granted');
              setTimeout(() => onNext(), 1000);
            }
          }
        } else {
          // Permission denied
          console.log('[Onboarding] Location permission denied');
          setPermissionState('denied');
        }
      } else {
        console.log('[Onboarding] Geolocation plugin not available on this platform');
        setPermissionState('granted');
        setTimeout(() => onNext(), 500);
      }
    } catch (error: any) {
      console.log('[Onboarding] Location permission error:', error);
      // Check if it's a location services off error
      if (error?.message?.includes('disabled') || error?.code === 2) {
        setPermissionState('location_off');
      } else {
        setPermissionState('denied');
      }
    }
  };

  const benefits = [
    { icon: Navigation, text: 'Track walking routes' },
    { icon: Route, text: 'Record session history' },
    { icon: Gauge, text: 'Accurate distance & speed' },
  ];

  const isRequesting = permissionState === 'requesting';
  const isGranted = permissionState === 'granted';
  const isDenied = permissionState === 'denied';
  const isLocationOff = permissionState === 'location_off';
  const hasError = isDenied || isLocationOff;

  return (
    <div className="absolute inset-0 flex flex-col bg-background safe-area-y">
      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
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
          Lionel X uses your location only during active workout sessions to track your walking route on the map and calculate distance. Location tracking stops automatically when you end the workout.
        </motion.p>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-sm space-y-3 mb-6"
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

        {/* Error States */}
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm mb-4"
          >
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  {isLocationOff ? (
                    <>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Location Services Off
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Turn on Location/GPS in your device settings to enable route tracking.
                      </p>
                      <Button
                        onClick={openLocationSettings}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Open Location Settings
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Permission Denied
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Enable location access in app settings to track your walking routes.
                      </p>
                      <Button
                        onClick={openSettings}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Open App Settings
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Privacy note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-[10px] text-muted-foreground text-center"
        >
          Location is only used during active sessions and is never shared with third parties.
        </motion.p>
      </div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="px-6 pb-6 safe-area-pb space-y-3"
      >
        <Button
          onClick={handleContinue}
          disabled={isRequesting || isGranted}
          className="w-full h-12 text-base font-semibold"
        >
          {isGranted ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Permission Granted
            </>
          ) : isRequesting ? (
            'Requesting...'
          ) : hasError ? (
            'Try Again'
          ) : (
            'Enable Location Access'
          )}
        </Button>
        {/* Apple Guideline 5.1.1: Only show "Continue Anyway" AFTER user denies permission */}
        {hasError && (
          <Button
            onClick={onNext}
            variant="ghost"
            className="w-full h-10 text-sm text-muted-foreground hover:text-foreground"
          >
            Continue Anyway
          </Button>
        )}
      </motion.div>
    </div>
  );
};
