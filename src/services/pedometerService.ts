import { Capacitor } from '@capacitor/core';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';
/// <reference path="../types/cordova-permissions.d.ts" />

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

// The Android permission string for activity recognition
const ACTIVITY_RECOGNITION_PERMISSION = 'android.permission.ACTIVITY_RECOGNITION';

// Helper: Check if we have activity recognition permission using Cordova plugin
const checkActivityPermission = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!window.cordova?.plugins?.permissions) {
      console.log('[Pedometer] Cordova permissions plugin not available');
      resolve(false);
      return;
    }
    
    const permissions = window.cordova.plugins.permissions;
    permissions.checkPermission(
      ACTIVITY_RECOGNITION_PERMISSION,
      (status) => {
        console.log('[Pedometer] Permission check result:', status.hasPermission);
        resolve(status.hasPermission);
      },
      (err) => {
        console.error('[Pedometer] Permission check error:', err);
        resolve(false);
      }
    );
  });
};

// Helper: Request activity recognition permission using Cordova plugin (THE DELEGATE)
const requestActivityPermission = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!window.cordova?.plugins?.permissions) {
      console.log('[Pedometer] Cordova permissions plugin not available');
      resolve(false);
      return;
    }
    
    console.log('[Pedometer] 🎯 Requesting permission via Cordova delegate...');
    const permissions = window.cordova.plugins.permissions;
    permissions.requestPermission(
      ACTIVITY_RECOGNITION_PERMISSION,
      (status) => {
        console.log('[Pedometer] 🎯 Permission request result:', status.hasPermission);
        resolve(status.hasPermission);
      },
      (err) => {
        console.error('[Pedometer] Permission request error:', err);
        resolve(false);
      }
    );
  });
};

/**
 * Pedometer Service with Delegate Permission Pattern
 * 
 * Uses cordova-plugin-android-permissions as a "delegate" to request
 * ACTIVITY_RECOGNITION permission because @capgo/capacitor-pedometer's
 * requestPermissions() crashes with NullPointerException on Android 14+.
 * 
 * Core API: isNative, start, stop, isTracking, subscribeToUpdates
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
    this.callback = callback;
    console.log('[Pedometer] Subscribed to tracker');
  }

  /**
   * Check if running on native platform
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Check if currently tracking
   */
  isTracking(): boolean {
    return this.isStarted;
  }

  /**
   * Start step tracking with Delegate Permission Pattern
   * 
   * Uses cordova-plugin-android-permissions to request permission first,
   * then starts the pedometer sensor. This avoids the NPE crash in the
   * pedometer plugin's requestPermissions() method.
   */
  async start(callback: PedometerCallback): Promise<StartResult> {
    if (!this.isNative()) {
      return { success: false, error: 'SENSOR_UNAVAILABLE', guidance: 'Step tracking only works on mobile devices' };
    }

    // Already running? Just update callback
    if (this.isStarted) {
      this.callback = callback;
      console.log('[Pedometer] Already running - updated callback');
      return { success: true };
    }

    this.callback = callback;

    // DELEGATE PATTERN: Use Cordova plugin to check/request permission FIRST
    // This avoids the NullPointerException in the Pedometer plugin's requestPermissions()
    try {
      let hasPermission = await checkActivityPermission();
      console.log('[Pedometer] Current permission status:', hasPermission);

      if (!hasPermission) {
        // Request permission using Cordova delegate (shows native Android dialog!)
        hasPermission = await requestActivityPermission();
      }

      if (!hasPermission) {
        // User denied permission
        console.log('[Pedometer] ❌ Permission denied by user');
        return { 
          success: false, 
          error: 'ACTIVITY_PERMISSION_DENIED',
          guidance: 'Please enable Physical Activity permission in Settings > Apps > HotStepper > Permissions'
        };
      }
    } catch (e) {
      console.log('[Pedometer] Cordova permission check failed, trying direct start:', e);
      // Fall through to try direct start anyway
    }

    try {
      // Step 1: Add measurement listener
      console.log('[Pedometer] Adding measurement listener...');
      this.listener = await CapacitorPedometer.addListener('measurement', (data: any) => {
        console.log('[Pedometer] 🔬 RAW:', data.numberOfSteps, 'steps,', data.distance, 'm');
        if (this.callback) {
          this.callback({
            steps: data.numberOfSteps || 0,
            distance: data.distance || 0,
          });
        }
      });

      // Step 2: Start measurement updates - permission should already be granted
      console.log('[Pedometer] Starting sensor...');
      await CapacitorPedometer.startMeasurementUpdates();
      
      this.isStarted = true;
      console.log('[Pedometer] ✅ Sensor started successfully!');
      return { success: true };

    } catch (error: any) {
      const errorMsg = (error?.message || String(error)).toLowerCase();
      console.error('[Pedometer] ❌ Start failed:', error?.message);
      
      this.cleanup();
      
      // Detect permission-related errors from the thrown exception
      if (errorMsg.includes('permission') || errorMsg.includes('denied') || errorMsg.includes('activity')) {
        return { 
          success: false, 
          error: 'ACTIVITY_PERMISSION_DENIED',
          guidance: 'Go to Settings > Apps > [App] > Permissions > Physical Activity > Allow'
        };
      }
      
      // Detect foreground service issues (Android 14+)
      if (errorMsg.includes('foreground') || errorMsg.includes('notification')) {
        return { 
          success: false, 
          error: 'FOREGROUND_SERVICE_BLOCKED',
          guidance: 'Enable notifications and disable battery optimization for this app'
        };
      }
      
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
      console.log('[Pedometer] Stopped');
    } catch (error) {
      console.log('[Pedometer] Stop error (ignored):', error);
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
