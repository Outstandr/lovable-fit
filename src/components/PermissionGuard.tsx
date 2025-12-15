import { useEffect, useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { MapPin, AlertCircle } from 'lucide-react';

export const PermissionGuard = ({ children }: { children: React.ReactNode }) => {
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied' | 'prompt'>('checking');

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    if (!Capacitor.isNativePlatform()) {
      setPermissionStatus('granted');
      return;
    }

    try {
      const status = await Geolocation.checkPermissions();
      console.log('[PermissionGuard] Permission status:', status);

      if (status.location === 'granted') {
        setPermissionStatus('granted');
      } else if (status.location === 'denied') {
        setPermissionStatus('denied');
      } else {
        setPermissionStatus('prompt');
      }
    } catch (error) {
      console.error('[PermissionGuard] Error checking permissions:', error);
      setPermissionStatus('prompt');
    }
  };

  const requestPermission = async () => {
    try {
      console.log('[PermissionGuard] Requesting permissions...');
      const result = await Geolocation.requestPermissions();
      console.log('[PermissionGuard] Permission result:', result);

      if (result.location === 'granted' || result.coarseLocation === 'granted') {
        setPermissionStatus('granted');
      } else {
        setPermissionStatus('denied');
      }
    } catch (error) {
      console.error('[PermissionGuard] Error requesting permissions:', error);
      setPermissionStatus('denied');
    }
  };

  if (permissionStatus === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (permissionStatus === 'prompt') {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Location Access Required</h2>
            <p className="text-muted-foreground">
              HotStepper needs your location to track your walks and runs. 
              Your location is only used while the app is active and is never shared.
            </p>
          </div>
          <Button onClick={requestPermission} size="lg" className="w-full">
            <MapPin className="mr-2 h-5 w-5" />
            Grant Location Access
          </Button>
        </div>
      </div>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Location Permission Denied</h2>
            <p className="text-muted-foreground">
              HotStepper needs location access to track your activities. 
              Please enable location permissions in your device settings.
            </p>
          </div>
          <Button onClick={checkPermissions} variant="outline" size="lg" className="w-full">
            Check Again
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
