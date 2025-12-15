import { Capacitor, registerPlugin } from '@capacitor/core';

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
      // For Android, activity recognition permission is automatically requested
      // when startCounting() is called. We'll assume it's needed if tracking isn't started yet.
      console.log(`${LOG_PREFIX} Android - Activity permission will be requested on start`);
      return this.hasPermission;
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
      // For Android 10+ (API 29+), ACTIVITY_RECOGNITION permission is required
      // The @tubbly plugin should trigger the system permission dialog automatically
      // when startCounting() is called, as long as it's declared in AndroidManifest.xml
      
      console.log(`${LOG_PREFIX} Permission will be requested automatically on startCounting()`);
      return true;
    } catch (error) {
      console.error(`${LOG_PREFIX} Permission error:`, error);
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

      // Start counting - this will trigger Android's permission dialog automatically
      // if the ACTIVITY_RECOGNITION permission is declared in AndroidManifest.xml
      console.log(`${LOG_PREFIX} Calling startCounting() - this will trigger permission dialog...`);
      
      try {
        await CapacitorPedometer.startCounting();
        this.isTracking = true;
        this.hasPermission = true;
        console.log(`${LOG_PREFIX} ✅ Tracking started successfully (permission granted)`);
      } catch (error: any) {
        // If permission was denied, startCounting will throw an error
        console.error(`${LOG_PREFIX} ❌ startCounting failed (permission likely denied):`, error);
        this.isTracking = false;
        this.hasPermission = false;
        return false;
      }
      
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
