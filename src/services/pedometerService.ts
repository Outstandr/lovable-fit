import { Capacitor } from '@capacitor/core';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';

export interface PedometerData {
  steps: number;
  distance: number; // in meters
}

export type PedometerCallback = (data: PedometerData) => void;

class PedometerService {
  private isNativePlatform: boolean;
  private listener: any = null;
  private isStarted: boolean = false;

  constructor() {
    this.isNativePlatform = Capacitor.isNativePlatform();
  }

  isNative(): boolean {
    return this.isNativePlatform;
  }

  getPlatform(): string {
    return Capacitor.getPlatform();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isNativePlatform) {
      console.log('[PedometerService] Web platform - step counting not available');
      return false;
    }

    try {
      const result = await CapacitorPedometer.isAvailable();
      console.log('[PedometerService] Availability check:', result);
      return result.stepCounting === true;
    } catch (error) {
      console.error('[PedometerService] isAvailable error:', error);
      return false;
    }
  }

  async checkPermission(): Promise<boolean> {
    if (!this.isNativePlatform) return true;

    try {
      const result = await CapacitorPedometer.checkPermissions();
      console.log('[PedometerService] Permission check result:', result);
      return result.activityRecognition === 'granted';
    } catch (error) {
      console.error('[PedometerService] Permission check error:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isNativePlatform) return true;

    try {
      console.log('[PedometerService] Requesting permission...');
      const result = await CapacitorPedometer.requestPermissions();
      console.log('[PedometerService] Permission request result:', result);
      return result.activityRecognition === 'granted';
    } catch (error) {
      console.error('[PedometerService] Permission request error:', error);
      return false;
    }
  }

  async start(callback: PedometerCallback): Promise<boolean> {
    if (!this.isNativePlatform) {
      console.log('[PedometerService] Web platform - cannot start');
      return false;
    }

    if (this.isStarted) {
      console.log('[PedometerService] Already started');
      return true;
    }

    try {
      // Force permission refresh (this syncs Android's native state)
      console.log('[PedometerService] Refreshing permission state...');
      await CapacitorPedometer.requestPermissions();
      
      // Small delay to let Android sync
      await new Promise(r => setTimeout(r, 200));

      // Add listener FIRST (per official docs)
      console.log('[PedometerService] Registering measurement listener...');
      this.listener = await CapacitorPedometer.addListener('measurement', (data: any) => {
        console.log('[PedometerService] Measurement event:', data);
        callback({
          steps: data.numberOfSteps || 0,
          distance: data.distance || 0
        });
      });

      // Start measurement updates
      console.log('[PedometerService] Starting measurement updates...');
      await CapacitorPedometer.startMeasurementUpdates();
      
      this.isStarted = true;
      console.log('[PedometerService] Started successfully');
      return true;
    } catch (error) {
      console.error('[PedometerService] Start error:', error);
      return false;
    }
  }

  async stop(): Promise<void> {
    if (!this.isNativePlatform || !this.isStarted) return;

    try {
      console.log('[PedometerService] Stopping measurement updates...');
      await CapacitorPedometer.stopMeasurementUpdates();

      if (this.listener) {
        console.log('[PedometerService] Removing listener...');
        await this.listener.remove();
        this.listener = null;
      }

      this.isStarted = false;
      console.log('[PedometerService] Stopped');
    } catch (error) {
      console.error('[PedometerService] Stop error:', error);
    }
  }

  isTracking(): boolean {
    return this.isStarted;
  }

  /**
   * Attach a new callback to an already-running pedometer.
   * Used when Dashboard mounts after onboarding already started tracking.
   */
  async attachCallback(callback: PedometerCallback): Promise<boolean> {
    if (!this.isNativePlatform) return false;

    // If not started, just start normally
    if (!this.isStarted) {
      console.log('[PedometerService] Not started - calling start() instead');
      return this.start(callback);
    }

    try {
      // Remove old listener
      if (this.listener) {
        console.log('[PedometerService] Removing old listener before attaching new callback...');
        await this.listener.remove();
      }

      // Add new listener with the new callback
      console.log('[PedometerService] Attaching new callback...');
      this.listener = await CapacitorPedometer.addListener('measurement', (data: any) => {
        console.log('[PedometerService] Measurement event (attached):', data);
        callback({
          steps: data.numberOfSteps || 0,
          distance: data.distance || 0
        });
      });

      console.log('[PedometerService] New callback attached successfully');
      return true;
    } catch (error) {
      console.error('[PedometerService] attachCallback error:', error);
      return false;
    }
  }
}

export const pedometerService = new PedometerService();
