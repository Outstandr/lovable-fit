import { Capacitor, registerPlugin } from '@capacitor/core';

interface PedometerPlugin {
  startCounting(): Promise<void>;
  stopCounting(): Promise<void>;
  getStepCount(): Promise<{ count: number }>;
  checkPermissions(): Promise<{ activityRecognition: string }>;
  requestPermissions(): Promise<{ activityRecognition: string }>;
  addListener(eventName: string, callback: (data: any) => void): Promise<any>;
  removeAllListeners(): Promise<void>;
}

const CapacitorPedometer = registerPlugin<PedometerPlugin>('CapacitorPedometer');

// Ensure plugin is loaded
if (!CapacitorPedometer) {
  console.error('[Pedometer] CapacitorPedometer plugin not found!');
}

const LOG_PREFIX = '[Pedometer]';

class PedometerService {
  private currentSteps = 0;
  private currentDistance = 0;
  private isTracking = false;
  private hasPermission = false;
  private platform: 'android' | 'ios' | 'web';

  constructor() {
    this.platform = Capacitor.getPlatform() as 'android' | 'ios' | 'web';
    console.log(`${LOG_PREFIX} Initialized on platform: ${this.platform}`);
  }

  isNative(): boolean {
    const native = this.platform === 'android' || this.platform === 'ios';
    console.log(`${LOG_PREFIX} isNative: ${native} (platform: ${this.platform})`);
    return native;
  }

  getPlatform(): 'android' | 'ios' | 'web' {
    return this.platform;
  }

  async checkPermission(): Promise<boolean> {
    if (!this.isNative()) {
      console.log(`${LOG_PREFIX} checkPermission: Not native, returning false`);
      return false;
    }
    // This plugin doesn't have permission checking - permissions are handled at startCounting
    console.log(`${LOG_PREFIX} checkPermission: Plugin handles permissions at start`);
    return this.hasPermission;
  }

  async requestPermission(): Promise<boolean> {
    console.log(`${LOG_PREFIX} Requesting permissions...`);
    
    if (this.platform === 'web') {
      console.log(`${LOG_PREFIX} Web platform, no permissions needed`);
      return true;
    }

    // This plugin doesn't have explicit permission methods
    // Permissions are requested when startCounting is called
    // We'll try to start and stop to trigger permission request
    try {
      console.log(`${LOG_PREFIX} Triggering permission via startCounting...`);
      await CapacitorPedometer.startCounting();
      await CapacitorPedometer.stopCounting();
      this.hasPermission = true;
      console.log(`${LOG_PREFIX} Permission granted`);
      return true;
    } catch (error) {
      console.error(`${LOG_PREFIX} Permission denied or error:`, error);
      this.hasPermission = false;
      return false;
    }
  }

  async start(): Promise<boolean> {
    try {
      console.log(`${LOG_PREFIX} Starting tracking...`);

      if (this.platform === 'web') {
        console.log(`${LOG_PREFIX} Web platform, tracking not supported`);
        return false;
      }

      // Listen for real-time step count updates
      await CapacitorPedometer.addListener('stepCountChange', (data: any) => {
        console.log(`${LOG_PREFIX} 🚶 Step count event:`, data);
        if (data && typeof data.count === 'number') {
          this.currentSteps = data.count;
          this.currentDistance = this.calculateDistance(this.currentSteps);
          console.log(`${LOG_PREFIX} Updated: ${this.currentSteps} steps, ${this.currentDistance.toFixed(2)} km`);
        }
      });

      await CapacitorPedometer.startCounting();
      this.isTracking = true;
      this.hasPermission = true;
      console.log(`${LOG_PREFIX} ✅ Tracking started successfully with event listener`);
      
      return true;
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to start tracking:`, error);
      this.isTracking = false;
      return false;
    }
  }

  async stop(): Promise<void> {
    try {
      console.log(`${LOG_PREFIX} Stopping tracking...`);
      
      if (this.platform === 'web') {
        return;
      }

      await CapacitorPedometer.removeAllListeners();
      await CapacitorPedometer.stopCounting();
      this.isTracking = false;
      this.currentSteps = 0;
      this.currentDistance = 0;
      console.log(`${LOG_PREFIX} Tracking stopped and listeners removed`);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error stopping tracking:`, error);
    }
  }

  async fetchSteps(): Promise<number> {
    try {
      if (this.platform === 'web' || !this.isTracking) {
        console.log(`${LOG_PREFIX} Not tracking, returning 0`);
        return 0;
      }

      const result = await CapacitorPedometer.getStepCount();
      console.log(`${LOG_PREFIX} Step count from sensor:`, result.count);
      
      this.currentSteps = result.count || 0;
      this.currentDistance = this.calculateDistance(this.currentSteps);
      return this.currentSteps;
    } catch (error) {
      console.error(`${LOG_PREFIX} Error getting steps:`, error);
      return 0;
    }
  }

  private calculateDistance(steps: number): number {
    // Average stride length is about 0.762 meters (2.5 feet)
    const strideLength = 0.762;
    return (steps * strideLength) / 1000; // Convert to km
  }

  getSteps(): number {
    return this.currentSteps;
  }

  getDistance(): number {
    return this.currentDistance;
  }

  getCalories(): number {
    // Rough estimate: 0.04 calories per step
    return Math.round(this.currentSteps * 0.04);
  }

  getIsTracking(): boolean {
    return this.isTracking;
  }

  getHasPermission(): boolean {
    return this.hasPermission;
  }

  // For debugging
  getState() {
    return {
      platform: this.getPlatform(),
      isTracking: this.isTracking,
      hasPermission: this.hasPermission,
      steps: this.currentSteps,
      distance: this.currentDistance,
      calories: this.getCalories()
    };
  }
}

export const pedometerService = new PedometerService();
