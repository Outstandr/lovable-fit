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
    if (!this.isSupported()) {
      console.log('[HealthKit] Not on iOS platform');
      return false;
    }
    
    if (!Health) {
      try {
        const mod = await import('@capgo/capacitor-health');
        Health = mod.Health;
        console.log('[HealthKit] Plugin imported successfully');
      } catch (e) {
        console.error('[HealthKit] Failed to import plugin:', e);
        return false;
      }
    }

    return true;
  }

  /**
   * Request Apple Health authorization for step reading
   */
  async requestAuthorization(): Promise<{ success: boolean; error?: string }> {
    const pluginReady = await this.ensurePlugin();
    if (!pluginReady) {
      return { success: false, error: 'Apple Health plugin could not be loaded' };
    }

    try {
      // Check availability first (but don't block on it — some configs return false incorrectly)
      try {
        const avail = await Health.isAvailable();
        console.log('[HealthKit] Availability check:', JSON.stringify(avail));
      } catch (e) {
        console.log('[HealthKit] Availability check threw (proceeding anyway):', e);
      }

      // Request authorization — this is what actually triggers the HealthKit permission dialog
      console.log('[HealthKit] Requesting authorization...');
      const status = await Health.requestAuthorization({
        read: ['steps', 'distance', 'flightsClimbed'],
      });

      // HealthKit doesn't tell us if user denied — it just returns empty reads
      // We assume success after the prompt
      this.authorized = true;
      localStorage.setItem(HK_CONNECTED_KEY, 'true');
      console.log('[HealthKit] ✅ Authorization completed, status:', JSON.stringify(status));
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
