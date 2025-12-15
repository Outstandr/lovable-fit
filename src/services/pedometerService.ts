import { Capacitor, registerPlugin } from '@capacitor/core';

interface PedometerPlugin {
  startMeasurementUpdates(): Promise<void>;
  stopMeasurementUpdates(): Promise<void>;
  getMeasurement(): Promise<Measurement>;
  isAvailable(): Promise<IsAvailableResult>;
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(): Promise<PermissionStatus>;
  addListener(eventName: 'measurement', listenerFunc: (event: Measurement) => void): Promise<any>;
  removeAllListeners(): Promise<void>;
}

interface Measurement {
  numberOfSteps: number;
  distance?: number;
  floorsAscended?: number;
  floorsDescended?: number;
  currentPace?: number;
  currentCadence?: number;
  averageActivePace?: number;
  startDate: number;
  endDate: number;
}

interface IsAvailableResult {
  stepCounting: boolean;
  distance: boolean;
  pace: boolean;
  cadence: boolean;
  floorCounting: boolean;
}

interface PermissionStatus {
  activityRecognition: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied';
}

const CapacitorPedometer = registerPlugin<PedometerPlugin>('CapacitorPedometer');

const LOG_PREFIX = '[Pedometer]';

class PedometerService {
  private currentSteps = 0;
  private currentDistance = 0;
  private isTracking = false;
  private hasPermission = false;
  private platform: 'android' | 'ios' | 'web';
  private listenerHandle: any = null;

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
      const result = await CapacitorPedometer.checkPermissions();
      console.log(`${LOG_PREFIX} Permission check:`, result);
      
      const granted = result.activityRecognition === 'granted';
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
      const result = await CapacitorPedometer.requestPermissions();
      console.log(`${LOG_PREFIX} Permission request result:`, result);
      
      const granted = result.activityRecognition === 'granted';
      this.hasPermission = granted;
      
      if (granted) {
        console.log(`${LOG_PREFIX} ✅ Permission granted`);
      } else {
        console.log(`${LOG_PREFIX} ❌ Permission denied: ${result.activityRecognition}`);
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

      // Check permission first
      const hasPermission = await this.checkPermission();
      
      if (!hasPermission) {
        console.log(`${LOG_PREFIX} No permission, requesting...`);
        const granted = await this.requestPermission();
        
        if (!granted) {
          console.error(`${LOG_PREFIX} ❌ Permission denied, cannot start tracking`);
          return false;
        }
      }

      // Check availability
      const availability = await CapacitorPedometer.isAvailable();
      console.log(`${LOG_PREFIX} Availability:`, availability);
      
      if (!availability.stepCounting) {
        console.error(`${LOG_PREFIX} Step counting not available on this device`);
        return false;
      }

      // Start listening for measurement updates
      this.listenerHandle = await CapacitorPedometer.addListener('measurement', (data: Measurement) => {
        console.log(`${LOG_PREFIX} 🚶 Measurement update:`, data);
        this.currentSteps = data.numberOfSteps;
        this.currentDistance = data.distance ? data.distance / 1000 : this.calculateDistance(this.currentSteps);
        console.log(`${LOG_PREFIX} Steps: ${this.currentSteps}, Distance: ${this.currentDistance.toFixed(2)} km`);
      });

      // Start measurement updates
      await CapacitorPedometer.startMeasurementUpdates();
      this.isTracking = true;
      this.hasPermission = true;
      console.log(`${LOG_PREFIX} ✅ Tracking started successfully`);
      
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

      await CapacitorPedometer.stopMeasurementUpdates();
      await CapacitorPedometer.removeAllListeners();
      this.listenerHandle = null;
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

      // @capgo plugin updates automatically via listener
      // Just return current value
      return this.currentSteps;
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
