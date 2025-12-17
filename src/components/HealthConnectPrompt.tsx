import { useEffect, useRef } from 'react';
import { healthConnectService, HealthConnectStatus } from '@/services/healthConnectService';

interface HealthConnectPromptProps {
  platform: 'android' | 'ios' | 'web';
  healthConnectAvailable: HealthConnectStatus;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

export function HealthConnectPrompt({ 
  platform, 
  healthConnectAvailable,
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
  
  // No visible UI - this component only handles automatic permission request
  return null;
}

// Also export the old component for backward compatibility during transition
export const HealthConnectPromptLegacy = HealthConnectPrompt;
