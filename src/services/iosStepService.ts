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
// Minimum step increment to prevent sleep micro-movements from registering
// Apple's CMPedometer picks up tiny bed movements - ignore increments below this threshold
const MIN_MEANINGFUL_STEP_INCREMENT = 10;

// Debounce delay: batch rapid CMPedometer callbacks to reduce jitter
const PEDOMETER_DEBOUNCE_MS = 3000;

class IosStepService {
  private serviceRunning = false;
  private stepCallback: ((data: StepData) => void) | null = null;
  private listener: { remove: () => void } | null = null;
  private lastSteps = 0;
  private lastReportedSteps = 0; // tracks what was last emitted to callback
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

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

      // Step 4: Start measurement updates (required to activate the pedometer hardware)
      await CapacitorPedometer.startMeasurementUpdates();

      // Step 5: Add listener that polls EXACT midnight-to-now natively whenever movement occurs
      console.log('[IosStepService] Starting pedometer...');
      
      const fetchExactDailySteps = async () => {
        try {
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          const result = await CapacitorPedometer.getMeasurement({
            start: startOfDay.getTime(),
            end: now.getTime()
          });
          
          const steps = result.numberOfSteps || 0;
          const distance = result.distance || 0;

          // SLEEP MICRO-MOVEMENT FILTER:
          // CMPedometer registers tiny bed movements, phone placements, and vibrations as steps.
          // Only emit an update if the increment is meaningful (>= 10 steps).
          // This prevents phantom steps jumping from 0 to small numbers while lying in bed.
          const increment = steps - this.lastReportedSteps;
          if (increment > 0 && increment < MIN_MEANINGFUL_STEP_INCREMENT && this.lastReportedSteps > 0) {
            console.log(`[IosStepService] 🔇 Ignoring micro-movement increment: ${increment} steps (below threshold)`);
            return;
          }

          this.lastSteps = steps;
          this.lastReportedSteps = steps;

          if (this.stepCallback) {
            this.stepCallback({ steps, distance });
          }
        } catch (err) {
          console.error('[IosStepService] Failed to query absolute steps', err);
        }
      };

      // Debounced wrapper: batches rapid CMPedometer callbacks into one call
      // Prevents jittery updates when the sensor fires multiple times in quick succession
      const debouncedFetch = () => {
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
          fetchExactDailySteps();
        }, PEDOMETER_DEBOUNCE_MS);
      };

      this.listener = await CapacitorPedometer.addListener('measurement', () => {
        // Debounce the fetch to batch rapid micro-movements into a single update
        debouncedFetch();
      });

      // Instantly fetch the exact current correct steps so UI doesn't say 0 while sitting still.
      // Reset lastReportedSteps so the initial load always shows the correct count (no filter on first load).
      this.lastReportedSteps = 0;
      await fetchExactDailySteps();

      this.serviceRunning = true;
      console.log('[IosStepService] ✅ iOS exact daily step tracking started!');
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
   * Reset the reported steps baseline — called at midnight rollover so the
   * micro-movement filter doesn't suppress the first real steps of the new day.
   */
  resetReportedSteps(): void {
    this.lastReportedSteps = 0;
    console.log('[IosStepService] 🌅 Reported steps baseline reset for new day');
  }

  /**
   * Get historical steps across a timeframe
   */
  async getHistoricalSteps(startMs: number, endMs: number): Promise<number> {
    if (!this.isNative()) return 0;
    try {
      const result = await CapacitorPedometer.getMeasurement({ start: startMs, end: endMs });
      console.log(`[IosStepService] 🕰️ Harvested steps between ${new Date(startMs).toLocaleTimeString()} and ${new Date(endMs).toLocaleTimeString()}: ${result.numberOfSteps} steps`);
      return result.numberOfSteps || 0;
    } catch (e) {
      console.log('[IosStepService] Historical query failed:', e);
      return 0;
    }
  }

  /**
   * Stop iOS step tracking
   */
  async stop(): Promise<void> {
    try {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      if (this.listener) {
        this.listener.remove();
        this.listener = null;
      }
      await CapacitorPedometer.stopMeasurementUpdates();

      this.serviceRunning = false;
      this.stepCallback = null;
      this.lastReportedSteps = 0;
      console.log('[IosStepService] Stopped');
    } catch (e) {
      console.error('[IosStepService] Stop error:', e);
    }
  }
}

export const iosStepService = new IosStepService();
