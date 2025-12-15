import { Capacitor, registerPlugin } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

// @tubbly/tubbly-capacitor-pedometer only has these 3 methods
interface PedometerPlugin {
  startCounting(): Promise<void>;
  stopCounting(): Promise<void>;
  getStepCount(): Promise<{ count: number }>;
}

const CapacitorPedometer = registerPlugin<PedometerPlugin>('CapacitorPedometer');

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
    return this.platform === 'android' || this.platform === 'ios';
  }

  getPlatform(): 'android' | 'ios' | 'web' {
    return this.platform;
  }

  async checkPermission(): Promise<boolean> {
    if (!this.isNative()) {
      return false;
    }

    try {
      // Use Geolocation permission as a proxy for activity recognition on Android
      const result = await Geolocation.checkPermissions();
      console.log(`${LOG_PREFIX} Permission check:`, result);
      
      const granted = result.location === 'granted' || result.coarseLocation === 'granted';
      this.hasPermission = granted;
      return granted;
    } catch (error) {
      console.error(`${LOG_PREFIX} Check permission error:`, error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    console.log(`${LOG_PREFIX} Requesting permissions...`);
    
    if (this.platform === 'web') {
      console.log(`${LOG_PREFIX} Web platform, no permissions needed`);
      return true;
    }

    try {
      // Request location permission which triggers activity recognition permission on Android 10+
      console.log(`${LOG_PREFIX} Requesting location/activity permissions...`);
      const result = await Geolocation.requestPermissions();
      console.log(`${LOG_PREFIX} Permission request result:`, result);
      
      const granted = result.location === 'granted' || result.coarseLocation === 'granted';
      this.hasPermission = granted;
      
      if (granted) {
        console.log(`${LOG_PREFIX} ✅ Permissions granted`);
      } else {
        console.log(`${LOG_PREFIX} ❌ Permissions denied`);
      }
      
      return granted;
    } catch (error) {
      console.error(`${LOG_PREFIX} Permission error:`, error);
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

      // Check/request permission first
      const hasPermission = await this.checkPermission();
      
      if (!hasPermission) {
        console.log(`${LOG_PREFIX} No permission, requesting...`);
        const granted = await this.requestPermission();
        
        if (!granted) {
          console.error(`${LOG_PREFIX} ❌ Permission denied, cannot start tracking`);
          return false;
        }
      }

      // Start counting steps using @tubbly API
      console.log(`${LOG_PREFIX} Calling startCounting()...`);
      await CapacitorPedometer.startCounting();
      this.isTracking = true;
      this.hasPermission = true;
      console.log(`${LOG_PREFIX} ✅ Tracking started successfully`);
      
      // Fetch initial step count after a delay
      setTimeout(async () => {
        try {
          const result = await CapacitorPedometer.getStepCount();
          if (result && typeof result.count === 'number') {
            this.currentSteps = result.count;
            this.currentDistance = this.calculateDistance(this.currentSteps);
            console.log(`${LOG_PREFIX} Initial step count: ${this.currentSteps}`);
          }
        } catch (err) {
          console.error(`${LOG_PREFIX} Error getting initial step count:`, err);
        }
      }, 1000);
      
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

      await CapacitorPedometer.stopCounting();
      this.isTracking = false;
      this.currentSteps = 0;
      this.currentDistance = 0;
      console.log(`${LOG_PREFIX} Tracking stopped`);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error stopping tracking:`, error);
    }
  }

  async fetchSteps(): Promise<number> {
    try {
      if (this.platform === 'web' || !this.isTracking) {
        return this.currentSteps;
      }

      const result = await CapacitorPedometer.getStepCount();
      
      if (result && typeof result.count === 'number') {
        this.currentSteps = result.count;
        this.currentDistance = this.calculateDistance(this.currentSteps);
        console.log(`${LOG_PREFIX} Fetched ${this.currentSteps} steps`);
        return this.currentSteps;
      }
      
      return 0;
    } catch (error) {
      console.error(`${LOG_PREFIX} Error fetching steps:`, error);
      return 0;
    }
  }

  private calculateDistance(steps: number): number {
    const strideLength = 0.762;
    return (steps * strideLength) / 1000;
  }

  getSteps(): number {
    return this.currentSteps;
  }

  getDistance(): number {
    return this.currentDistance;
  }

  getCalories(): number {
    return Math.round(this.currentSteps * 0.04);
  }

  getIsTracking(): boolean {
    return this.isTracking;
  }

  getHasPermission(): boolean {
    return this.hasPermission;
  }

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
