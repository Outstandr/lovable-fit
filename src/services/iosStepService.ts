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
      // Step 1: Check if step counting is available on this device
      console.log('[IosStepService] Checking availability...');
      const availability = await CapacitorPedometer.isAvailable();
      
      if (!availability.stepCounting) {
        console.error('[IosStepService] Step counting not available on this device');
        return { 
          success: false, 
          error: 'Step counting is not available on this device' 
        };
      }
      console.log('[IosStepService] ✓ Step counting available');

      // Step 2: Check current permission status
      console.log('[IosStepService] Checking permissions...');
      let permission = await CapacitorPedometer.checkPermissions();
      
      // Step 3: Request permission if not granted
      if (permission.activityRecognition !== 'granted') {
        console.log('[IosStepService] Requesting permissions...');
        permission = await CapacitorPedometer.requestPermissions();
        
        if (permission.activityRecognition !== 'granted') {
          console.log('[IosStepService] Permission denied:', permission.activityRecognition);
          return { 
            success: false, 
            error: 'Motion & Fitness permission denied. Please enable in Settings > Privacy > Motion & Fitness.' 
          };
        }
      }
      console.log('[IosStepService] ✓ Permission granted');

      // Step 4: Add measurement listener
      console.log('[IosStepService] Starting pedometer...');
      this.listener = await CapacitorPedometer.addListener('measurement', (data: any) => {
        const steps = data.numberOfSteps || 0;
        const distance = data.distance || 0;
        
        console.log('[IosStepService] 📊 Steps:', steps);
        this.lastSteps = steps;

        if (this.stepCallback) {
          this.stepCallback({ steps, distance });
        }
      });

      // Step 5: Start measurement updates (now safe to call)
      await CapacitorPedometer.startMeasurementUpdates();

      this.serviceRunning = true;
      console.log('[IosStepService] ✅ iOS step tracking started!');
      return { success: true };

    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      console.error('[IosStepService] Failed to start:', errorMsg);
      
      if (errorMsg.includes('denied') || errorMsg.includes('restricted')) {
        return { 
          success: false, 
          error: 'Motion & Fitness permission denied. Enable in Settings > Privacy > Motion & Fitness.' 
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
