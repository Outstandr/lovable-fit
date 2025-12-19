import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';

const LOG_PREFIX = '[HealthService]';

export type DataSource = 'health' | 'unavailable';
export type Platform = 'ios' | 'android' | 'web';

interface HealthData {
  steps: number;
  distance: number; // in km
  calories: number;
}

interface HealthServiceState {
  isAvailable: boolean;
  hasPermission: boolean;
  platform: Platform;
  lastChecked: number | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class HealthService {
  private state: HealthServiceState = {
    isAvailable: false,
    hasPermission: false,
    platform: 'web',
    lastChecked: null,
  };

  constructor() {
    this.state.platform = Capacitor.getPlatform() as Platform;
    console.log(`${LOG_PREFIX} Initialized on platform: ${this.state.platform}`);
  }

  isNative(): boolean {
    return this.state.platform === 'android' || this.state.platform === 'ios';
  }

  getPlatform(): Platform {
    return this.state.platform;
  }

  async checkAvailability(): Promise<boolean> {
    if (!this.isNative()) {
      console.log(`${LOG_PREFIX} Not on native platform, health unavailable`);
      return false;
    }

    // Use cached value if recent
    if (this.state.lastChecked && Date.now() - this.state.lastChecked < CACHE_DURATION) {
      console.log(`${LOG_PREFIX} Using cached availability: ${this.state.isAvailable}`);
      return this.state.isAvailable;
    }

    try {
      console.log(`${LOG_PREFIX} Checking availability...`);
      const result = await Health.isAvailable();
      console.log(`${LOG_PREFIX} Availability:`, result);
      
      this.state.isAvailable = result.available;
      this.state.lastChecked = Date.now();
      
      return result.available;
    } catch (error) {
      console.error(`${LOG_PREFIX} checkAvailability error:`, error);
      return false;
    }
  }

  async checkPermission(): Promise<boolean> {
    if (!this.isNative()) return false;

    try {
      console.log(`${LOG_PREFIX} Checking permissions...`);
      const result = await Health.checkAuthorization({
        read: ['steps', 'distance', 'calories'],
        write: [],
      });
      
      console.log(`${LOG_PREFIX} Permission check result:`, result);
      // Check if steps are authorized (minimum requirement)
      const hasSteps = result.readAuthorized?.includes('steps') ?? false;
      this.state.hasPermission = hasSteps;
      return hasSteps;
    } catch (error) {
      console.error(`${LOG_PREFIX} checkPermission error:`, error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isNative()) return false;

    const isAvailable = await this.checkAvailability();
    if (!isAvailable) {
      console.log(`${LOG_PREFIX} Cannot request permission, health not available`);
      return false;
    }

    try {
      console.log(`${LOG_PREFIX} Requesting permissions...`);
      const result = await Health.requestAuthorization({
        read: ['steps', 'distance', 'calories'],
        write: [],
      });
      
      console.log(`${LOG_PREFIX} Permission request result:`, result);
      const hasSteps = result.readAuthorized?.includes('steps') ?? false;
      this.state.hasPermission = hasSteps;
      return hasSteps;
    } catch (error) {
      console.error(`${LOG_PREFIX} requestPermission error:`, error);
      return false;
    }
  }

  async readTodayData(): Promise<HealthData | null> {
    if (!this.isNative()) {
      return null;
    }

    // Check permission first
    if (!this.state.hasPermission) {
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        console.log(`${LOG_PREFIX} No permission to read health data`);
        return null;
      }
    }

    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      
      console.log(`${LOG_PREFIX} Reading health data from ${startOfDay.toISOString()} to ${now.toISOString()}`);

      // Read steps
      let totalSteps = 0;
      try {
        const stepsResult = await Health.readSamples({
          dataType: 'steps',
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
          limit: 1000,
        });
        
        if (stepsResult.samples && stepsResult.samples.length > 0) {
          totalSteps = stepsResult.samples.reduce((sum, sample) => sum + (sample.value || 0), 0);
        }
        console.log(`${LOG_PREFIX} Steps: ${totalSteps}`);
      } catch (e) {
        console.error(`${LOG_PREFIX} Error reading steps:`, e);
      }

      // Read distance
      let totalDistance = 0;
      try {
        const distanceResult = await Health.readSamples({
          dataType: 'distance',
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
          limit: 1000,
        });
        
        if (distanceResult.samples && distanceResult.samples.length > 0) {
          // Distance is in meters, convert to km
          totalDistance = distanceResult.samples.reduce((sum, sample) => sum + (sample.value || 0), 0) / 1000;
        }
        console.log(`${LOG_PREFIX} Distance: ${totalDistance.toFixed(2)} km`);
      } catch (e) {
        console.error(`${LOG_PREFIX} Error reading distance:`, e);
        // Fallback: estimate from steps (average stride ~0.762m)
        totalDistance = (totalSteps * 0.762) / 1000;
      }

      // Read calories
      let totalCalories = 0;
      try {
        const caloriesResult = await Health.readSamples({
          dataType: 'calories',
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
          limit: 1000,
        });
        
        if (caloriesResult.samples && caloriesResult.samples.length > 0) {
          totalCalories = caloriesResult.samples.reduce((sum, sample) => sum + (sample.value || 0), 0);
        }
        console.log(`${LOG_PREFIX} Calories: ${Math.round(totalCalories)}`);
      } catch (e) {
        console.error(`${LOG_PREFIX} Error reading calories:`, e);
        // Fallback: estimate from steps (0.04 calories per step)
        totalCalories = totalSteps * 0.04;
      }

      console.log(`${LOG_PREFIX} Health data summary:`, {
        steps: totalSteps,
        distance: totalDistance.toFixed(2) + ' km',
        calories: Math.round(totalCalories),
      });

      return {
        steps: totalSteps,
        distance: totalDistance,
        calories: Math.round(totalCalories),
      };
    } catch (error) {
      console.error(`${LOG_PREFIX} readTodayData error:`, error);
      return null;
    }
  }

  async start(): Promise<boolean> {
    if (!this.isNative()) {
      console.log(`${LOG_PREFIX} Not on native platform`);
      return false;
    }

    try {
      const isAvailable = await this.checkAvailability();
      if (!isAvailable) {
        console.log(`${LOG_PREFIX} Health service not available`);
        return false;
      }

      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log(`${LOG_PREFIX} Permission not granted`);
        return false;
      }

      console.log(`${LOG_PREFIX} ✅ Health service started successfully`);
      return true;
    } catch (error) {
      console.error(`${LOG_PREFIX} start error:`, error);
      return false;
    }
  }

  async openSettings(): Promise<void> {
    if (this.state.platform === 'android') {
      try {
        await Health.openHealthConnectSettings();
      } catch (error) {
        console.error(`${LOG_PREFIX} openSettings error:`, error);
      }
    }
  }

  getState() {
    return { ...this.state };
  }

  clearCache() {
    this.state.lastChecked = null;
  }
}

export const healthService = new HealthService();
