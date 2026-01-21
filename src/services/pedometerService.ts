import { Capacitor } from '@capacitor/core';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';

export interface PedometerData {
  steps: number;
  distance: number;
}

export type PedometerCallback = (data: PedometerData) => void;

/**
 * Simplified Pedometer Service
 * Core API: isNative, requestPermission, start, stop
 */
class PedometerService {
  private callback: PedometerCallback | null = null;
  private listener: { remove: () => void } | null = null;
  private isStarted = false;

  /**
   * Check if running on native platform
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Request activity recognition permission
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isNative()) return false;

    try {
      const result = await CapacitorPedometer.requestPermissions();
      return result.activityRecognition === 'granted';
    } catch (error) {
      console.error('[Pedometer] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Check if currently tracking
   */
  isTracking(): boolean {
    return this.isStarted;
  }

  /**
   * Start step tracking with callback for updates
   * Returns true if started successfully
   */
  async start(callback: PedometerCallback): Promise<boolean> {
    if (!this.isNative()) return false;

    // Update callback if already started
    if (this.isStarted) {
      this.callback = callback;
      return true;
    }

    try {
      // Check permission first, only request if needed
      const permCheck = await CapacitorPedometer.checkPermissions();
      if (permCheck.activityRecognition !== 'granted') {
        console.log('[Pedometer] Permission not granted, requesting...');
        const permResult = await CapacitorPedometer.requestPermissions();
        if (permResult.activityRecognition !== 'granted') {
          console.log('[Pedometer] Permission denied');
          return false;
        }
      }

      this.callback = callback;

      // Add measurement listener
      this.listener = await CapacitorPedometer.addListener('measurement', (data: any) => {
        if (this.callback) {
          this.callback({
            steps: data.numberOfSteps || 0,
            distance: data.distance || 0,
          });
        }
      });

      // Start measurement updates
      await CapacitorPedometer.startMeasurementUpdates();
      this.isStarted = true;
      
      return true;
    } catch (error) {
      console.error('[Pedometer] Start failed:', error);
      this.cleanup();
      return false;
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
