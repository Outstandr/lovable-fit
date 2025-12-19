import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

export interface PushNotificationState {
  isSupported: boolean;
  hasPermission: boolean;
  token: string | null;
}

class PushNotificationService {
  private token: string | null = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Check if push notifications are supported on this platform
   */
  isSupported(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Check current permission status
   */
  async checkPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.log('[PushNotification] Not supported on web');
      return false;
    }

    try {
      const result = await PushNotifications.checkPermissions();
      console.log('[PushNotification] Permission status:', result.receive);
      return result.receive === 'granted';
    } catch (error) {
      console.error('[PushNotification] Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Request push notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.log('[PushNotification] Not supported on web');
      return false;
    }

    try {
      let permStatus = await PushNotifications.checkPermissions();
      console.log('[PushNotification] Current permission:', permStatus.receive);

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
        console.log('[PushNotification] After request:', permStatus.receive);
      }

      return permStatus.receive === 'granted';
    } catch (error) {
      console.error('[PushNotification] Error requesting permission:', error);
      return false;
    }
  }

  /**
   * Initialize push notifications - register listeners and get token
   * Uses mutex to prevent concurrent initialization
   */
  async initialize(): Promise<void> {
    // If already initializing, wait for that to complete
    if (this.initializationPromise) {
      console.log('[PushNotification] Already initializing, waiting...');
      return this.initializationPromise;
    }

    if (this.initialized) {
      console.log('[PushNotification] Already initialized');
      return;
    }

    if (!this.isSupported()) {
      console.log('[PushNotification] Not supported on this platform');
      return;
    }

    this.initializationPromise = this._doInitialize();
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async _doInitialize(): Promise<void> {
    try {
      // Request permission first
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('[PushNotification] Permission denied, skipping registration');
        return;
      }

      // Set up listeners before registering
      this.setupListeners();

      // Register with APNS/FCM
      await PushNotifications.register();
      console.log('[PushNotification] Registration initiated');
      
      this.initialized = true;
    } catch (error) {
      console.error('[PushNotification] Initialization error:', error);
    }
  }

  /**
   * Set up push notification event listeners
   */
  private setupListeners(): void {
    // Registration success
    PushNotifications.addListener('registration', async (token) => {
      console.log('[PushNotification] Registration success, token:', token.value);
      this.token = token.value;
      await this.saveTokenToDatabase(token.value);
    });

    // Registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[PushNotification] Registration error:', JSON.stringify(error));
    });

    // Notification received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[PushNotification] Received in foreground:', JSON.stringify(notification));
      // Could show an in-app notification here
    });

    // User tapped on notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[PushNotification] Action performed:', JSON.stringify(notification));
      this.handleNotificationTap(notification.notification.data);
    });
  }

  /**
   * Save the push token to Supabase
   */
  private async saveTokenToDatabase(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[PushNotification] No user logged in, skipping token save');
        return;
      }

      const deviceType = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
      console.log('[PushNotification] Saving token for user:', user.id, 'device:', deviceType);

      // First, delete any existing tokens for this user/device combo
      const { error: deleteError } = await supabase
        .from('user_push_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('device_type', deviceType);

      if (deleteError) {
        console.error('[PushNotification] Error deleting old token:', deleteError);
      }

      // Then insert the new token
      const { error: insertError } = await supabase
        .from('user_push_tokens')
        .insert({
          user_id: user.id,
          push_token: token,
          device_type: deviceType
        });

      if (insertError) {
        console.error('[PushNotification] Error inserting token:', insertError);
      } else {
        console.log('[PushNotification] Token saved successfully!');
      }
    } catch (error) {
      console.error('[PushNotification] Error in saveTokenToDatabase:', error);
    }
  }

  /**
   * Handle notification tap - navigate to appropriate screen
   */
  private handleNotificationTap(data: Record<string, unknown>): void {
    const screen = data?.screen as string;
    
    if (screen) {
      // Use window.location for navigation since we don't have router access here
      switch (screen) {
        case 'protocol':
          window.location.href = '/protocol';
          break;
        case 'leaderboard':
          window.location.href = '/leaderboard';
          break;
        case 'dashboard':
        case 'home':
          window.location.href = '/';
          break;
        case 'profile':
          window.location.href = '/profile';
          break;
        default:
          console.log('[PushNotification] Unknown screen:', screen);
      }
    }
  }

  /**
   * Get current push token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Remove push token from database (e.g., on logout)
   */
  async removeToken(): Promise<void> {
    if (!this.token) return;

    try {
      const { error } = await supabase
        .from('user_push_tokens')
        .delete()
        .eq('push_token', this.token);

      if (error) {
        console.error('[PushNotification] Error removing token:', error);
      } else {
        console.log('[PushNotification] Token removed');
        this.token = null;
      }
    } catch (error) {
      console.error('[PushNotification] Error in removeToken:', error);
    }
  }
}

export const pushNotificationService = new PushNotificationService();
