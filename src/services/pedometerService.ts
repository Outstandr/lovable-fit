import { Capacitor } from '@capacitor/core';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';

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
 * Simplified Pedometer Service - ONE METHOD approach
 * Avoids buggy permission check methods that cause NullPointerException
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
   * THE ONE METHOD - Start step tracking directly
   * 
   * This bypasses the buggy checkPermissions/requestPermissions methods
   * that crash with NullPointerException on some Android versions.
   * 
   * startMeasurementUpdates() will:
   * - Trigger permission dialog if needed (Android handles this)
   * - Throw catchable error if permission denied
   * - Start the sensor if permission granted
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

      // Step 2: Start measurement updates directly
      // This triggers the permission dialog if needed, or fails with catchable error
      console.log('[Pedometer] Starting sensor (will trigger permission if needed)...');
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
