import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { pushNotificationService } from '@/services/pushNotificationService';
import { toast } from 'sonner';

interface PushNotificationInitializerProps {
  children: React.ReactNode;
}

export function PushNotificationInitializer({ children }: PushNotificationInitializerProps) {
  const { user } = useAuth();

  // Initialize push notifications after user login
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

    // Delay initialization to let auth complete and UI load
    if (user) {
      const timer = setTimeout(() => {
        initializePushNotifications();
      }, 2000);

      return () => clearTimeout(timer);
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
