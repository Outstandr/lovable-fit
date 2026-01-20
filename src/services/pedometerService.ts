import { Capacitor } from '@capacitor/core';

export interface PedometerData {
  steps: number;
  distance: number; // in meters
}

export type PedometerCallback = (data: PedometerData) => void;

class PedometerService {
  private isNativePlatform: boolean;
  private plugin: any = null;
  private listener: any = null;
  private isStarted: boolean = false;

  constructor() {
    this.isNativePlatform = Capacitor.isNativePlatform();
  }

  isNative(): boolean {
    return this.isNativePlatform;
  }

  getPlatform(): string {
    return Capacitor.getPlatform();
  }

  async loadPlugin(): Promise<boolean> {
    if (!this.isNativePlatform) {
      console.log('[PedometerService] Web platform - skipping plugin load');
      return false;
    }

    try {
      const { CapacitorPedometer } = await import('@capgo/capacitor-pedometer');
      this.plugin = CapacitorPedometer;
      console.log('[PedometerService] Plugin loaded successfully');
      return true;
    } catch (error) {
      console.error('[PedometerService] Failed to load plugin:', error);
      return false;
    }
  }

  async checkPermission(): Promise<boolean> {
    if (!this.isNativePlatform) return true;

    try {
      if (!this.plugin) {
        await this.loadPlugin();
      }
      if (!this.plugin) return false;

      const result = await this.plugin.checkPermissions();
      console.log('[PedometerService] Permission check result:', result);
      return result.receive === 'granted';
    } catch (error) {
      console.error('[PedometerService] Permission check error:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isNativePlatform) return true;

    try {
      if (!this.plugin) {
        await this.loadPlugin();
      }
      if (!this.plugin) return false;

      console.log('[PedometerService] Requesting permission...');
      const result = await this.plugin.requestPermissions();
      console.log('[PedometerService] Permission request result:', result);
      return result.receive === 'granted';
    } catch (error) {
      console.error('[PedometerService] Permission request error:', error);
      return false;
    }
  }

  async start(callback: PedometerCallback): Promise<boolean> {
    if (!this.isNativePlatform) {
      console.log('[PedometerService] Web platform - cannot start');
      return false;
    }

    if (this.isStarted) {
      console.log('[PedometerService] Already started');
      return true;
    }

    try {
      if (!this.plugin) {
        await this.loadPlugin();
      }
      if (!this.plugin) {
        console.error('[PedometerService] Plugin not available');
        return false;
      }

      // Check permission first
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        console.log('[PedometerService] No permission - requesting...');
        const granted = await this.requestPermission();
        if (!granted) {
          console.error('[PedometerService] Permission denied');
          return false;
        }
      }

      // Register listener BEFORE starting updates
      console.log('[PedometerService] Registering listener...');
      this.listener = await this.plugin.addListener('measurement', (data: any) => {
        console.log('[PedometerService] Measurement event:', data);
        callback({
          steps: data.numberOfSteps || 0,
          distance: data.distance || 0
        });
      });

      // Start measurement updates
      console.log('[PedometerService] Starting measurement updates...');
      await this.plugin.startMeasurementUpdates();
      
      this.isStarted = true;
      console.log('[PedometerService] Started successfully');
      return true;
    } catch (error) {
      console.error('[PedometerService] Start error:', error);
      return false;
    }
  }

  async stop(): Promise<void> {
    if (!this.isNativePlatform || !this.isStarted) return;

    try {
      if (this.plugin) {
        console.log('[PedometerService] Stopping measurement updates...');
        await this.plugin.stopMeasurementUpdates();
      }

      if (this.listener) {
        console.log('[PedometerService] Removing listener...');
        await this.listener.remove();
        this.listener = null;
      }

      this.isStarted = false;
      console.log('[PedometerService] Stopped');
    } catch (error) {
      console.error('[PedometerService] Stop error:', error);
    }
  }

  isTracking(): boolean {
    return this.isStarted;
  }
}

export const pedometerService = new PedometerService();
