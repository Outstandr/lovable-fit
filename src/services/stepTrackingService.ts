import { Capacitor } from '@capacitor/core';
import { backgroundStepService, type StepData } from './backgroundStepService';
import { iosStepService } from './iosStepService';

/**
 * Platform-aware Step Tracking Service
 * 
 * Routes to the correct implementation based on platform:
 * - Android: Uses backgroundStepService (foreground service + pedometer)
 * - iOS: Uses iosStepService (CMPedometer, no foreground service)
 * - Web: Returns unavailable
 * 
 * This provides a unified API for step tracking across all platforms.
 */

export type { StepData };

export interface StepTrackingResult {
  success: boolean;
  error?: string;
}

export type StepCallback = (data: StepData) => void;

class StepTrackingService {
  private platform: 'ios' | 'android' | 'web';

  constructor() {
    this.platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
    console.log(`[StepTrackingService] Initialized on platform: ${this.platform}`);
  }

  /**
   * Check if running on a native platform
   */
  isNative(): boolean {
    return this.platform === 'ios' || this.platform === 'android';
  }

  /**
   * Get current platform
   */
  getPlatform(): 'ios' | 'android' | 'web' {
    return this.platform;
  }

  /**
   * Check if step tracking is currently running
   */
  isRunning(): boolean {
    if (this.platform === 'android') {
      return backgroundStepService.isRunning();
    }
    if (this.platform === 'ios') {
      return iosStepService.isRunning();
    }
    return false;
  }

  /**
   * Request permission and start step tracking
   */
  async requestPermissionAndStart(callback?: StepCallback): Promise<StepTrackingResult> {
    if (this.platform === 'android') {
      const result = await backgroundStepService.requestPermissionAndStart(callback);
      return { success: result.success, error: result.error };
    }

    if (this.platform === 'ios') {
      const result = await iosStepService.requestPermissionAndStart(callback);
      return { success: result.success, error: result.error };
    }

    // Web platform
    return { success: false, error: 'Step tracking requires native mobile app' };
  }

  /**
   * Subscribe to step updates (if tracking is already running)
   */
  subscribeToUpdates(callback: StepCallback): void {
    if (this.platform === 'android') {
      backgroundStepService.subscribeToUpdates(callback);
    } else if (this.platform === 'ios') {
      iosStepService.subscribeToUpdates(callback);
    }
  }

  /**
   * Get the last known step count
   */
  getLastSteps(): number {
    if (this.platform === 'android') {
      return backgroundStepService.getLastSteps();
    }
    if (this.platform === 'ios') {
      return iosStepService.getLastSteps();
    }
    return 0;
  }

  /**
   * Stop step tracking
   */
  async stop(): Promise<void> {
    if (this.platform === 'android') {
      await backgroundStepService.stop();
    } else if (this.platform === 'ios') {
      await iosStepService.stop();
    }
  }
}

export const stepTrackingService = new StepTrackingService();
