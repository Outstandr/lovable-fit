import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';

/**
 * Apple Health / HealthKit Service
 * 
 * Uses @capgo/capacitor-health which wraps Apple's HKHealthStore.
 * Reads step count aggregated from ALL sources:
 * - iPhone's CMPedometer
 * - Apple Watch
 * - Garmin Connect (if user has Apple Health sync enabled)
 * - WHOOP (if user has Apple Health sync enabled)
 * - Any other HealthKit-connected source
 */

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
      const avail = await Health.isAvailable();
      console.log('[HealthKit] Available:', JSON.stringify(avail));

      // Request authorization — triggers HealthKit permission dialog
      console.log('[HealthKit] Requesting authorization...');
      const status = await Health.requestAuthorization({
        read: ['steps', 'distance', 'flightsClimbed'],
      });

      localStorage.setItem(HK_CONNECTED_KEY, 'true');
      console.log('[HealthKit] ✅ Authorization completed:', JSON.stringify(status));
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
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

      const result = await Health.queryAggregated({
        dataType: 'steps',
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
        bucket: 'day',
        aggregation: 'sum',
      });

      const steps = result?.samples?.[0]?.value || 0;
      console.log(`[HealthKit] Today's steps (all sources): ${steps}`);
      return Math.round(steps);
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
      const result = await Health.queryAggregated({
        dataType: 'steps',
        startDate: new Date(startMs).toISOString(),
        endDate: new Date(endMs).toISOString(),
        bucket: 'day',
        aggregation: 'sum',
      });

      const total = (result?.samples || []).reduce((sum: number, s: any) => sum + (s.value || 0), 0);
      return Math.round(total);
    } catch (e) {
      console.error('[HealthKit] Range query failed:', e);
      return 0;
    }
  }
}

export const healthKitService = new HealthKitService();
