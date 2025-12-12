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
  private androidPermissionsGranted: boolean = false;
  private healthConnectChecked: boolean = false;

  constructor() {
    const nativePlatform = Capacitor.getPlatform();
    this.platform = nativePlatform === 'ios' ? 'ios' : 
                    nativePlatform === 'android' ? 'android' : 'web';
    
    // IMPORTANT: Always start with false - never call any Health Connect API 
    // until user explicitly requests permissions via button tap
    this.androidPermissionsGranted = false;
    console.log('[HealthService] Initialized - Android permissions: false (safe mode)');
  }

  getPlatform(): Platform {
    return this.platform;
  }

  isNative(): boolean {
    return this.platform !== 'web';
  }

  // ONLY call this from requestAndroidPermissions after user taps button
  // Never call this on app startup - it can trigger native code that crashes
  private async checkHealthConnectAvailability(): Promise<boolean> {
    if (this.platform !== 'android') return false;
    
    try {
      const { HealthConnect } = await import('@pianissimoproject/capacitor-health-connect');
      const result = await HealthConnect.checkAvailability();
      const isAvailable = result.availability === 'Available';
      this.healthConnectChecked = true;
      console.log('[HealthService] Health Connect availability:', result.availability);
      return isAvailable;
    } catch (error) {
      console.log('[HealthService] Health Connect availability check failed:', error);
      this.healthConnectChecked = true;
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
        // iOS HealthKit not supported in this build (Android-only)
        console.log('[HealthService] iOS HealthKit not available in this build');
        return false;
      } else if (this.platform === 'android') {
        return await this.requestAndroidPermissions();
      }
      return false;
    } catch (error) {
      console.error('[HealthService] Error requesting permissions:', error);
      return false;
    }
  }

  private async requestAndroidPermissions(): Promise<boolean> {
    console.log('[HealthService] requestAndroidPermissions called by user');
    
    try {
      // First, request ACTIVITY_RECOGNITION runtime permission (required for Health Connect)
      await this.requestActivityRecognitionPermission();
      
      // Check Health Connect availability - this is ONLY called when user taps button
      const available = await this.checkHealthConnectAvailability();
      if (!available) {
        console.log('[HealthService] Health Connect not available on this device');
        this.androidPermissionsGranted = false;
        return false;
      }

      const { HealthConnect } = await import('@pianissimoproject/capacitor-health-connect');
      
      console.log('[HealthService] Opening Health Connect permission dialog...');
      const result = await HealthConnect.requestHealthPermissions({
        read: ['Steps', 'ActiveCaloriesBurned'],
        write: []
      });
      
      this.androidPermissionsGranted = result.hasAllPermissions;
      console.log('[HealthService] User granted permissions:', result.hasAllPermissions);
      
      return result.hasAllPermissions;
    } catch (error) {
      console.error('[HealthService] Android permission error:', error);
      this.androidPermissionsGranted = false;
      return false;
    }
  }

  private async requestActivityRecognitionPermission(): Promise<void> {
    // ACTIVITY_RECOGNITION permission is declared in AndroidManifest.xml
    // Health Connect automatically handles requesting this permission when needed
    console.log('[HealthService] ACTIVITY_RECOGNITION: Health Connect will request if needed');
  }

  // Check if Android permissions were granted this session
  // IMPORTANT: This does NOT call any native API to prevent crashes
  checkAndroidPermissions(): boolean {
    return this.androidPermissionsGranted;
  }
  
  hasAndroidPermissions(): boolean {
    return this.androidPermissionsGranted;
  }

  // Mark permissions as granted (for internal use)
  setAndroidPermissionsGranted(granted: boolean): void {
    this.androidPermissionsGranted = granted;
  }

  async getSteps(startDate: Date, endDate: Date): Promise<number> {
    if (!this.isNative()) {
      return 0;
    }

    try {
      if (this.platform === 'ios') {
        // iOS not supported in this build
        return 0;
      } else if (this.platform === 'android') {
        return await this.getAndroidSteps(startDate, endDate);
      }
      return 0;
    } catch (error) {
      console.error('[HealthService] Error getting steps:', error);
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
      return 0;
    }
  }

  async getDistance(startDate: Date, endDate: Date): Promise<number> {
    if (!this.isNative()) {
      return 0;
    }

    // Android Health Connect doesn't have a direct distance record type
    // We'll calculate from steps instead
    return 0;
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
