import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { pedometerService } from '@/services/pedometerService';

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

  async checkAllPermissions(): Promise<PermissionState> {
    console.log('[PermissionManager] Checking all permissions...');
    
    if (!Capacitor.isNativePlatform()) {
      this.state = { activity: 'granted', location: 'granted' };
      return this.state;
    }

    try {
      const activityGranted = await pedometerService.checkPermission();
      this.state.activity = activityGranted ? 'granted' : 'prompt';
      
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

  async requestAllPermissions(): Promise<boolean> {
    console.log('[PermissionManager] === STARTING PERMISSION FLOW ===');
    
    if (!Capacitor.isNativePlatform()) {
      console.log('[PermissionManager] Web platform, auto-granting');
      this.state = { activity: 'granted', location: 'granted' };
      return true;
    }

    try {
      // STEP 1: Request Activity Permission by starting the pedometer
      // The @tubbly plugin triggers the permission dialog when start() is called
      console.log('[PermissionManager] STEP 1: Starting pedometer (triggers activity permission)...');
      
      const activityGranted = await pedometerService.start();
      this.state.activity = activityGranted ? 'granted' : 'denied';
      
      console.log(`[PermissionManager] Activity permission: ${this.state.activity}`);
      
      if (!activityGranted) {
        console.error('[PermissionManager] ❌ Activity permission denied, stopping flow');
        return false;
      }

      // Wait 800ms between permission requests (prevents Android crash and allows first dialog to close)
      console.log('[PermissionManager] Waiting 800ms before location request...');
      await this.delay(800);

      // STEP 2: Request Location Permission
      console.log('[PermissionManager] STEP 2: Requesting location permission...');
      
      const locationResult = await Geolocation.requestPermissions();
      const locationGranted = locationResult.location === 'granted' || 
                             locationResult.coarseLocation === 'granted';
      
      this.state.location = locationGranted ? 'granted' : 'denied';
      
      console.log(`[PermissionManager] Location permission: ${this.state.location}`);
      console.log(`[PermissionManager] Location result details:`, locationResult);
      
      if (!locationGranted) {
        console.error('[PermissionManager] ❌ Location permission denied');
        console.error('[PermissionManager] Location result was:', locationResult);
        return false;
      }

      console.log('[PermissionManager] ✅ ALL PERMISSIONS GRANTED');
      return true;

    } catch (error) {
      console.error('[PermissionManager] ❌ Permission flow error:', error);
      return false;
    }
  }

  getState(): PermissionState {
    return { ...this.state };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const permissionManager = new PermissionManager();
