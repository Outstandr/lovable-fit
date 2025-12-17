import { useState, useEffect } from 'react';
import { pushNotificationService, PushNotificationState } from '@/services/pushNotificationService';
import { useAuth } from '@/hooks/useAuth';

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    hasPermission: false,
    token: null,
  });
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = pushNotificationService.isSupported();
      const hasPermission = await pushNotificationService.checkPermission();
      
      setState(prev => ({
        ...prev,
        isSupported,
        hasPermission,
        token: pushNotificationService.getToken(),
      }));
    };

    checkSupport();
  }, []);

  useEffect(() => {
    // Initialize push notifications when user logs in
    if (user && state.isSupported && !isInitializing) {
      const initPush = async () => {
        setIsInitializing(true);
        try {
          await pushNotificationService.initialize();
          const hasPermission = await pushNotificationService.checkPermission();
          setState(prev => ({
            ...prev,
            hasPermission,
            token: pushNotificationService.getToken(),
          }));
        } catch (error) {
          console.error('[usePushNotifications] Init error:', error);
        } finally {
          setIsInitializing(false);
        }
      };

      // Delay initialization slightly to not block main thread
      const timer = setTimeout(initPush, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, state.isSupported]);

  const requestPermission = async (): Promise<boolean> => {
    const granted = await pushNotificationService.requestPermission();
    setState(prev => ({ ...prev, hasPermission: granted }));
    
    if (granted) {
      await pushNotificationService.initialize();
      setState(prev => ({ ...prev, token: pushNotificationService.getToken() }));
    }
    
    return granted;
  };

  return {
    ...state,
    isInitializing,
    requestPermission,
  };
}
