import { Capacitor } from '@capacitor/core';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';

export interface PedometerData {
  steps: number;
  distance: number;
}

export type PedometerCallback = (data: PedometerData) => void;

class PedometerService {
  private isNativePlatform = Capacitor.isNativePlatform();
  private listener: any = null;
  private isStarted = false;
  private callback: PedometerCallback | null = null;

  isNative(): boolean {
    return this.isNativePlatform;
  }

  getPlatform(): string {
    return Capacitor.getPlatform();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isNativePlatform) return false;
    try {
      const result = await CapacitorPedometer.isAvailable();
      console.log('[PedometerService] isAvailable:', result);
      return result.stepCounting === true;
    } catch (error) {
      console.error('[PedometerService] isAvailable error:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isNativePlatform) return true;
    try {
      console.log('[PedometerService] Requesting permission...');
      const result = await CapacitorPedometer.requestPermissions();
      console.log('[PedometerService] Permission result:', result);
      return result.activityRecognition === 'granted';
    } catch (error) {
      console.error('[PedometerService] Permission error:', error);
      return false;
    }
  }

  isTracking(): boolean {
    return this.isStarted;
  }

  /**
   * Start tracking steps. If already started, just updates the callback.
   * Bypasses permission cache - uses Android's real permission state.
   */
  async start(callback: PedometerCallback): Promise<boolean> {
    if (!this.isNativePlatform) return false;

    // If already started, just update callback
    if (this.isStarted) {
      console.log('[PedometerService] Already started - updating callback');
      this.callback = callback;
      return true;
    }

    try {
      console.log('[PedometerService] Starting sensor...');

      // Register listener first
      this.listener = await CapacitorPedometer.addListener('measurement', (data: any) => {
        console.log('[PedometerService] Measurement:', data);
        if (this.callback) {
          this.callback({
            steps: data.numberOfSteps || 0,
            distance: data.distance || 0
          });
        }
      });

      // Start sensor - uses Android's REAL permission state
      await CapacitorPedometer.startMeasurementUpdates();

      this.isStarted = true;
      this.callback = callback;
      console.log('[PedometerService] ✓ Sensor active');
      return true;
    } catch (error) {
      console.error('[PedometerService] Start failed:', error);
      if (this.listener) {
        try { await this.listener.remove(); } catch {}
        this.listener = null;
      }
      return false;
    }
  }

  async stop(): Promise<void> {
    if (!this.isStarted) return;
    try {
      console.log('[PedometerService] Stopping...');
      await CapacitorPedometer.stopMeasurementUpdates();
      if (this.listener) {
        await this.listener.remove();
        this.listener = null;
      }
      this.isStarted = false;
      this.callback = null;
      console.log('[PedometerService] Stopped');
    } catch (error) {
      console.error('[PedometerService] Stop error:', error);
    }
  }
}

export const pedometerService = new PedometerService();
