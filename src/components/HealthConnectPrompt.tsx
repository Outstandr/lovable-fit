import { useEffect, useRef } from 'react';
import { healthConnectService, HealthConnectStatus, DataSource } from '@/services/healthConnectService';
import { AlertCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface HealthConnectPromptProps {
  platform: 'android' | 'ios' | 'web';
  healthConnectAvailable: HealthConnectStatus;
  dataSource?: DataSource;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

export function HealthConnectPrompt({ 
  platform, 
  healthConnectAvailable,
  dataSource,
  onPermissionGranted,
  onPermissionDenied,
}: HealthConnectPromptProps) {
  const permissionRequested = useRef(false);

  useEffect(() => {
    const autoRequestPermission = async () => {
      // Only for Android with Health Connect available
      if (platform !== 'android' || healthConnectAvailable !== 'Available') {
        return;
      }
      
      // Prevent multiple requests
      if (permissionRequested.current) {
        return;
      }
      
      // Check if we already requested (stored in localStorage)
      const alreadyRequested = localStorage.getItem('healthConnectPermissionRequested');
      if (alreadyRequested === 'true') {
        return;
      }
      
      console.log('[HealthConnectPrompt] Auto-requesting permission on first launch...');
      permissionRequested.current = true;
      
      // Check current permission status
      const hasPermission = await healthConnectService.checkPermission();
      
      if (hasPermission) {
        console.log('[HealthConnectPrompt] Permission already granted');
        onPermissionGranted?.();
        return;
      }
      
      // Request permission automatically
      const granted = await healthConnectService.requestPermission();
      
      // Mark as requested so we don't ask again
      localStorage.setItem('healthConnectPermissionRequested', 'true');
      
      if (granted) {
        console.log('[HealthConnectPrompt] Permission granted!');
        onPermissionGranted?.();
      } else {
        console.log('[HealthConnectPrompt] Permission denied - will use phone sensor');
        onPermissionDenied?.();
      }
    };
    
    // Delay request by 2 seconds to let dashboard load first
    const timer = setTimeout(autoRequestPermission, 2000);
    
    return () => clearTimeout(timer);
  }, [platform, healthConnectAvailable, onPermissionGranted, onPermissionDenied]);
  
  // Show manual permission prompt if tracking is unavailable
  if (dataSource === 'unavailable' && platform === 'android') {
    return (
      <motion.div 
        className="px-4 py-3 mx-4 mt-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-destructive mb-1">
            Permission Required
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Step tracking requires "Physical Activity" permission. Please grant this permission in your phone's Settings → Apps → HotStepper → Permissions.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              toast.info('Opening Settings...', { description: 'Navigate to Apps → HotStepper → Permissions → Physical Activity' });
              // Try to open app settings if available
              healthConnectService.openSettings?.();
            }}
            className="text-xs gap-2"
          >
            <Settings className="h-3 w-3" />
            Open Settings
          </Button>
        </div>
      </motion.div>
    );
  }
  
  // No visible UI when tracking is working
  return null;
}

// Also export the old component for backward compatibility during transition
export const HealthConnectPromptLegacy = HealthConnectPrompt;
