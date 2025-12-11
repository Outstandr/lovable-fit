import { Capacitor } from '@capacitor/core';

export type Platform = 'ios' | 'android' | 'web';

export interface HealthData {
  steps: number;
  distance: number; // in km
  calories: number;
}

// Average step length in meters (adjustable based on user profile)
const AVG_STEP_LENGTH_M = 0.762;
// Average calories per step (adjustable based on user weight)
const CALORIES_PER_STEP = 0.04;

class HealthService {
  private platform: Platform;

  constructor() {
    const nativePlatform = Capacitor.getPlatform();
    this.platform = nativePlatform === 'ios' ? 'ios' : 
                    nativePlatform === 'android' ? 'android' : 'web';
  }

  getPlatform(): Platform {
    return this.platform;
  }

  isNative(): boolean {
    return this.platform !== 'web';
  }

  async requestPermissions(): Promise<boolean> {
    if (!this.isNative()) {
      console.log('[HealthService] Web platform - no health permissions needed');
      return false;
    }

    try {
      if (this.platform === 'ios') {
        return await this.requestiOSPermissions();
      } else if (this.platform === 'android') {
        return await this.requestAndroidPermissions();
      }
      return false;
    } catch (error) {
      console.error('[HealthService] Error requesting permissions:', error);
      return false;
    }
  }

  private async requestiOSPermissions(): Promise<boolean> {
    try {
      const { CapacitorHealthkit } = await import('@perfood/capacitor-healthkit');
      await CapacitorHealthkit.requestAuthorization({
        all: [],
        read: ['stepCount', 'distanceWalkingRunning', 'activeEnergyBurned'],
        write: []
      });
      return true;
    } catch (error) {
      console.error('[HealthService] iOS permission error:', error);
      return false;
    }
  }

  private async requestAndroidPermissions(): Promise<boolean> {
    try {
      const { HealthConnect } = await import('@pianissimoproject/capacitor-health-connect');
      const result = await HealthConnect.requestHealthPermissions({
        read: ['Steps', 'ActiveCaloriesBurned'],
        write: []
      });
      return result.hasAllPermissions;
    } catch (error) {
      console.error('[HealthService] Android permission error:', error);
      return false;
    }
  }

  async getSteps(startDate: Date, endDate: Date): Promise<number> {
    if (!this.isNative()) {
      return 0;
    }

    try {
      if (this.platform === 'ios') {
        return await this.getiOSSteps(startDate, endDate);
      } else if (this.platform === 'android') {
        return await this.getAndroidSteps(startDate, endDate);
      }
      return 0;
    } catch (error) {
      console.error('[HealthService] Error getting steps:', error);
      return 0;
    }
  }

  private async getiOSSteps(startDate: Date, endDate: Date): Promise<number> {
    try {
      const { CapacitorHealthkit } = await import('@perfood/capacitor-healthkit');
      const result = await CapacitorHealthkit.queryHKitSampleType<{ value: number }>({
        sampleName: 'stepCount',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 0
      });
      
      // Sum up all step counts
      let totalSteps = 0;
      if (result && result.resultData) {
        for (const entry of result.resultData) {
          totalSteps += entry.value || 0;
        }
      }
      return totalSteps;
    } catch (error) {
      console.error('[HealthService] iOS steps error:', error);
      return 0;
    }
  }

  private async getAndroidSteps(startDate: Date, endDate: Date): Promise<number> {
    try {
      const { HealthConnect } = await import('@pianissimoproject/capacitor-health-connect');
      const result = await HealthConnect.readRecords({
        type: 'Steps',
        timeRangeFilter: {
          type: 'between',
          startTime: startDate,
          endTime: endDate
        }
      });
      
      // Sum up all step counts
      let totalSteps = 0;
      if (result && result.records) {
        for (const record of result.records) {
          if (record.type === 'Steps') {
            totalSteps += record.count || 0;
          }
        }
      }
      return totalSteps;
    } catch (error) {
      console.error('[HealthService] Android steps error:', error);
      return 0;
    }
  }

  async getDistance(startDate: Date, endDate: Date): Promise<number> {
    if (!this.isNative()) {
      return 0;
    }

    try {
      if (this.platform === 'ios') {
        return await this.getiOSDistance(startDate, endDate);
      }
      // Android Health Connect doesn't have a direct distance record type
      // We'll calculate from steps instead
      return 0;
    } catch (error) {
      console.error('[HealthService] Error getting distance:', error);
      return 0;
    }
  }

  private async getiOSDistance(startDate: Date, endDate: Date): Promise<number> {
    try {
      const { CapacitorHealthkit } = await import('@perfood/capacitor-healthkit');
      const result = await CapacitorHealthkit.queryHKitSampleType<{ value: number }>({
        sampleName: 'distanceWalkingRunning',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 0
      });
      
      let totalDistance = 0;
      if (result && result.resultData) {
        for (const entry of result.resultData) {
          totalDistance += entry.value || 0;
        }
      }
      // Convert meters to km
      return totalDistance / 1000;
    } catch (error) {
      console.error('[HealthService] iOS distance error:', error);
      return 0;
    }
  }

  // Calculate distance from steps if native distance isn't available
  calculateDistanceFromSteps(steps: number): number {
    const distanceMeters = steps * AVG_STEP_LENGTH_M;
    return Math.round((distanceMeters / 1000) * 100) / 100; // Round to 2 decimals
  }

  // Calculate calories from steps
  calculateCalories(steps: number): number {
    return Math.round(steps * CALORIES_PER_STEP);
  }

  // Get all health data for a date range
  async getHealthData(startDate: Date, endDate: Date): Promise<HealthData> {
    const steps = await this.getSteps(startDate, endDate);
    let distance = await this.getDistance(startDate, endDate);
    
    // Fallback to calculated distance if not available
    if (distance === 0 && steps > 0) {
      distance = this.calculateDistanceFromSteps(steps);
    }
    
    const calories = this.calculateCalories(steps);
    
    return { steps, distance, calories };
  }
}

export const healthService = new HealthService();
