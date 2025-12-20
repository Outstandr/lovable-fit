import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { pushNotificationService } from '@/services/pushNotificationService';

interface PushNotificationInitializerProps {
  children: React.ReactNode;
}

const ONBOARDING_KEY = 'device_onboarding_completed';

export function PushNotificationInitializer({ children }: PushNotificationInitializerProps) {
  const { user } = useAuth();
  const location = useLocation();
  const hasInitialized = useRef(false);
  const hasShownToast = useRef(false);

  // Initialize push notifications after user login - but NOT during onboarding
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

      // CRITICAL: Skip if currently on onboarding page
      if (location.pathname === '/onboarding') {
        console.log('[PushNotifications] On onboarding page, skipping auto-init');
        return;
      }

      // CRITICAL: Skip if onboarding hasn't been completed yet
      const onboardingCompleted = localStorage.getItem(ONBOARDING_KEY) === 'true';
      if (!onboardingCompleted) {
        console.log('[PushNotifications] Onboarding not completed, skipping auto-init');
        return;
      }

      try {
        hasInitialized.current = true;
        
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
  }, [user, location.pathname]);

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
