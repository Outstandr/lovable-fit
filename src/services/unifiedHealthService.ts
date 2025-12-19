import { Capacitor } from '@capacitor/core';
import { healthConnectService } from './healthConnectService';
import { healthKitService } from './healthKitService';

const LOG_PREFIX = '[UnifiedHealth]';

export type Platform = 'ios' | 'android' | 'web';
export type DataSource = 'healthkit' | 'healthconnect' | 'pedometer' | 'unavailable';

interface HealthData {
  steps: number;
  distance: number;
  activeCalories: number;
  totalCalories: number;
}

class UnifiedHealthService {
  private platform: Platform;

  constructor() {
    this.platform = Capacitor.getPlatform() as Platform;
    console.log(`${LOG_PREFIX} Initialized on platform: ${this.platform}`);
  }

  getPlatform(): Platform {
    return this.platform;
  }

  isNative(): boolean {
    return this.platform === 'ios' || this.platform === 'android';
  }

  getDataSource(): DataSource {
    if (this.platform === 'ios') return 'healthkit';
    if (this.platform === 'android') return 'healthconnect';
    return 'unavailable';
  }

  async checkAvailability(): Promise<boolean> {
    if (this.platform === 'ios') {
      const status = await healthKitService.checkAvailability();
      return status === 'Available';
    }
    if (this.platform === 'android') {
      const status = await healthConnectService.checkAvailability();
      return status === 'Available';
    }
    return false;
  }

  async requestPermission(): Promise<boolean> {
    console.log(`${LOG_PREFIX} Requesting permission for ${this.platform}...`);
    
    if (this.platform === 'ios') {
      return healthKitService.requestPermission();
    }
    if (this.platform === 'android') {
      return healthConnectService.requestPermission();
    }
    return false;
  }

  async checkPermission(): Promise<boolean> {
    if (this.platform === 'ios') {
      // HealthKit doesn't expose permission status, check by trying to read
      const state = healthKitService.getState();
      return state.hasPermission;
    }
    if (this.platform === 'android') {
      return healthConnectService.checkPermission();
    }
    return false;
  }

  async readTodayHealthData(): Promise<HealthData | null> {
    console.log(`${LOG_PREFIX} Reading today's health data...`);
    
    if (this.platform === 'ios') {
      return healthKitService.readTodayHealthData();
    }
    if (this.platform === 'android') {
      const data = await healthConnectService.readTodayHealthData();
      if (!data) return null;
      return {
        steps: data.steps,
        distance: data.distance,
        activeCalories: data.activeCalories,
        totalCalories: data.totalCalories,
      };
    }
    return null;
  }

  async readTodaySteps(): Promise<{ steps: number; calories: number } | null> {
    const data = await this.readTodayHealthData();
    if (!data) return null;
    return { steps: data.steps, calories: data.totalCalories };
  }

  async openSettings(): Promise<void> {
    if (this.platform === 'android') {
      await healthConnectService.openSettings();
    }
    // iOS doesn't have a direct way to open Health app settings
  }

  getState() {
    if (this.platform === 'ios') {
      return {
        platform: this.platform,
        dataSource: 'healthkit' as DataSource,
        ...healthKitService.getState(),
      };
    }
    if (this.platform === 'android') {
      return {
        platform: this.platform,
        dataSource: 'healthconnect' as DataSource,
        ...healthConnectService.getState(),
      };
    }
    return {
      platform: this.platform,
      dataSource: 'unavailable' as DataSource,
      availability: 'NotSupported',
      hasPermission: false,
      lastChecked: null,
    };
  }
}

export const unifiedHealthService = new UnifiedHealthService();
