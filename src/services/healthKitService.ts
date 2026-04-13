import { Capacitor } from '@capacitor/core';

// Lazy import to avoid crash on web/android
let Health: any = null;

/**
 * Apple Health / HealthKit Service
 * 
 * Reads step count from HealthKit which aggregates data from:
 * - iPhone's CMPedometer
 * - Apple Watch
 * - Garmin Connect (if user has Apple Health sync enabled)
 * - WHOOP (if user has Apple Health sync enabled)
 * - Any other HealthKit-connected source
 * 
 * This gives us the TRUE total daily steps regardless of device.
 */

const HK_CONNECTED_KEY = 'healthkit_connected';

class HealthKitService {
  private initialized = false;
  private available = false;
  private authorized = false;

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
   * Initialize the plugin (lazy load)
   */
  private async ensurePlugin(): Promise<boolean> {
    if (!this.isSupported()) return false;
    
    if (!Health) {
      try {
        const mod = await import('@capgo/capacitor-health');
        Health = mod.Health;
      } catch (e) {
        console.error('[HealthKit] Failed to import plugin:', e);
        return false;
      }
    }

    if (!this.initialized) {
      try {
        const result = await Health.isAvailable();
        this.available = result.available;
        this.initialized = true;
        console.log('[HealthKit] Available:', this.available);
      } catch (e) {
        console.error('[HealthKit] Availability check failed:', e);
        this.available = false;
      }
    }

    return this.available;
  }

  /**
   * Request Apple Health authorization for step reading
   */
  async requestAuthorization(): Promise<{ success: boolean; error?: string }> {
    const available = await this.ensurePlugin();
    if (!available) {
      return { success: false, error: 'Apple Health is not available on this device' };
    }

    try {
      const status = await Health.requestAuthorization({
        read: ['steps', 'distance', 'flightsClimbed'],
      });

      // HealthKit doesn't tell us if user denied — it just returns empty reads
      // We assume success after the prompt
      this.authorized = true;
      localStorage.setItem(HK_CONNECTED_KEY, 'true');
      console.log('[HealthKit] ✅ Authorization granted, status:', status);
      return { success: true };
    } catch (e: any) {
      console.error('[HealthKit] Authorization failed:', e);
      return { success: false, error: e.message || 'Authorization failed' };
    }
  }

  /**
   * Disconnect Apple Health (clears local state only)
   */
  disconnect(): void {
    this.authorized = false;
    localStorage.removeItem(HK_CONNECTED_KEY);
    console.log('[HealthKit] Disconnected (local state cleared)');
  }

  /**
   * Get today's total step count from HealthKit (aggregated from ALL sources)
   */
  async getTodaySteps(): Promise<number> {
    const available = await this.ensurePlugin();
    if (!available || !this.isConnected()) return 0;

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
    const available = await this.ensurePlugin();
    if (!available || !this.isConnected()) return 0;

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
