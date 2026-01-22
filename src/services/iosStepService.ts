import { Capacitor } from '@capacitor/core';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';

export interface StepData {
  steps: number;
  distance: number;
}

export interface StepServiceResult {
  success: boolean;
  error?: string;
}

/**
 * iOS Step Service
 * 
 * Uses @capgo/capacitor-pedometer directly on iOS.
 * iOS handles permission requests automatically via CMPedometer
 * when the app tries to access motion data (configured in Info.plist).
 * 
 * Note: iOS does NOT have foreground services. Step counting works
 * while app is open. For background steps, we sync from HealthKit
 * when the app resumes.
 */
class IosStepService {
  private serviceRunning = false;
  private stepCallback: ((data: StepData) => void) | null = null;
  private listener: { remove: () => void } | null = null;
  private lastSteps = 0;

  /**
   * Check if running on iOS
   */
  isNative(): boolean {
    return Capacitor.getPlatform() === 'ios';
  }

  /**
   * Check if the service is currently running
   */
  isRunning(): boolean {
    return this.serviceRunning;
  }

  /**
   * Start iOS step tracking.
   * iOS handles Motion permission automatically via Info.plist NSMotionUsageDescription.
   * The system will prompt for permission when we try to access the pedometer.
   */
  async requestPermissionAndStart(callback?: (data: StepData) => void): Promise<StepServiceResult> {
    if (!this.isNative()) {
      return { success: false, error: 'Not on iOS platform' };
    }

    if (callback) {
      this.stepCallback = callback;
    }

    // Already running? Just update callback
    if (this.serviceRunning) {
      console.log('[IosStepService] Already running - updated callback');
      return { success: true };
    }

    try {
      console.log('[IosStepService] Starting pedometer...');
      
      // Add step measurement listener
      this.listener = await CapacitorPedometer.addListener('measurement', (data: any) => {
        const steps = data.numberOfSteps || 0;
        const distance = data.distance || 0;
        
        console.log('[IosStepService] 📊 Steps:', steps);
        this.lastSteps = steps;

        if (this.stepCallback) {
          this.stepCallback({ steps, distance });
        }
      });

      // Start measurement updates - iOS will prompt for Motion permission here
      await CapacitorPedometer.startMeasurementUpdates();

      this.serviceRunning = true;
      console.log('[IosStepService] ✅ iOS step tracking started!');
      return { success: true };

    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      console.error('[IosStepService] Failed to start:', errorMsg);
      
      // Check for permission denial
      if (errorMsg.includes('denied') || errorMsg.includes('restricted')) {
        return { 
          success: false, 
          error: 'Motion & Fitness permission denied. Please enable in Settings > Privacy > Motion & Fitness.' 
        };
      }
      
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Subscribe to step updates (if tracking is already running)
   */
  subscribeToUpdates(callback: (data: StepData) => void): void {
    this.stepCallback = callback;
    console.log('[IosStepService] Subscribed to updates');
  }

  /**
   * Get the current step count (last known value)
   */
  getLastSteps(): number {
    return this.lastSteps;
  }

  /**
   * Stop iOS step tracking
   */
  async stop(): Promise<void> {
    try {
      if (this.listener) {
        this.listener.remove();
        this.listener = null;
      }
      await CapacitorPedometer.stopMeasurementUpdates();

      this.serviceRunning = false;
      this.stepCallback = null;
      console.log('[IosStepService] Stopped');
    } catch (e) {
      console.error('[IosStepService] Stop error:', e);
    }
  }
}

export const iosStepService = new IosStepService();
