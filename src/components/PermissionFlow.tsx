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

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    console.log('[PermissionFlow] Starting permission flow...');
    
    setStep('activity');
    
    // Small delay to show activity permission screen
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const granted = await permissionManager.requestAllPermissions();
    
    if (granted) {
      console.log('[PermissionFlow] All permissions granted!');
      setStep('location');
      await new Promise(resolve => setTimeout(resolve, 800));
      setStep('complete');
      setTimeout(() => onComplete(true), 1000);
    } else {
      console.log('[PermissionFlow] Permissions denied');
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
          <h3 className="text-xl font-bold">Enable Step Tracking</h3>
          <p className="text-muted-foreground max-w-sm">
            HotStepper needs access to your physical activity to count your steps. 
            Your data stays private on your device.
          </p>
        </div>
        <Button 
          onClick={handleRequestPermissions} 
          size="lg" 
          className="w-full max-w-sm"
          disabled={isRequesting}
        >
          {isRequesting ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" />
              Requesting permissions...
            </>
          ) : (
            <>
              <Activity className="mr-2 h-5 w-5" />
              Grant Permissions
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
          <CheckCircle2 className="w-6 h-6 text-green-500" />
          <span className="text-sm text-green-500 font-medium">Step tracking enabled</span>
        </div>
        
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <MapPin className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold">Requesting Location Access...</h3>
          <p className="text-muted-foreground max-w-sm">
            Please allow location access in the system dialog
          </p>
        </div>
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6 min-h-[400px]">
      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-green-500">All Set!</h3>
        <p className="text-muted-foreground">
          Ready to track your fitness journey
        </p>
      </div>
    </div>
  );
};
