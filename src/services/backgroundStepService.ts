import { Capacitor } from '@capacitor/core';

// Dynamic import to avoid issues on web
let Backgroundstep: any = null;

export interface BackgroundStepResult {
  success: boolean;
  error?: string;
}

/**
 * Background Step Service
 * 
 * Wraps the capacitor-background-step plugin which provides TRUE background
 * step tracking via an Android foreground service. Steps are counted even
 * when the app is closed or the device is locked.
 * 
 * Key differences from foreground-only pedometer:
 * - Runs a persistent foreground service (requires notification permission)
 * - Counts steps 24/7, not just when app is open
 * - Auto-restarts on device boot
 * - Stores step data locally for historical queries
 */
class BackgroundStepService {
  private initialized = false;
  private serviceRunning = false;

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
   * Initialize the plugin (lazy load to avoid web issues)
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
      const module = await import('capacitor-background-step');
      Backgroundstep = module.Backgroundstep;
      this.initialized = true;
      console.log('[BackgroundStep] Plugin initialized');
      return true;
    } catch (e) {
      console.error('[BackgroundStep] Failed to load plugin:', e);
      return false;
    }
  }

  /**
   * Request activity permission and start the background service.
   * This shows the native permission dialog and then starts the
   * foreground service which displays a persistent notification.
   */
  async requestPermissionAndStart(): Promise<BackgroundStepResult> {
    if (!this.isNative()) {
      return { success: false, error: 'Not on native platform' };
    }

    const initResult = await this.initialize();
    if (!initResult || !Backgroundstep) {
      return { success: false, error: 'Plugin not available' };
    }

    try {
      console.log('[BackgroundStep] Requesting permission...');
      
      // This shows the native permission dialog for ACTIVITY_RECOGNITION
      const permResult = await Backgroundstep.checkAndRequestPermission();
      console.log('[BackgroundStep] Permission result:', permResult);
      
      if (!permResult.granted) {
        return { 
          success: false, 
          error: 'Activity recognition permission denied. Please enable in Settings > Apps > HotStepper > Permissions.' 
        };
      }

      // Start the background service (shows persistent notification)
      console.log('[BackgroundStep] Starting background service...');
      await Backgroundstep.serviceStart();
      this.serviceRunning = true;
      
      console.log('[BackgroundStep] ✅ Background service started successfully!');
      return { success: true };
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      console.error('[BackgroundStep] Failed to start:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Get today's total step count from the background service
   */
  async getTodaySteps(): Promise<number> {
    if (!this.initialized || !Backgroundstep) {
      return 0;
    }

    try {
      const result = await Backgroundstep.getToday();
      const steps = result?.stepCount ?? result?.steps ?? 0;
      console.log('[BackgroundStep] Today steps:', steps);
      return steps;
    } catch (e) {
      console.error('[BackgroundStep] Failed to get today steps:', e);
      return 0;
    }
  }

  /**
   * Get step count for a specific date range
   * @param startDate - Start date in ISO format (YYYY-MM-DD)
   * @param endDate - End date in ISO format (YYYY-MM-DD)
   */
  async getStepsForDateRange(startDate: string, endDate: string): Promise<number> {
    if (!this.initialized || !Backgroundstep) {
      return 0;
    }

    try {
      const result = await Backgroundstep.getStepData({
        sDateTime: startDate,
        eDateTime: endDate
      });
      return result?.stepCount ?? result?.steps ?? 0;
    } catch (e) {
      console.error('[BackgroundStep] Failed to get step range:', e);
      return 0;
    }
  }

  /**
   * Stop the background step tracking service
   */
  async stop(): Promise<void> {
    if (!this.initialized || !Backgroundstep) {
      return;
    }

    try {
      await Backgroundstep.serviceStop();
      this.serviceRunning = false;
      console.log('[BackgroundStep] Service stopped');
    } catch (e) {
      console.error('[BackgroundStep] Stop error:', e);
    }
  }
}

export const backgroundStepService = new BackgroundStepService();
