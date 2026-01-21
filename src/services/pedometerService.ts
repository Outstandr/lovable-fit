import { Capacitor } from '@capacitor/core';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';
import { PushNotifications } from '@capacitor/push-notifications';

export interface PedometerData {
  steps: number;
  distance: number;
}

export type PedometerCallback = (data: PedometerData) => void;

export interface StartResult {
  success: boolean;
  error?: 'ACTIVITY_PERMISSION_DENIED' | 'NOTIFICATION_PERMISSION_DENIED' | 'FOREGROUND_SERVICE_BLOCKED' | 'SENSOR_UNAVAILABLE' | 'UNKNOWN';
  guidance?: string;
}

/**
 * Simplified Pedometer Service with Android 14+ Foreground Service Support
 * Core API: isNative, ensurePermission, ensureNotificationPermission, start, stop
 */
class PedometerService {
  private callback: PedometerCallback | null = null;
  private listener: { remove: () => void } | null = null;
  private isStarted = false;
  private startedDuringOnboarding = false;

  /**
   * Check if step tracking was started during onboarding
   */
  wasStartedDuringOnboarding(): boolean {
    return this.startedDuringOnboarding;
  }

  /**
   * Mark that tracking was started during onboarding
   */
  setStartedDuringOnboarding(value: boolean): void {
    this.startedDuringOnboarding = value;
  }

  /**
   * Subscribe to updates from an already-running tracker
   */
  subscribeToUpdates(callback: PedometerCallback): void {
    if (this.isStarted) {
      this.callback = callback;
      console.log('[Pedometer] Subscribed to existing tracker');
    }
  }

  /**
   * Check if running on native platform
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Unified permission flow: check first, request only if needed
   * Returns 'granted', 'denied', or 'unavailable'
   */
  async ensurePermission(): Promise<'granted' | 'denied' | 'unavailable'> {
    if (!this.isNative()) return 'unavailable';

    try {
      // First check current state
      const checkResult = await CapacitorPedometer.checkPermissions();
      if (checkResult.activityRecognition === 'granted') {
        console.log('[Pedometer] Permission already granted');
        return 'granted';
      }

      // Only request if not already granted
      console.log('[Pedometer] Permission not granted, requesting...');
      const requestResult = await CapacitorPedometer.requestPermissions();
      const finalState = requestResult.activityRecognition === 'granted' ? 'granted' : 'denied';
      console.log(`[Pedometer] Permission after request: ${finalState}`);
      return finalState;
    } catch (error) {
      console.error('[Pedometer] Permission flow failed:', error);
      return 'denied';
    }
  }

  /**
   * Check and request POST_NOTIFICATIONS permission (Android 13+ requirement for foreground services)
   */
  async ensureNotificationPermission(): Promise<'granted' | 'denied' | 'unavailable'> {
    if (!this.isNative()) return 'unavailable';

    try {
      console.log('[Pedometer] Checking notification permission (Android 13+)...');
      const checkResult = await PushNotifications.checkPermissions();
      
      if (checkResult.receive === 'granted') {
        console.log('[Pedometer] Notification permission already granted');
        return 'granted';
      }

      console.log('[Pedometer] Requesting notification permission...');
      const requestResult = await PushNotifications.requestPermissions();
      const finalState = requestResult.receive === 'granted' ? 'granted' : 'denied';
      console.log(`[Pedometer] Notification permission after request: ${finalState}`);
      return finalState;
    } catch (error) {
      console.log('[Pedometer] Notification permission check failed (non-critical):', error);
      return 'unavailable';
    }
  }

  /**
   * Legacy method - calls ensurePermission internally
   */
  async requestPermission(): Promise<boolean> {
    const result = await this.ensurePermission();
    return result === 'granted';
  }

  /**
   * Check if currently tracking
   */
  isTracking(): boolean {
    return this.isStarted;
  }

  /**
   * Start step tracking with callback for updates
   * Returns detailed result with error type and user guidance
   */
  async start(callback: PedometerCallback): Promise<StartResult> {
    if (!this.isNative()) {
      return { success: false, error: 'SENSOR_UNAVAILABLE', guidance: 'Step tracking only works on mobile devices' };
    }

    // Update callback if already started
    if (this.isStarted) {
      this.callback = callback;
      return { success: true };
    }

    try {
      // Step 1: Check activity recognition permission
      console.log('[Pedometer] Step 1: Checking activity recognition permission...');
      const permStatus = await this.ensurePermission();
      if (permStatus !== 'granted') {
        console.log('[Pedometer] ❌ Activity recognition permission denied');
        return { 
          success: false, 
          error: 'ACTIVITY_PERMISSION_DENIED',
          guidance: 'Go to Settings > Apps > [App] > Permissions > Physical Activity > Allow'
        };
      }

      // Step 2: Check notification permission (Android 13+ requirement for foreground service)
      console.log('[Pedometer] Step 2: Checking notification permission (Android 13+)...');
      const notifStatus = await this.ensureNotificationPermission();
      if (notifStatus === 'denied') {
        console.log('[Pedometer] ⚠️ Notification permission denied - foreground service may fail on Android 13+');
        // Don't block, but warn - some devices may still work
      }

      this.callback = callback;

      // Step 3: Add measurement listener with detailed logging
      console.log('[Pedometer] Step 3: Adding measurement listener...');
      this.listener = await CapacitorPedometer.addListener('measurement', (data: any) => {
        // 🔬 RAW SENSOR DATA - Critical for Android 14/15/16 debugging
        console.log('[Pedometer] 🔬 RAW SENSOR DATA:', JSON.stringify(data));
        console.log('[Pedometer] numberOfSteps:', data.numberOfSteps);
        console.log('[Pedometer] distance:', data.distance);
        console.log('[Pedometer] timestamp:', Date.now());
        
        if (this.callback) {
          this.callback({
            steps: data.numberOfSteps || 0,
            distance: data.distance || 0,
          });
        }
      });

      // Step 4: Start measurement updates with try/catch for foreground service issues
      console.log('[Pedometer] Step 4: Calling startMeasurementUpdates()...');
      try {
        await CapacitorPedometer.startMeasurementUpdates();
        this.isStarted = true;
        console.log('[Pedometer] ✅ startMeasurementUpdates() SUCCESS');
        return { success: true };
      } catch (startError: any) {
        const errorMsg = startError?.message || String(startError);
        console.error('[Pedometer] ❌ startMeasurementUpdates() FAILED:', errorMsg);
        
        // Detect Android 14+ foreground service issue
        if (errorMsg.toLowerCase().includes('permission') || 
            errorMsg.toLowerCase().includes('foreground') ||
            errorMsg.toLowerCase().includes('activity recognition')) {
          console.log('[Pedometer] 🔧 Detected foreground service issue');
          this.cleanup();
          return { 
            success: false, 
            error: 'FOREGROUND_SERVICE_BLOCKED',
            guidance: 'Android 14+ requires: 1) Allow Notifications, 2) Settings > Apps > [App] > Battery > Unrestricted'
          };
        }
        
        this.cleanup();
        return { success: false, error: 'UNKNOWN', guidance: errorMsg };
      }
      
    } catch (error: any) {
      console.error('[Pedometer] ❌ Start failed:', error);
      console.error('[Pedometer] Error name:', error?.name);
      console.error('[Pedometer] Error message:', error?.message);
      console.error('[Pedometer] Error stack:', error?.stack);
      this.cleanup();
      return { success: false, error: 'UNKNOWN', guidance: error?.message || 'Unknown error' };
    }
  }

  /**
   * Stop step tracking
   */
  async stop(): Promise<void> {
    if (!this.isNative()) return;

    try {
      await CapacitorPedometer.stopMeasurementUpdates();
    } catch (error) {
      console.error('[Pedometer] Stop error:', error);
    }

    this.cleanup();
  }

  private cleanup(): void {
    if (this.listener) {
      this.listener.remove();
      this.listener = null;
    }
    this.callback = null;
    this.isStarted = false;
  }
}

export const pedometerService = new PedometerService();
