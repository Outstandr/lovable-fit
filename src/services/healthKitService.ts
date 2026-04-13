import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Apple Health / HealthKit Service
 * 
 * Uses a custom native Swift plugin (HealthKitPlugin.swift) that directly
 * reads from Apple's HKHealthStore. This aggregates step data from:
 * - iPhone's CMPedometer
 * - Apple Watch
 * - Garmin Connect (if user has Apple Health sync enabled)
 * - WHOOP (if user has Apple Health sync enabled)
 * - Any other HealthKit-connected source
 */

interface HealthKitPluginAPI {
  isAvailable(): Promise<{ available: boolean }>;
  requestAuthorization(): Promise<{ success: boolean }>;
  queryTodaySteps(): Promise<{ steps: number }>;
  queryStepsForRange(options: { startMs: number; endMs: number }): Promise<{ steps: number }>;
}

const HealthKitPlugin = registerPlugin<HealthKitPluginAPI>('HealthKitPlugin');

const HK_CONNECTED_KEY = 'healthkit_connected';

class HealthKitService {
  /**
   * Check if we're on iOS
   */
  isSupported(): boolean {
    return Capacitor.getPlatform() === 'ios';
  }

  /**
   * Check if user has previously connected Apple Health
   */
  isConnected(): boolean {
    return localStorage.getItem(HK_CONNECTED_KEY) === 'true';
  }

  /**
   * Request Apple Health authorization for step reading
   */
  async requestAuthorization(): Promise<{ success: boolean; error?: string }> {
    if (!this.isSupported()) {
      return { success: false, error: 'Apple Health is only available on iOS' };
    }

    try {
      // Check availability
      const { available } = await HealthKitPlugin.isAvailable();
      console.log('[HealthKit] Available:', available);

      if (!available) {
        return { success: false, error: 'Apple Health is not available on this device' };
      }

      // Request authorization
      console.log('[HealthKit] Requesting authorization...');
      const result = await HealthKitPlugin.requestAuthorization();
      
      localStorage.setItem(HK_CONNECTED_KEY, 'true');
      console.log('[HealthKit] ✅ Authorization completed:', result);
      return { success: true };
    } catch (e: any) {
      console.error('[HealthKit] Authorization failed:', e);
      return { success: false, error: e.message || 'Failed to connect to Apple Health' };
    }
  }

  /**
   * Disconnect Apple Health (clears local state only)
   */
  disconnect(): void {
    localStorage.removeItem(HK_CONNECTED_KEY);
    console.log('[HealthKit] Disconnected');
  }

  /**
   * Get today's total step count from HealthKit (aggregated from ALL sources)
   */
  async getTodaySteps(): Promise<number> {
    if (!this.isSupported() || !this.isConnected()) return 0;

    try {
      const { steps } = await HealthKitPlugin.queryTodaySteps();
      console.log(`[HealthKit] Today's steps (all sources): ${steps}`);
      return steps;
    } catch (e) {
      console.error('[HealthKit] Failed to read today steps:', e);
      return 0;
    }
  }

  /**
   * Get steps for a specific date range
   */
  async getStepsForRange(startMs: number, endMs: number): Promise<number> {
    if (!this.isSupported() || !this.isConnected()) return 0;

    try {
      const { steps } = await HealthKitPlugin.queryStepsForRange({ startMs, endMs });
      return steps;
    } catch (e) {
      console.error('[HealthKit] Range query failed:', e);
      return 0;
    }
  }
}

export const healthKitService = new HealthKitService();
