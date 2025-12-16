import { HealthConnect } from '@pianissimoproject/capacitor-health-connect';
import { Capacitor } from '@capacitor/core';

const LOG_PREFIX = '[HealthConnect]';

export type HealthConnectStatus = 'Available' | 'NotInstalled' | 'NotSupported' | 'Unknown';
export type DataSource = 'healthconnect' | 'pedometer' | 'unavailable';

interface HealthConnectState {
  availability: HealthConnectStatus;
  hasPermission: boolean;
  lastChecked: number | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class HealthConnectService {
  private state: HealthConnectState = {
    availability: 'Unknown',
    hasPermission: false,
    lastChecked: null,
  };

  isNative(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  async checkAvailability(): Promise<HealthConnectStatus> {
    if (!this.isNative()) {
      console.log(`${LOG_PREFIX} Not on Android, Health Connect unavailable`);
      return 'NotSupported';
    }

    // Use cached value if recent
    if (this.state.lastChecked && Date.now() - this.state.lastChecked < CACHE_DURATION) {
      console.log(`${LOG_PREFIX} Using cached availability: ${this.state.availability}`);
      return this.state.availability;
    }

    try {
      console.log(`${LOG_PREFIX} Checking availability...`);
      const { availability } = await HealthConnect.checkAvailability();
      console.log(`${LOG_PREFIX} Availability: ${availability}`);
      
      this.state.availability = availability;
      this.state.lastChecked = Date.now();
      
      return availability;
    } catch (error) {
      console.error(`${LOG_PREFIX} checkAvailability error:`, error);
      return 'NotSupported';
    }
  }

  async checkPermission(): Promise<boolean> {
    if (!this.isNative()) return false;

    try {
      console.log(`${LOG_PREFIX} Checking permissions...`);
      const result = await HealthConnect.checkHealthPermissions({
        read: ['Steps', 'ActiveCaloriesBurned'],
        write: [],
      });
      
      console.log(`${LOG_PREFIX} Permission check result:`, result);
      this.state.hasPermission = result.hasAllPermissions;
      return result.hasAllPermissions;
    } catch (error) {
      console.error(`${LOG_PREFIX} checkPermission error:`, error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isNative()) return false;

    const availability = await this.checkAvailability();
    if (availability !== 'Available') {
      console.log(`${LOG_PREFIX} Cannot request permission, Health Connect not available`);
      return false;
    }

    try {
      console.log(`${LOG_PREFIX} Requesting permissions...`);
      const result = await HealthConnect.requestHealthPermissions({
        read: ['Steps', 'ActiveCaloriesBurned'],
        write: [],
      });
      
      console.log(`${LOG_PREFIX} Permission request result:`, result);
      this.state.hasPermission = result.hasAllPermissions;
      return result.hasAllPermissions;
    } catch (error) {
      console.error(`${LOG_PREFIX} requestPermission error:`, error);
      return false;
    }
  }

  async readTodayHealthData(): Promise<{ 
    steps: number; 
    distance: number; 
    activeCalories: number;
    totalCalories: number;
    avgSpeed: number;
    maxSpeed: number;
  } | null> {
    if (!this.isNative() || !this.state.hasPermission) {
      return null;
    }

    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      
      console.log(`${LOG_PREFIX} Reading health data from ${startOfDay.toISOString()} to ${now.toISOString()}`);
      
      // Read Steps
      const { records: stepRecords } = await HealthConnect.readRecords({
        type: 'Steps',
        timeRangeFilter: {
          type: 'between',
          startTime: startOfDay,
          endTime: now,
        },
      });

      let totalSteps = 0;
      for (const record of stepRecords) {
        if ('count' in record) {
          totalSteps += record.count;
        }
      }
      console.log(`${LOG_PREFIX} Total steps: ${totalSteps}`);

      // Estimate distance from steps (avg stride ~0.762m)
      const totalDistance = (totalSteps * 0.762) / 1000; // in km
      console.log(`${LOG_PREFIX} Estimated distance: ${totalDistance.toFixed(2)} km`);

      // Read Active Calories
      let activeCalories = 0;
      try {
        const { records: activeCalRecords } = await HealthConnect.readRecords({
          type: 'ActiveCaloriesBurned',
          timeRangeFilter: {
            type: 'between',
            startTime: startOfDay,
            endTime: now,
          },
        });

        for (const record of activeCalRecords) {
          if ('energy' in record && record.energy) {
            if (record.energy.unit === 'kilocalories') {
              activeCalories += record.energy.value;
            } else if (record.energy.unit === 'calories') {
              activeCalories += record.energy.value / 1000;
            }
          }
        }
        console.log(`${LOG_PREFIX} Active calories: ${Math.round(activeCalories)}`);
      } catch (e) {
        console.log(`${LOG_PREFIX} Active calories not available, estimating from steps`);
        activeCalories = Math.round(totalSteps * 0.04);
      }

      // Estimate total calories (active + ~30% BMR contribution during activity)
      const totalCalories = activeCalories > 0 ? Math.round(activeCalories * 1.3) : Math.round(totalSteps * 0.04);

      // Calculate average speed from distance and time elapsed
      const elapsedHours = (now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
      const avgSpeed = elapsedHours > 0 && totalDistance > 0 ? totalDistance / elapsedHours : 0;

      console.log(`${LOG_PREFIX} Health data summary:`, {
        steps: totalSteps,
        distance: totalDistance.toFixed(2) + ' km',
        activeCalories: Math.round(activeCalories),
        totalCalories: Math.round(totalCalories),
        avgSpeed: avgSpeed.toFixed(1) + ' km/h',
      });

      return {
        steps: totalSteps,
        distance: totalDistance,
        activeCalories: Math.round(activeCalories),
        totalCalories: Math.round(totalCalories),
        avgSpeed: avgSpeed,
        maxSpeed: 0, // Not available from this plugin
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

  async openSettings(): Promise<void> {
    try {
      await HealthConnect.openHealthConnectSetting();
    } catch (error) {
      console.error(`${LOG_PREFIX} openSettings error:`, error);
    }
  }

  getState() {
    return { ...this.state };
  }

  clearCache() {
    this.state.lastChecked = null;
  }
}

export const healthConnectService = new HealthConnectService();
