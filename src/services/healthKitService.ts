import { Capacitor } from '@capacitor/core';
import {
  CapacitorHealthkit,
  OtherData,
} from '@perfood/capacitor-healthkit';

const LOG_PREFIX = '[HealthKit]';

export type HealthKitStatus = 'Available' | 'NotSupported' | 'Unknown';

interface HealthKitState {
  availability: HealthKitStatus;
  hasPermission: boolean;
  lastChecked: number | null;
}

// Use string literals matching the enum values
const READ_PERMISSIONS = ['stepCount', 'distanceWalkingRunning', 'activeEnergyBurned'];

class HealthKitService {
  private state: HealthKitState = {
    availability: 'Unknown',
    hasPermission: false,
    lastChecked: null,
  };

  isNative(): boolean {
    return Capacitor.getPlatform() === 'ios';
  }

  async checkAvailability(): Promise<HealthKitStatus> {
    if (!this.isNative()) {
      console.log(`${LOG_PREFIX} Not on iOS, HealthKit unavailable`);
      return 'NotSupported';
    }

    try {
      console.log(`${LOG_PREFIX} Checking availability...`);
      // isAvailable() returns void/Promise<void> but throws if not available
      await CapacitorHealthkit.isAvailable();
      console.log(`${LOG_PREFIX} HealthKit is available`);
      
      this.state.availability = 'Available';
      this.state.lastChecked = Date.now();
      
      return 'Available';
    } catch (error) {
      console.error(`${LOG_PREFIX} checkAvailability error:`, error);
      this.state.availability = 'NotSupported';
      return 'NotSupported';
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isNative()) return false;

    const availability = await this.checkAvailability();
    if (availability !== 'Available') {
      console.log(`${LOG_PREFIX} Cannot request permission, HealthKit not available`);
      return false;
    }

    try {
      console.log(`${LOG_PREFIX} Requesting permissions...`);
      await CapacitorHealthkit.requestAuthorization({
        all: [],
        read: READ_PERMISSIONS,
        write: [],
      });
      
      // HealthKit doesn't tell us if permission was granted, we assume success if no error
      console.log(`${LOG_PREFIX} Permission request completed`);
      this.state.hasPermission = true;
      return true;
    } catch (error) {
      console.error(`${LOG_PREFIX} requestPermission error:`, error);
      this.state.hasPermission = false;
      return false;
    }
  }

  async readTodayHealthData(): Promise<{
    steps: number;
    distance: number;
    activeCalories: number;
    totalCalories: number;
  } | null> {
    if (!this.isNative()) {
      return null;
    }

    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      
      console.log(`${LOG_PREFIX} Reading health data from ${startOfDay.toISOString()} to ${now.toISOString()}`);
      
      // Read Steps
      let totalSteps = 0;
      try {
        const stepData = await CapacitorHealthkit.queryHKitSampleType({
          sampleName: 'stepCount',
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
          limit: 0, // No limit
        });
        
        if (stepData.resultData) {
          for (const record of stepData.resultData as OtherData[]) {
            totalSteps += record.value || 0;
          }
        }
        console.log(`${LOG_PREFIX} Total steps: ${totalSteps}`);
      } catch (e) {
        console.error(`${LOG_PREFIX} Error reading steps:`, e);
      }

      // Read Distance
      let totalDistance = 0;
      try {
        const distanceData = await CapacitorHealthkit.queryHKitSampleType({
          sampleName: 'distanceWalkingRunning',
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
          limit: 0,
        });
        
        if (distanceData.resultData) {
          for (const record of distanceData.resultData as OtherData[]) {
            totalDistance += (record.value || 0) / 1000; // Convert meters to km
          }
        }
        console.log(`${LOG_PREFIX} Total distance: ${totalDistance.toFixed(2)} km`);
      } catch (e) {
        console.log(`${LOG_PREFIX} Distance not available, estimating from steps`);
        totalDistance = (totalSteps * 0.762) / 1000;
      }

      // Read Active Calories
      let activeCalories = 0;
      try {
        const calorieData = await CapacitorHealthkit.queryHKitSampleType({
          sampleName: 'activeEnergyBurned',
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
          limit: 0,
        });
        
        if (calorieData.resultData) {
          for (const record of calorieData.resultData as OtherData[]) {
            activeCalories += record.value || 0;
          }
        }
        console.log(`${LOG_PREFIX} Active calories: ${Math.round(activeCalories)}`);
      } catch (e) {
        console.log(`${LOG_PREFIX} Active calories not available, estimating from steps`);
        activeCalories = Math.round(totalSteps * 0.04);
      }

      const totalCalories = activeCalories > 0 ? Math.round(activeCalories * 1.3) : Math.round(totalSteps * 0.04);

      console.log(`${LOG_PREFIX} Health data summary:`, {
        steps: totalSteps,
        distance: totalDistance.toFixed(2) + ' km',
        activeCalories: Math.round(activeCalories),
        totalCalories: Math.round(totalCalories),
      });

      this.state.hasPermission = true;

      return {
        steps: totalSteps,
        distance: totalDistance,
        activeCalories: Math.round(activeCalories),
        totalCalories: Math.round(totalCalories),
      };
    } catch (error) {
      console.error(`${LOG_PREFIX} readTodayHealthData error:`, error);
      return null;
    }
  }

  // Legacy method for backward compatibility
  async readTodaySteps(): Promise<{ steps: number; calories: number } | null> {
    const data = await this.readTodayHealthData();
    if (!data) return null;
    return { steps: data.steps, calories: data.totalCalories };
  }

  getState() {
    return { ...this.state };
  }

  clearCache() {
    this.state.lastChecked = null;
  }
}

export const healthKitService = new HealthKitService();
