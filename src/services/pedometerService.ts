import { Capacitor, registerPlugin } from '@capacitor/core';

interface PedometerPlugin {
  startCounting(): Promise<void>;
  stopCounting(): Promise<void>;
  getStepCount(): Promise<{ count: number }>;
  checkPermissions(): Promise<{ activityRecognition: string }>;
  requestPermissions(): Promise<{ activityRecognition: string }>;
}

const CapacitorPedometer = registerPlugin<PedometerPlugin>('CapacitorPedometer');

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
  private lastFetchTime = 0;
  private fetchDebounceMs = 500; // Minimum time between fetches

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
    return this.hasPermission;
  }

  async requestPermission(): Promise<boolean> {
    console.log(`${LOG_PREFIX} Requesting permissions...`);
    
    if (this.platform === 'web') {
      console.log(`${LOG_PREFIX} Web platform, no permissions needed`);
      return true;
    }

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

      // Request ACTIVITY_RECOGNITION permission first
      const hasPermission = await this.requestActivityRecognitionPermission();
      
      if (!hasPermission) {
        console.error(`${LOG_PREFIX} ACTIVITY_RECOGNITION permission denied`);
        this.hasPermission = false;
        return false;
      }

      // Start counting steps
      console.log(`${LOG_PREFIX} Starting pedometer with permission granted...`);
      await CapacitorPedometer.startCounting();
      this.isTracking = true;
      this.hasPermission = true;
      console.log(`${LOG_PREFIX} ✅ Tracking started successfully`);
      
      // Fetch initial step count
      const result = await CapacitorPedometer.getStepCount();
      if (result && typeof result.count === 'number') {
        this.currentSteps = result.count;
        this.currentDistance = this.calculateDistance(this.currentSteps);
        console.log(`${LOG_PREFIX} Initial step count: ${this.currentSteps}`);
      }
      
      return true;
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to start tracking:`, error);
      this.isTracking = false;
      this.hasPermission = false;
      return false;
    }
  }

  private async requestActivityRecognitionPermission(): Promise<boolean> {
    if (this.platform !== 'android') {
      console.log(`${LOG_PREFIX} Not Android, skipping ACTIVITY_RECOGNITION request`);
      return true;
    }

    try {
      console.log(`${LOG_PREFIX} Checking ACTIVITY_RECOGNITION permission...`);
      
      const checkResult = await CapacitorPedometer.checkPermissions();
      console.log(`${LOG_PREFIX} Current permission status:`, checkResult);
      
      if (checkResult?.activityRecognition === 'granted') {
        console.log(`${LOG_PREFIX} Permission already granted`);
        return true;
      }
      
      console.log(`${LOG_PREFIX} Requesting ACTIVITY_RECOGNITION permission...`);
      const requestResult = await CapacitorPedometer.requestPermissions();
      console.log(`${LOG_PREFIX} Permission request result:`, requestResult);
      
      if (requestResult?.activityRecognition === 'granted') {
        console.log(`${LOG_PREFIX} Permission granted!`);
        return true;
      }
      
      console.log(`${LOG_PREFIX} Permission denied`);
      return false;
    } catch (error) {
      console.error(`${LOG_PREFIX} Permission request error:`, error);
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
      console.log(`${LOG_PREFIX} Tracking stopped (steps preserved: ${this.currentSteps})`);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error stopping tracking:`, error);
    }
  }

  async fetchSteps(): Promise<number> {
    try {
      if (this.platform === 'web' || !this.isTracking) {
        return this.currentSteps;
      }

      // Debounce rapid fetches
      const now = Date.now();
      if (now - this.lastFetchTime < this.fetchDebounceMs) {
        return this.currentSteps;
      }
      this.lastFetchTime = now;

      const result = await CapacitorPedometer.getStepCount();
      
      if (result && typeof result.count === 'number') {
        // Only update if count has increased (prevent decreases from sensor resets)
        if (result.count >= this.currentSteps || this.currentSteps === 0) {
          this.currentSteps = result.count;
          this.currentDistance = this.calculateDistance(this.currentSteps);
        }
        return this.currentSteps;
      }
      
      return this.currentSteps;
    } catch (error) {
      console.error(`${LOG_PREFIX} Error fetching steps:`, error);
      return this.currentSteps;
    }
  }

  private calculateDistance(steps: number): number {
    // Average stride length is about 0.762 meters (2.5 feet)
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
