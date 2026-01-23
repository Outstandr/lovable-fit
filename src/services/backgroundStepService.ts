import { Capacitor } from '@capacitor/core';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';

// Dynamic import for foreground service (Android only)
let ForegroundService: any = null;

export interface BackgroundStepResult {
  success: boolean;
  error?: string;
}

export interface StepData {
  steps: number;
  distance: number;
}

const ACTIVITY_RECOGNITION_PERMISSION = 'android.permission.ACTIVITY_RECOGNITION';

// Sensor state storage for reboot detection
const SENSOR_STATE_KEY = 'sensor_state';

interface SensorState {
  lastValue: number;
  timestamp: number;
}

// Retry configuration for foreground service
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = [1000, 2000, 4000]; // Exponential backoff

/**
 * Background Step Service
 * 
 * Combines @capawesome-team/capacitor-android-foreground-service (for background persistence)
 * with @capgo/capacitor-pedometer (for step counting).
 * 
 * The foreground service keeps the app process alive in the background,
 * allowing the pedometer to continue counting steps.
 */
class BackgroundStepService {
  private initialized = false;
  private serviceRunning = false;
  private stepCallback: ((data: StepData) => void) | null = null;
  private listener: { remove: () => void } | null = null;
  private lastSteps = 0;
  private onRebootDetected: ((lostSensorValue: number) => void) | null = null;

  /**
   * Check if running on native platform
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Check if the background service is currently running
   */
  isRunning(): boolean {
    return this.serviceRunning;
  }

  /**
   * Get sensor state from localStorage for reboot detection
   */
  private getSensorState(): SensorState | null {
    try {
      const stored = localStorage.getItem(SENSOR_STATE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Save sensor state to localStorage for reboot detection
   */
  private saveSensorState(value: number): void {
    localStorage.setItem(SENSOR_STATE_KEY, JSON.stringify({
      lastValue: value,
      timestamp: Date.now()
    }));
  }

  /**
   * Set callback for when device reboot is detected
   */
  setRebootCallback(callback: (lostSensorValue: number) => void): void {
    this.onRebootDetected = callback;
    console.log('[BackgroundStep] Reboot callback registered');
  }

  /**
   * Initialize the foreground service plugin (lazy load)
   */
  async initialize(): Promise<boolean> {
    if (!this.isNative()) {
      console.log('[BackgroundStep] Not on native platform');
      return false;
    }

    if (this.initialized) {
      return true;
    }

    try {
      // Only load on Android
      if (Capacitor.getPlatform() === 'android') {
        const module = await import('@capawesome-team/capacitor-android-foreground-service');
        ForegroundService = module.ForegroundService;
        console.log('[BackgroundStep] Foreground service plugin loaded');
      }
      this.initialized = true;
      return true;
    } catch (e) {
      console.error('[BackgroundStep] Failed to load foreground service:', e);
      // Still allow initialization - pedometer can work without foreground service
      this.initialized = true;
      return true;
    }
  }

  /**
   * Request activity permission using Cordova delegate (avoids NPE in pedometer plugin)
   */
  private async requestActivityPermission(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!window.cordova?.plugins?.permissions) {
        console.log('[BackgroundStep] Cordova permissions plugin not available');
        resolve(false);
        return;
      }

      console.log('[BackgroundStep] 🎯 Requesting permission via Cordova...');
      const permissions = window.cordova.plugins.permissions;
      permissions.requestPermission(
        ACTIVITY_RECOGNITION_PERMISSION,
        (status: { hasPermission: boolean }) => {
          console.log('[BackgroundStep] Permission result:', status.hasPermission);
          resolve(status.hasPermission);
        },
        (err: any) => {
          console.error('[BackgroundStep] Permission request error:', err);
          resolve(false);
        }
      );
    });
  }

  /**
   * Start the foreground service (shows persistent notification)
   */
  private async startForegroundService(): Promise<boolean> {
    if (!ForegroundService) {
      console.log('[BackgroundStep] Foreground service not available');
      return false;
    }

    try {
      // Create notification channel first
      await ForegroundService.createNotificationChannel({
        id: 'step-tracking',
        name: 'Step Tracking',
        description: 'Tracks your steps in the background',
        importance: 3 // Default importance
      });

      // Start the foreground service with a persistent notification
      await ForegroundService.startForegroundService({
        id: 1001,
        title: 'Step Tracking Active',
        body: `${this.lastSteps.toLocaleString()} steps today`,
        smallIcon: 'ic_stat_directions_walk',
        notificationChannelId: 'step-tracking',
        silent: true
      });

      console.log('[BackgroundStep] ✅ Foreground service started');
      return true;
    } catch (e) {
      console.error('[BackgroundStep] Failed to start foreground service:', e);
      return false;
    }
  }

  /**
   * Start foreground service with retry logic and verification
   */
  private async startForegroundServiceWithRetry(): Promise<boolean> {
    if (!ForegroundService) {
      console.log('[BackgroundStep] Foreground service not available - skipping');
      return false;
    }

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      const success = await this.startForegroundService();

      if (success) {
        // Verify service is actually running
        try {
          // Some versions have checkForegroundService, fallback if not
          if (typeof ForegroundService.checkForegroundService === 'function') {
            await ForegroundService.checkForegroundService();
          }
          console.log('[BackgroundStep] ✅ Foreground service verified (attempt', attempt + 1, ')');
          return true;
        } catch (verifyError) {
          console.warn('[BackgroundStep] Service started but verification failed:', verifyError);
          // Still count as success if start didn't throw
          return true;
        }
      }

      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        console.log('[BackgroundStep] Retry', attempt + 2, 'in', RETRY_DELAY_MS[attempt], 'ms');
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS[attempt]));
      }
    }

    console.error('[BackgroundStep] ❌ Failed to start foreground service after', MAX_RETRY_ATTEMPTS, 'attempts');
    return false;
  }

  /**
   * Update the foreground notification with current step count
   */
  async updateNotification(steps: number): Promise<void> {
    if (!ForegroundService || !this.serviceRunning) return;

    try {
      await ForegroundService.updateForegroundService({
        id: 1001,
        title: 'Step Tracking Active',
        body: `${steps.toLocaleString()} steps today`,
        smallIcon: 'ic_stat_directions_walk'
      });
    } catch (e) {
      // Ignore update errors
    }
  }

  /**
   * Request permission and start background step tracking.
   * This starts both the foreground service (for background persistence)
   * and the pedometer (for step counting).
   */
  async requestPermissionAndStart(callback?: (data: StepData) => void): Promise<BackgroundStepResult> {
    if (!this.isNative()) {
      return { success: false, error: 'Not on native platform' };
    }

    await this.initialize();

    if (callback) {
      this.stepCallback = callback;
    }

    // Already running? Just update callback
    if (this.serviceRunning) {
      console.log('[BackgroundStep] Already running - updated callback');
      return { success: true };
    }

    try {
      // Step 1: Request activity recognition permission
      console.log('[BackgroundStep] Requesting activity permission...');
      const hasPermission = await this.requestActivityPermission();
      
      if (!hasPermission) {
        return {
          success: false,
          error: 'Activity recognition permission denied. Please enable in Settings > Apps > HotStepper > Permissions.'
        };
      }

      // Step 2: Start the foreground service with retry logic (keeps app alive in background)
      if (Capacitor.getPlatform() === 'android') {
        const serviceStarted = await this.startForegroundServiceWithRetry();
        if (!serviceStarted) {
          // Service failed but continue with pedometer anyway
          console.warn('[BackgroundStep] ⚠️ Proceeding without foreground service - background tracking may be unreliable');
        }
      }

      // Step 3: Start the pedometer listener
      console.log('[BackgroundStep] Starting pedometer...');
      this.listener = await CapacitorPedometer.addListener('measurement', (data: any) => {
        const steps = data.numberOfSteps || 0;
        const distance = data.distance || 0;

        // REBOOT DETECTION
        const savedState = this.getSensorState();
        if (savedState) {
          const timeDiff = Date.now() - savedState.timestamp;
          const stepDiff = steps - savedState.lastValue;

          // If steps decreased significantly AND more than 5 minutes passed, likely reboot
          if (stepDiff < -100 && timeDiff > 5 * 60 * 1000) {
            console.log('[BackgroundStep] ⚠️ Reboot detected!', {
              previousSteps: savedState.lastValue,
              currentSteps: steps,
              timeSinceLastUpdate: Math.round(timeDiff / 1000) + 's'
            });
            
            // Emit reboot event so usePedometer can handle it
            if (this.onRebootDetected) {
              this.onRebootDetected(savedState.lastValue);
            }
          }
        }

        // Save current state for future reboot detection
        this.saveSensorState(steps);
        
        console.log('[BackgroundStep] 📊 Steps:', steps);
        this.lastSteps = steps;

        // Update notification with step count
        this.updateNotification(steps);

        if (this.stepCallback) {
          this.stepCallback({ steps, distance });
        }
      });

      // Step 4: Start measurement updates
      await CapacitorPedometer.startMeasurementUpdates();

      this.serviceRunning = true;
      console.log('[BackgroundStep] ✅ Background step tracking started!');
      return { success: true };

    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      console.error('[BackgroundStep] Failed to start:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Subscribe to step updates (if tracking is already running)
   */
  subscribeToUpdates(callback: (data: StepData) => void): void {
    this.stepCallback = callback;
    console.log('[BackgroundStep] Subscribed to updates');
  }

  /**
   * Get the current step count (last known value)
   */
  getLastSteps(): number {
    return this.lastSteps;
  }

  /**
   * Stop background step tracking
   */
  async stop(): Promise<void> {
    try {
      // Stop pedometer
      if (this.listener) {
        this.listener.remove();
        this.listener = null;
      }
      await CapacitorPedometer.stopMeasurementUpdates();

      // Stop foreground service
      if (ForegroundService) {
        await ForegroundService.stopForegroundService();
      }

      this.serviceRunning = false;
      this.stepCallback = null;
      console.log('[BackgroundStep] Stopped');
    } catch (e) {
      console.error('[BackgroundStep] Stop error:', e);
    }
  }
}

export const backgroundStepService = new BackgroundStepService();
