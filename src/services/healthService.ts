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
  private permissionsGranted: boolean = false;
  private currentSteps: number = 0;
  private currentDistance: number = 0;
  private isTracking: boolean = false;
  private measurementListener: any = null;

  constructor() {
    const nativePlatform = Capacitor.getPlatform();
    this.platform = nativePlatform === 'ios' ? 'ios' : 
                    nativePlatform === 'android' ? 'android' : 'web';
    
    this.permissionsGranted = false;
    console.log('[HealthService] Initialized with Pedometer plugin - platform:', this.platform);
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
      console.log('[HealthService] Requesting ACTIVITY_RECOGNITION permission...');

      const { CapacitorPedometer } = await import('@capgo/capacitor-pedometer');

      // Directly request permission - this should trigger the system dialog when needed
      console.log('[HealthService] Requesting physical activity permission...');
      const requestResult = await CapacitorPedometer.requestPermissions();
      console.log('[HealthService] Permission request result:', requestResult);

      if (requestResult?.activityRecognition === 'granted') {
        this.permissionsGranted = true;
        await this.startTracking();
        return true;
      } else {
        console.log('[HealthService] Permission not granted by user');
        this.permissionsGranted = false;
        return false;
      }
    } catch (error) {
      console.error('[HealthService] Error requesting permissions:', error);
      this.permissionsGranted = false;
      return false;
    }
  }

  // Backward compatibility methods
  async requestAndroidPermissions(): Promise<boolean> {
    return this.requestPermissions();
  }

  private async startTracking(): Promise<void> {
    if (this.isTracking) {
      console.log('[HealthService] startTracking: Already tracking, skipping re-init');
      return;
    }

    console.log('[HealthService] === STEP COUNTER INITIALIZATION ===');
    console.log('[HealthService] Platform:', this.platform);

    try {
      console.log('[HealthService] Loading CapacitorPedometer plugin...');
      const { CapacitorPedometer } = await import('@capgo/capacitor-pedometer');
      console.log('[HealthService] CapacitorPedometer plugin loaded');
      
      // Check if pedometer / step counter is available
      const availability = await CapacitorPedometer.isAvailable();
      console.log('[HealthService] Pedometer availability object:', availability);
      console.log('[HealthService] Step counter available:', availability?.stepCounting);
      
      if (!availability?.stepCounting) {
        console.warn('[HealthService] Step counting not available on this device - falling back to 0 steps');
        return;
      }

      // Add listener for real-time updates
      console.log('[HealthService] Registering measurement listener...');
      this.measurementListener = await CapacitorPedometer.addListener('measurement', (data) => {
        try {
          console.log('[HealthService] onSensorChanged / measurement event:', data);
          const steps = data?.numberOfSteps ?? 0;
          const distanceMeters = data?.distance ?? 0;
          
          this.currentSteps = steps;
          this.currentDistance = distanceMeters / 1000; // Convert to km
          
          console.log('[HealthService] Updated internal state -> steps:', this.currentSteps, 'distanceKm:', this.currentDistance);
        } catch (listenerError) {
          console.error('[HealthService] Error inside measurement listener:', listenerError);
        }
      });
      console.log('[HealthService] Measurement listener registered:', !!this.measurementListener);

      // Start measurement updates
      console.log('[HealthService] Starting measurement updates...');
      await CapacitorPedometer.startMeasurementUpdates();
      this.isTracking = true;
      console.log('[HealthService] Started real-time step tracking (isTracking = true)');
    } catch (error) {
      console.error('[HealthService] Error starting tracking (startTracking):', error);
    }
  }

  async stopTracking(): Promise<void> {
    if (!this.isTracking) return;

    try {
      const { CapacitorPedometer } = await import('@capgo/capacitor-pedometer');
      await CapacitorPedometer.stopMeasurementUpdates();
      
      if (this.measurementListener) {
        await this.measurementListener.remove();
        this.measurementListener = null;
      }
      
      this.isTracking = false;
      console.log('[HealthService] Stopped step tracking');
    } catch (error) {
      console.error('[HealthService] Error stopping tracking:', error);
    }
  }

  // Check if permissions were granted this session
  checkAndroidPermissions(): boolean {
    return this.permissionsGranted;
  }
  
  hasAndroidPermissions(): boolean {
    return this.permissionsGranted;
  }

  setAndroidPermissionsGranted(granted: boolean): void {
    this.permissionsGranted = granted;
  }

  async getSteps(startDate: Date, endDate: Date): Promise<number> {
    if (!this.isNative()) {
      return 0;
    }

    // Return current tracked steps
    // Note: Pedometer tracks steps since startMeasurementUpdates was called
    return this.currentSteps;
  }

  private async getAndroidSteps(startDate: Date, endDate: Date): Promise<number> {
    if (!this.permissionsGranted) {
      console.log('[HealthService] Skipping steps - no permission granted');
      return 0;
    }
    return this.currentSteps;
  }

  async getDistance(startDate: Date, endDate: Date): Promise<number> {
    if (!this.isNative()) {
      return 0;
    }
    return this.currentDistance;
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
    if (this.platform !== 'web' && !this.permissionsGranted) {
      console.log('[HealthService] getHealthData: No permission - returning zeros');
      return { steps: 0, distance: 0, calories: 0 };
    }

    const steps = await this.getSteps(startDate, endDate);
    let distance = this.currentDistance;
    
    // Fallback to calculated distance if not available
    if (distance === 0 && steps > 0) {
      distance = this.calculateDistanceFromSteps(steps);
    }
    
    const calories = this.calculateCalories(steps);
    
    return { steps, distance, calories };
  }

  // Get current step count (real-time)
  getCurrentSteps(): number {
    return this.currentSteps;
  }

  getCurrentDistance(): number {
    return this.currentDistance;
  }
}

export const healthService = new HealthService();
