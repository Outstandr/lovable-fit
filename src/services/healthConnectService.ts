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

  async readTodaySteps(): Promise<{ steps: number; calories: number } | null> {
    if (!this.isNative() || !this.state.hasPermission) {
      return null;
    }

    try {
      // Get today at midnight
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      
      console.log(`${LOG_PREFIX} Reading steps from ${startOfDay.toISOString()} to ${now.toISOString()}`);
      
      const { records } = await HealthConnect.readRecords({
        type: 'Steps',
        timeRangeFilter: {
          type: 'between',
          startTime: startOfDay,
          endTime: now,
        },
      });

      // Aggregate all step records
      let totalSteps = 0;
      for (const record of records) {
        if ('count' in record) {
          totalSteps += record.count;
        }
      }

      console.log(`${LOG_PREFIX} Total steps today: ${totalSteps} (from ${records.length} records)`);

      // Try to read calories
      let totalCalories = 0;
      try {
        const { records: calorieRecords } = await HealthConnect.readRecords({
          type: 'ActiveCaloriesBurned',
          timeRangeFilter: {
            type: 'between',
            startTime: startOfDay,
            endTime: now,
          },
        });

        for (const record of calorieRecords) {
          if ('energy' in record && record.energy) {
            // Convert to kcal if needed
            if (record.energy.unit === 'kilocalories') {
              totalCalories += record.energy.value;
            } else if (record.energy.unit === 'calories') {
              totalCalories += record.energy.value / 1000;
            }
          }
        }
        console.log(`${LOG_PREFIX} Total calories today: ${Math.round(totalCalories)}`);
      } catch (e) {
        // Calories might not be available, estimate from steps
        totalCalories = Math.round(totalSteps * 0.04);
        console.log(`${LOG_PREFIX} Estimated calories from steps: ${totalCalories}`);
      }

      return { steps: totalSteps, calories: Math.round(totalCalories) };
    } catch (error) {
      console.error(`${LOG_PREFIX} readTodaySteps error:`, error);
      return null;
    }
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
