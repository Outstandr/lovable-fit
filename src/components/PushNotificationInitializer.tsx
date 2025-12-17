import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { pushNotificationService } from '@/services/pushNotificationService';
import { pedometerService } from '@/services/pedometerService';
import { toast } from 'sonner';

interface PushNotificationInitializerProps {
  children: React.ReactNode;
}

// Wait for pedometer permission flow to complete before requesting push permissions
const waitForPedometerInit = async (maxWaitMs: number = 8000): Promise<void> => {
  const startTime = Date.now();
  
  // Minimum 2s wait to let permission dialog appear
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Poll every 500ms to check if pedometer has resolved permission
  while (Date.now() - startTime < maxWaitMs) {
    // If pedometer has permission OR is already tracking, permission flow is complete
    if (pedometerService.getHasPermission() || pedometerService.getIsTracking()) {
      console.log('[PushNotifications] Pedometer init complete, proceeding...');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('[PushNotifications] Pedometer init timeout, proceeding anyway...');
};

export function PushNotificationInitializer({ children }: PushNotificationInitializerProps) {
  const { user } = useAuth();

  // Initialize push notifications after user login AND pedometer init
  useEffect(() => {
    const initializePushNotifications = async () => {
      // Only initialize on native platforms (Android/iOS)
      if (!pushNotificationService.isSupported()) {
        console.log('[PushNotifications] Not supported on this platform');
        return;
      }

      // Only initialize if user is logged in
      if (!user) {
        console.log('[PushNotifications] No user logged in, skipping init');
        return;
      }

      try {
        // Wait for pedometer permission flow to complete first
        await waitForPedometerInit();
        
        console.log('[PushNotifications] Initializing for user:', user.id);
        
        // Initialize push notifications (requests permission)
        await pushNotificationService.initialize();
        
        // Check if permission was granted
        const hasPermission = await pushNotificationService.checkPermission();
        
        if (hasPermission) {
          const token = pushNotificationService.getToken();
          console.log('[PushNotifications] Enabled, token:', token ? 'received' : 'pending');
          toast.success('🔔 Push notifications enabled!');
        } else {
          console.log('[PushNotifications] Permission denied by user');
        }
      } catch (error) {
        console.error('[PushNotifications] Error initializing:', error);
      }
    };

    if (user) {
      initializePushNotifications();
    }
  }, [user]);

  // Clean up push token on logout
  useEffect(() => {
    if (!user) {
      pushNotificationService.removeToken().catch(err => {
        console.error('[PushNotifications] Error removing token:', err);
      });
    }
  }, [user]);

  return <>{children}</>;
}
