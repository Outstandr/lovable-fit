import { Capacitor } from '@capacitor/core';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';

const LOG_PREFIX = '[Pedometer]';

class PedometerService {
  private currentSteps = 0;
  private currentDistance = 0;
  private isTracking = false;
  private hasPermission = false;
  private listener: any = null;

  isNative(): boolean {
    const platform = Capacitor.getPlatform();
    const native = platform === 'android' || platform === 'ios';
    console.log(`${LOG_PREFIX} isNative: ${native} (platform: ${platform})`);
    return native;
  }

  getPlatform(): 'android' | 'ios' | 'web' {
    return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
  }

  async checkPermission(): Promise<boolean> {
    if (!this.isNative()) {
      console.log(`${LOG_PREFIX} checkPermission: Not native, returning false`);
      return false;
    }

    try {
      console.log(`${LOG_PREFIX} checkPermission: Calling CapacitorPedometer.checkPermissions()...`);
      const result = await CapacitorPedometer.checkPermissions();
      console.log(`${LOG_PREFIX} checkPermission: Result =`, JSON.stringify(result));
      
      this.hasPermission = result.activityRecognition === 'granted';
      console.log(`${LOG_PREFIX} checkPermission: hasPermission = ${this.hasPermission}`);
      return this.hasPermission;
    } catch (error) {
      console.error(`${LOG_PREFIX} checkPermission: Error =`, error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isNative()) {
      console.log(`${LOG_PREFIX} requestPermission: Not native, returning false`);
      return false;
    }

    try {
      console.log(`${LOG_PREFIX} requestPermission: Calling CapacitorPedometer.requestPermissions()...`);
      const result = await CapacitorPedometer.requestPermissions();
      console.log(`${LOG_PREFIX} requestPermission: Result =`, JSON.stringify(result));
      
      this.hasPermission = result.activityRecognition === 'granted';
      console.log(`${LOG_PREFIX} requestPermission: hasPermission = ${this.hasPermission}`);
      return this.hasPermission;
    } catch (error) {
      console.error(`${LOG_PREFIX} requestPermission: Error =`, error);
      return false;
    }
  }

  async start(): Promise<boolean> {
    if (!this.isNative()) {
      console.log(`${LOG_PREFIX} start: Not native, cannot start`);
      return false;
    }

    if (this.isTracking) {
      console.log(`${LOG_PREFIX} start: Already tracking`);
      return true;
    }

    try {
      // Step 1: Check permission
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        console.log(`${LOG_PREFIX} start: No permission, requesting...`);
        const granted = await this.requestPermission();
        if (!granted) {
          console.log(`${LOG_PREFIX} start: Permission denied, cannot start`);
          return false;
        }
      }

      // Step 2: Add listener FIRST (critical!)
      console.log(`${LOG_PREFIX} start: Adding measurement listener...`);
      this.listener = await CapacitorPedometer.addListener('measurement', (data) => {
        console.log(`${LOG_PREFIX} 🚶 MEASUREMENT:`, JSON.stringify(data));
        this.currentSteps = data?.numberOfSteps ?? 0;
        this.currentDistance = (data?.distance ?? 0) / 1000; // Convert to km
        console.log(`${LOG_PREFIX} 🚶 Updated: steps=${this.currentSteps}, distance=${this.currentDistance.toFixed(2)}km`);
      });
      console.log(`${LOG_PREFIX} start: Listener added`);

      // Step 3: Start updates
      console.log(`${LOG_PREFIX} start: Calling startMeasurementUpdates()...`);
      await CapacitorPedometer.startMeasurementUpdates();
      console.log(`${LOG_PREFIX} start: Tracking started successfully`);

      this.isTracking = true;
      return true;
    } catch (error) {
      console.error(`${LOG_PREFIX} start: Error =`, error);
      this.isTracking = false;
      return false;
    }
  }

  async stop(): Promise<void> {
    if (!this.isNative()) {
      console.log(`${LOG_PREFIX} stop: Not native`);
      return;
    }

    try {
      console.log(`${LOG_PREFIX} stop: Stopping tracking...`);
      
      await CapacitorPedometer.stopMeasurementUpdates();
      console.log(`${LOG_PREFIX} stop: Updates stopped`);
      
      if (this.listener) {
        await this.listener.remove();
        this.listener = null;
        console.log(`${LOG_PREFIX} stop: Listener removed`);
      }

      this.isTracking = false;
      console.log(`${LOG_PREFIX} stop: Tracking stopped`);
    } catch (error) {
      console.error(`${LOG_PREFIX} stop: Error =`, error);
    }
  }

  getSteps(): number {
    return this.currentSteps;
  }

  getDistance(): number {
    return this.currentDistance;
  }

  getCalories(): number {
    // Rough estimate: 0.04 calories per step
    return Math.round(this.currentSteps * 0.04);
  }

  getIsTracking(): boolean {
    return this.isTracking;
  }

  getHasPermission(): boolean {
    return this.hasPermission;
  }

  // For debugging
  getState() {
    return {
      platform: this.getPlatform(),
      isTracking: this.isTracking,
      hasPermission: this.hasPermission,
      steps: this.currentSteps,
      distance: this.currentDistance,
      calories: this.getCalories(),
      hasListener: !!this.listener
    };
  }
}

export const pedometerService = new PedometerService();
