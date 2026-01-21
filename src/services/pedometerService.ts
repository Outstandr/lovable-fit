import { Capacitor } from '@capacitor/core';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';

export interface PedometerData {
  steps: number;
  distance: number;
}

export type PedometerCallback = (data: PedometerData) => void;

/**
 * Simplified Pedometer Service
 * Core API: isNative, ensurePermission, start, stop
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
      // Use unified permission flow
      const permStatus = await this.ensurePermission();
      if (permStatus !== 'granted') {
        console.log('[Pedometer] Permission denied, cannot start');
        return false;
      }

      this.callback = callback;

      // Add measurement listener with detailed logging
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

      // Start measurement updates
      console.log('[Pedometer] 🚀 Starting measurement updates...');
      await CapacitorPedometer.startMeasurementUpdates();
      this.isStarted = true;
      console.log('[Pedometer] ✅ Measurement updates started successfully');
      
      return true;
    } catch (error: any) {
      console.error('[Pedometer] ❌ Start failed:', error);
      console.error('[Pedometer] Error name:', error?.name);
      console.error('[Pedometer] Error message:', error?.message);
      console.error('[Pedometer] Error stack:', error?.stack);
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
