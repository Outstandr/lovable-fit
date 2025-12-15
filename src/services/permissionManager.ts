import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { pedometerService } from '@/services/pedometerService';

export type PermissionType = 'activity' | 'location';
export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown';

export interface PermissionState {
  activity: PermissionStatus;
  location: PermissionStatus;
}

class PermissionManager {
  private state: PermissionState = {
    activity: 'unknown',
    location: 'unknown'
  };

  /**
   * Check all permissions without requesting
   */
  async checkAllPermissions(): Promise<PermissionState> {
    console.log('[PermissionManager] Checking all permissions...');
    
    if (!Capacitor.isNativePlatform()) {
      this.state = { activity: 'granted', location: 'granted' };
      return this.state;
    }

    try {
      // Check activity permission
      const activityGranted = await pedometerService.checkPermission();
      this.state.activity = activityGranted ? 'granted' : 'prompt';
      
      // Check location permission
      const locationStatus = await Geolocation.checkPermissions();
      this.state.location = locationStatus.location === 'granted' ? 'granted' : 
                           locationStatus.location === 'denied' ? 'denied' : 'prompt';
      
      console.log('[PermissionManager] Permission state:', this.state);
      return this.state;
    } catch (error) {
      console.error('[PermissionManager] Error checking permissions:', error);
      return this.state;
    }
  }

  /**
   * Request activity permission first, then location
   * Returns true only if BOTH are granted
   */
  async requestAllPermissions(): Promise<boolean> {
    console.log('[PermissionManager] === STARTING PERMISSION FLOW ===');
    
    if (!Capacitor.isNativePlatform()) {
      console.log('[PermissionManager] Web platform, auto-granting');
      this.state = { activity: 'granted', location: 'granted' };
      return true;
    }

    try {
      // STEP 1: Request Physical Activity Permission
      console.log('[PermissionManager] STEP 1: Requesting physical activity permission...');
      
      const activityGranted = await pedometerService.requestPermission();
      this.state.activity = activityGranted ? 'granted' : 'denied';
      
      console.log(`[PermissionManager] Activity permission: ${this.state.activity}`);
      
      if (!activityGranted) {
        console.error('[PermissionManager] ❌ Activity permission denied, stopping flow');
        return false;
      }

      // Wait 500ms between permission requests (prevents Android crash)
      console.log('[PermissionManager] Waiting 500ms before location request...');
      await this.delay(500);

      // STEP 2: Request Location Permission
      console.log('[PermissionManager] STEP 2: Requesting location permission...');
      
      const locationResult = await Geolocation.requestPermissions();
      const locationGranted = locationResult.location === 'granted' || 
                             locationResult.coarseLocation === 'granted';
      
      this.state.location = locationGranted ? 'granted' : 'denied';
      
      console.log(`[PermissionManager] Location permission: ${this.state.location}`);
      
      if (!locationGranted) {
        console.error('[PermissionManager] ❌ Location permission denied');
        return false;
      }

      console.log('[PermissionManager] ✅ ALL PERMISSIONS GRANTED');
      return true;

    } catch (error) {
      console.error('[PermissionManager] ❌ Permission flow error:', error);
      return false;
    }
  }

  /**
   * Request only activity permission
   */
  async requestActivityPermission(): Promise<boolean> {
    console.log('[PermissionManager] Requesting activity permission...');
    
    if (!Capacitor.isNativePlatform()) {
      this.state.activity = 'granted';
      return true;
    }

    try {
      const granted = await pedometerService.requestPermission();
      this.state.activity = granted ? 'granted' : 'denied';
      console.log(`[PermissionManager] Activity permission: ${this.state.activity}`);
      return granted;
    } catch (error) {
      console.error('[PermissionManager] Activity permission error:', error);
      this.state.activity = 'denied';
      return false;
    }
  }

  /**
   * Request only location permission
   */
  async requestLocationPermission(): Promise<boolean> {
    console.log('[PermissionManager] Requesting location permission...');
    
    if (!Capacitor.isNativePlatform()) {
      this.state.location = 'granted';
      return true;
    }

    try {
      const result = await Geolocation.requestPermissions();
      const granted = result.location === 'granted' || result.coarseLocation === 'granted';
      this.state.location = granted ? 'granted' : 'denied';
      console.log(`[PermissionManager] Location permission: ${this.state.location}`);
      return granted;
    } catch (error) {
      console.error('[PermissionManager] Location permission error:', error);
      this.state.location = 'denied';
      return false;
    }
  }

  /**
   * Get current permission state
   */
  getState(): PermissionState {
    return { ...this.state };
  }

  /**
   * Helper: delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const permissionManager = new PermissionManager();
