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

// Storage key for persisting permission state
const ANDROID_PERMISSION_KEY = 'hotstepper_health_connect_granted';

class HealthService {
  private platform: Platform;
  private androidPermissionsGranted: boolean = false;
  private healthConnectAvailable: boolean | null = null;

  constructor() {
    const nativePlatform = Capacitor.getPlatform();
    this.platform = nativePlatform === 'ios' ? 'ios' : 
                    nativePlatform === 'android' ? 'android' : 'web';
    
    // Restore permission state from storage (for Android)
    if (this.platform === 'android') {
      try {
        const stored = localStorage.getItem(ANDROID_PERMISSION_KEY);
        // We default to false for safety - user must re-grant after app restart
        // This prevents crashes from stale permission state
        this.androidPermissionsGranted = false;
        console.log('[HealthService] Android permissions initialized to false (safe mode)');
      } catch (e) {
        this.androidPermissionsGranted = false;
      }
    }
  }

  getPlatform(): Platform {
    return this.platform;
  }

  isNative(): boolean {
    return this.platform !== 'web';
  }

  // Check if Health Connect is available on this device
  async isHealthConnectAvailable(): Promise<boolean> {
    if (this.platform !== 'android') return false;
    if (this.healthConnectAvailable !== null) return this.healthConnectAvailable;
    
    try {
      const { HealthConnect } = await import('@pianissimoproject/capacitor-health-connect');
      const result = await HealthConnect.checkAvailability();
      // The result has an 'availability' property, not 'available'
      const isAvailable = result.availability === 'Available';
      this.healthConnectAvailable = isAvailable;
      console.log('[HealthService] Health Connect availability:', result.availability);
      return isAvailable;
    } catch (error) {
      console.log('[HealthService] Health Connect availability check failed:', error);
      this.healthConnectAvailable = false;
      return false;
    }
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
      // First check if Health Connect is available
      const available = await this.isHealthConnectAvailable();
      if (!available) {
        console.log('[HealthService] Health Connect not available on this device');
        return false;
      }

      const { HealthConnect } = await import('@pianissimoproject/capacitor-health-connect');
      
      console.log('[HealthService] Requesting Health Connect permissions...');
      const result = await HealthConnect.requestHealthPermissions({
        read: ['Steps', 'ActiveCaloriesBurned'],
        write: []
      });
      
      this.androidPermissionsGranted = result.hasAllPermissions;
      
      // Persist permission state
      if (result.hasAllPermissions) {
        localStorage.setItem(ANDROID_PERMISSION_KEY, 'true');
      } else {
        localStorage.removeItem(ANDROID_PERMISSION_KEY);
      }
      
      console.log('[HealthService] Android permissions result:', result.hasAllPermissions);
      return result.hasAllPermissions;
    } catch (error) {
      console.error('[HealthService] Android permission error:', error);
      this.androidPermissionsGranted = false;
      localStorage.removeItem(ANDROID_PERMISSION_KEY);
      return false;
    }
  }

  // Check if Android permissions were granted this session
  // IMPORTANT: This does NOT call any native API to prevent crashes
  checkAndroidPermissions(): boolean {
    return this.androidPermissionsGranted;
  }
  
  hasAndroidPermissions(): boolean {
    return this.androidPermissionsGranted;
  }

  // Mark permissions as granted (call after successful native permission grant)
  setAndroidPermissionsGranted(granted: boolean): void {
    this.androidPermissionsGranted = granted;
    if (granted) {
      localStorage.setItem(ANDROID_PERMISSION_KEY, 'true');
    } else {
      localStorage.removeItem(ANDROID_PERMISSION_KEY);
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
    // CRITICAL GUARD: Never call Health Connect API without explicit permission
    // This prevents SecurityException crashes that kill the entire app
    if (!this.androidPermissionsGranted) {
      console.log('[HealthService] Skipping Android steps - no permission granted');
      return 0;
    }
    
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
      // Permission might have been revoked - reset state
      this.androidPermissionsGranted = false;
      localStorage.removeItem(ANDROID_PERMISSION_KEY);
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
    // For Android, only proceed if permissions are granted
    if (this.platform === 'android' && !this.androidPermissionsGranted) {
      console.log('[HealthService] getHealthData: No Android permission - returning zeros');
      return { steps: 0, distance: 0, calories: 0 };
    }

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
