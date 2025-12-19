import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { pushNotificationService } from '@/services/pushNotificationService';
import { healthService } from '@/services/healthService';

interface PushNotificationInitializerProps {
  children: React.ReactNode;
}

// Wait for health permission flow to complete before requesting push permissions
const waitForHealthInit = async (maxWaitMs: number = 8000): Promise<void> => {
  const startTime = Date.now();
  
  // Minimum 2s wait to let permission dialog appear
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Poll every 500ms to check if health service has resolved permission
  while (Date.now() - startTime < maxWaitMs) {
    // If health has permission, permission flow is complete
    const state = healthService.getState();
    if (state.hasPermission) {
      console.log('[PushNotifications] Health init complete, proceeding...');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('[PushNotifications] Health init timeout, proceeding anyway...');
};

export function PushNotificationInitializer({ children }: PushNotificationInitializerProps) {
  const { user } = useAuth();
  const hasInitialized = useRef(false);
  const hasShownToast = useRef(false);

  // Initialize push notifications after user login AND health init
  useEffect(() => {
    const initializePushNotifications = async () => {
      // Prevent multiple initializations
      if (hasInitialized.current) {
        console.log('[PushNotifications] Already initialized, skipping');
        return;
      }

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
        hasInitialized.current = true;
        
        // Wait for health permission flow to complete first
        await waitForHealthInit();
        
        console.log('[PushNotifications] Initializing for user:', user.id);
        
        // Initialize with timeout protection to prevent hanging
        const timeoutPromise = new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('Push notification init timeout')), 15000)
        );
        
        await Promise.race([
          pushNotificationService.initialize(),
          timeoutPromise
        ]);
        
        // Check if permission was granted
        const hasPermission = await pushNotificationService.checkPermission();
        
        if (hasPermission && !hasShownToast.current) {
          const token = pushNotificationService.getToken();
          console.log('[PushNotifications] Enabled, token:', token ? 'received' : 'pending');
          hasShownToast.current = true;
        } else {
          console.log('[PushNotifications] Permission denied by user');
        }
      } catch (error) {
        console.error('[PushNotifications] Error initializing (safe catch):', error);
        // Don't rethrow - just log and continue to prevent app crash
      }
    };

    if (user && !hasInitialized.current) {
      initializePushNotifications();
    }
  }, [user]);

  // Clean up push token on logout
  useEffect(() => {
    if (!user && hasInitialized.current) {
      hasInitialized.current = false;
      hasShownToast.current = false;
      pushNotificationService.removeToken().catch(err => {
        console.error('[PushNotifications] Error removing token:', err);
      });
    }
  }, [user]);

  return <>{children}</>;
}
