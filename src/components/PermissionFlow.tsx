import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Activity, MapPin, CheckCircle2 } from 'lucide-react';
import { permissionManager } from '@/services/permissionManager';

interface PermissionFlowProps {
  onComplete: (granted: boolean) => void;
}

export const PermissionFlow = ({ onComplete }: PermissionFlowProps) => {
  const [step, setStep] = useState<'activity' | 'location' | 'complete'>('activity');
  const [isRequesting, setIsRequesting] = useState(false);

  const handleActivityPermission = async () => {
    setIsRequesting(true);
    console.log('[PermissionFlow] Requesting activity permission...');
    
    const granted = await permissionManager.requestActivityPermission();
    
    if (granted) {
      console.log('[PermissionFlow] Activity granted, moving to location...');
      setStep('location');
    } else {
      console.log('[PermissionFlow] Activity denied, stopping flow');
      onComplete(false);
    }
    
    setIsRequesting(false);
  };

  const handleLocationPermission = async () => {
    setIsRequesting(true);
    console.log('[PermissionFlow] Requesting location permission...');
    
    const granted = await permissionManager.requestLocationPermission();
    
    if (granted) {
      console.log('[PermissionFlow] Location granted, flow complete!');
      setStep('complete');
      setTimeout(() => onComplete(true), 1000);
    } else {
      console.log('[PermissionFlow] Location denied');
      onComplete(false);
    }
    
    setIsRequesting(false);
  };

  if (step === 'activity') {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-6 min-h-[400px]">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <Activity className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold">Track Your Steps</h3>
          <p className="text-muted-foreground max-w-sm">
            HotStepper needs access to your physical activity to count your steps. 
            This data stays private on your device.
          </p>
        </div>
        <Button 
          onClick={handleActivityPermission} 
          size="lg" 
          className="w-full max-w-sm"
          disabled={isRequesting}
        >
          {isRequesting ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" />
              Requesting...
            </>
          ) : (
            <>
              <Activity className="mr-2 h-5 w-5" />
              Enable Step Tracking
            </>
          )}
        </Button>
      </div>
    );
  }

  if (step === 'location') {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-6 min-h-[400px]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
          <span className="text-sm text-green-500 font-medium">Step tracking enabled</span>
        </div>
        
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <MapPin className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold">Track Your Routes</h3>
          <p className="text-muted-foreground max-w-sm">
            Now let's enable location tracking to map your walks and runs. 
            Your location is only tracked during active sessions.
          </p>
        </div>
        <Button 
          onClick={handleLocationPermission} 
          size="lg" 
          className="w-full max-w-sm"
          disabled={isRequesting}
        >
          {isRequesting ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" />
              Requesting...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-5 w-5" />
              Enable Location Tracking
            </>
          )}
        </Button>
      </div>
    );
  }

  // Complete step
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6 min-h-[400px]">
      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-green-500">All Set!</h3>
        <p className="text-muted-foreground">
          You're ready to start tracking your fitness journey
        </p>
      </div>
    </div>
  );
};
