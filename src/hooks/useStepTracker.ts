import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';
import { toast } from '@/hooks/use-toast';
import '@/types/cordova-permissions';

// Storage keys for persistence across app restarts
const STEP_BASELINE_KEY = 'step_tracker_baseline';
const STEP_DATE_KEY = 'step_tracker_date';
const DAILY_STEPS_KEY = 'step_tracker_daily';

// The Android permission string for activity recognition
const ACTIVITY_RECOGNITION_PERMISSION = 'android.permission.ACTIVITY_RECOGNITION';

export type PermissionStatus = 'unknown' | 'granted' | 'denied' | 'unavailable';

interface StepTrackerState {
  steps: number;
  error: string | null;
  permissionStatus: PermissionStatus;
  isTracking: boolean;
}

/**
 * Hardware Sync Strategy Hook with Delegate Permission Pattern
 * 
 * Uses TYPE_STEP_COUNTER hardware chip which counts steps 24/7.
 * On app open/resume, we query the cumulative total and calculate daily steps.
 * 
 * CRITICAL: Uses cordova-plugin-android-permissions as a "delegate" to request
 * ACTIVITY_RECOGNITION permission because @capgo/capacitor-pedometer's
 * requestPermissions() crashes with NullPointerException on Android 14+.
 * 
 * The delegate pattern works because Android grants permissions at the app level,
 * not per-plugin. Once the Cordova plugin gets permission, the Pedometer can use it.
 */

// Helper: Check if we have activity recognition permission using Cordova plugin
const checkActivityPermission = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!window.cordova?.plugins?.permissions) {
      console.log('[StepTracker] Cordova permissions plugin not available');
      resolve(false);
      return;
    }
    
    const permissions = window.cordova.plugins.permissions;
    permissions.checkPermission(
      ACTIVITY_RECOGNITION_PERMISSION,
      (status) => {
        console.log('[StepTracker] Permission check result:', status.hasPermission);
        resolve(status.hasPermission);
      },
      (err) => {
        console.error('[StepTracker] Permission check error:', err);
        resolve(false);
      }
    );
  });
};

// Helper: Request activity recognition permission using Cordova plugin (THE DELEGATE)
const requestActivityPermission = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!window.cordova?.plugins?.permissions) {
      console.log('[StepTracker] Cordova permissions plugin not available, falling back');
      resolve(false);
      return;
    }
    
    console.log('[StepTracker] 🎯 Requesting permission via Cordova delegate...');
    const permissions = window.cordova.plugins.permissions;
    permissions.requestPermission(
      ACTIVITY_RECOGNITION_PERMISSION,
      (status) => {
        console.log('[StepTracker] 🎯 Permission request result:', status.hasPermission);
        resolve(status.hasPermission);
      },
      (err) => {
        console.error('[StepTracker] Permission request error:', err);
        resolve(false);
      }
    );
  });
};
export function useStepTracker() {
  const [state, setState] = useState<StepTrackerState>({
    steps: 0,
    error: null,
    permissionStatus: 'unknown',
    isTracking: false,
  });

  const listenerRef = useRef<{ remove: () => void } | null>(null);
  const baselineRef = useRef<number | null>(null);
  const dailyStepsRef = useRef<number>(0);
  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);

  // Load persisted baseline and daily steps from localStorage
  const loadPersistedData = useCallback(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const savedDate = localStorage.getItem(STEP_DATE_KEY);
      
      if (savedDate === today) {
        // Same day - restore baseline and daily steps
        const savedBaseline = localStorage.getItem(STEP_BASELINE_KEY);
        const savedDaily = localStorage.getItem(DAILY_STEPS_KEY);
        
        if (savedBaseline) baselineRef.current = parseInt(savedBaseline, 10);
        if (savedDaily) {
          dailyStepsRef.current = parseInt(savedDaily, 10);
          // Update state with persisted steps
          setState(prev => ({ ...prev, steps: dailyStepsRef.current }));
        }
        
        console.log('[StepTracker] Restored:', { 
          baseline: baselineRef.current, 
          daily: dailyStepsRef.current 
        });
      } else {
        // New day - reset counters
        console.log('[StepTracker] New day detected - resetting counters');
        baselineRef.current = null;
        dailyStepsRef.current = 0;
        localStorage.setItem(STEP_DATE_KEY, today);
        localStorage.removeItem(STEP_BASELINE_KEY);
        localStorage.setItem(DAILY_STEPS_KEY, '0');
        setState(prev => ({ ...prev, steps: 0 }));
      }
    } catch (e) {
      console.error('[StepTracker] Error loading persisted data:', e);
    }
  }, []);

  // Persist current state to localStorage
  const persistData = useCallback((baseline: number, daily: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem(STEP_DATE_KEY, today);
      localStorage.setItem(STEP_BASELINE_KEY, baseline.toString());
      localStorage.setItem(DAILY_STEPS_KEY, daily.toString());
    } catch (e) {
      console.error('[StepTracker] Error persisting data:', e);
    }
  }, []);

  // Process step data from the TYPE_STEP_COUNTER sensor
  const processStepData = useCallback((sensorSteps: number) => {
    // TYPE_STEP_COUNTER returns cumulative steps since device boot
    // First reading of the day becomes our baseline
    if (baselineRef.current === null) {
      baselineRef.current = sensorSteps;
      console.log('[StepTracker] Baseline set:', sensorSteps);
      // First reading - just set baseline, daily steps stay at persisted value
      return;
    }

    // Calculate delta from last reading
    const delta = Math.max(0, sensorSteps - baselineRef.current);
    
    // Update running total
    if (delta > 0) {
      dailyStepsRef.current += delta;
      baselineRef.current = sensorSteps;
      
      // Persist updated values
      persistData(sensorSteps, dailyStepsRef.current);

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          steps: dailyStepsRef.current,
          isTracking: true,
          permissionStatus: 'granted',
          error: null
        }));
      }

      console.log('[StepTracker] Steps updated:', { 
        sensor: sensorSteps, 
        delta,
        daily: dailyStepsRef.current 
      });
    }
  }, [persistData]);

  // Start tracking with Delegate Pattern
  // Uses Cordova plugin to request permission, then starts pedometer
  const startTracking = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent starts
    if (isStartingRef.current) {
      console.log('[StepTracker] Start already in progress, skipping...');
      return false;
    }

    if (!Capacitor.isNativePlatform()) {
      setState(prev => ({ 
        ...prev, 
        permissionStatus: 'unavailable',
        error: 'Step tracking only available on mobile devices'
      }));
      return false;
    }

    isStartingRef.current = true;

    // Check if sensor hardware is available (this call is safe)
    try {
      const availability = await CapacitorPedometer.isAvailable();
      if (!availability.stepCounting) {
        setState(prev => ({ 
          ...prev, 
          permissionStatus: 'unavailable',
          error: 'Step counting not available on this device'
        }));
        isStartingRef.current = false;
        return false;
      }
      console.log('[StepTracker] Sensor available');
    } catch (e) {
      console.log('[StepTracker] isAvailable check failed (continuing anyway):', e);
    }

    // DELEGATE PATTERN: Use Cordova plugin to check/request permission
    // This avoids the NullPointerException in the Pedometer plugin's requestPermissions()
    try {
      let hasPermission = await checkActivityPermission();
      console.log('[StepTracker] Current permission status:', hasPermission);

      if (!hasPermission) {
        // Request permission using Cordova delegate (shows native Android dialog!)
        hasPermission = await requestActivityPermission();
      }

      if (!hasPermission) {
        // User denied permission
        console.log('[StepTracker] ❌ Permission denied by user');
        setState(prev => ({
          ...prev,
          isTracking: false,
          permissionStatus: 'denied',
          error: 'Please enable Physical Activity permission in Settings'
        }));
        isStartingRef.current = false;
        return false;
      }
    } catch (e) {
      console.log('[StepTracker] Cordova permission check failed, trying direct start:', e);
      // Fall through to try direct start anyway
    }

    // Clean up any existing listener
    if (listenerRef.current) {
      try {
        listenerRef.current.remove();
      } catch (e) { /* ignore */ }
      listenerRef.current = null;
    }

    try {
      // Add measurement listener FIRST
      console.log('[StepTracker] Adding measurement listener...');
      listenerRef.current = await CapacitorPedometer.addListener(
        'measurement',
        (data) => {
          console.log('[StepTracker] 📊 Measurement received:', data.numberOfSteps);
          processStepData(data.numberOfSteps || 0);
        }
      );

      // Start measurement updates - permission should already be granted by Cordova delegate
      console.log('[StepTracker] Starting measurement updates...');
      await CapacitorPedometer.startMeasurementUpdates();

      console.log('[StepTracker] ✅ Tracking started successfully!');
      
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isTracking: true,
          permissionStatus: 'granted',
          error: null
        }));
      }

      isStartingRef.current = false;
      return true;

    } catch (error: any) {
      const errorMsg = (error?.message || '').toLowerCase();
      console.error('[StepTracker] ❌ Start failed:', error?.message);

      // Clean up listener if start failed
      if (listenerRef.current) {
        try { listenerRef.current.remove(); } catch (e) { /* ignore */ }
        listenerRef.current = null;
      }

      // Determine if it's a permission error
      const isPermissionError = 
        errorMsg.includes('permission') || 
        errorMsg.includes('denied') || 
        errorMsg.includes('activity') ||
        errorMsg.includes('not granted');

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isTracking: false,
          permissionStatus: isPermissionError ? 'denied' : 'unknown',
          error: isPermissionError 
            ? 'Please enable Physical Activity permission in Settings > Apps > HotStepper > Permissions'
            : error?.message || 'Unknown error starting step tracker'
        }));
      }

      isStartingRef.current = false;
      return false;
    }
  }, [processStepData]);

  // Request permission - simply attempts to start tracking
  // We can't call requestPermissions() due to NPE bug, but startMeasurementUpdates()
  // will trigger the system permission dialog if permission hasn't been granted
  const requestPermission = useCallback(async (): Promise<boolean> => {
    console.log('[StepTracker] requestPermission called - attempting startTracking');
    const result = await startTracking();
    
    if (!result && state.permissionStatus === 'denied') {
      toast({
        title: "Permission Required",
        description: "Please enable Physical Activity in your device Settings, then return to the app.",
        variant: "destructive"
      });
    }
    
    return result;
  }, [startTracking, state.permissionStatus]);

  // Stop tracking
  const stopTracking = useCallback(async () => {
    try {
      await CapacitorPedometer.stopMeasurementUpdates();
    } catch (e) { /* ignore */ }

    if (listenerRef.current) {
      try { listenerRef.current.remove(); } catch (e) { /* ignore */ }
      listenerRef.current = null;
    }

    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isTracking: false }));
    }

    console.log('[StepTracker] Stopped');
  }, []);

  // Initialize on mount
  useEffect(() => {
    isMountedRef.current = true;

    if (!Capacitor.isNativePlatform()) {
      setState(prev => ({ 
        ...prev, 
        permissionStatus: 'unavailable' 
      }));
      return;
    }

    // Load persisted data first
    loadPersistedData();

    // Auto-start tracking after a brief delay
    const timer = setTimeout(() => {
      console.log('[StepTracker] Auto-starting...');
      startTracking();
    }, 500);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      // Don't stop tracking on unmount - let it persist across navigation
    };
  }, [loadPersistedData, startTracking]);

  // App state change listener - restart tracking on resume
  // This is the "Hardware Sync" - when app resumes, we re-query the sensor
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let appStateListener: { remove: () => void } | null = null;

    const setupListener = async () => {
      try {
        appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
          console.log('[StepTracker] App state changed:', isActive ? 'ACTIVE' : 'BACKGROUND');

          if (isActive && isMountedRef.current) {
            // App resumed - check for new day first
            loadPersistedData();
            
            // Restart tracking (sensor listener pauses when app goes to background)
            // This syncs with TYPE_STEP_COUNTER which has been counting in hardware
            console.log('[StepTracker] 🔄 Resuming - syncing with hardware counter...');
            await startTracking();
          }
        });
        console.log('[StepTracker] App state listener registered');
      } catch (e) {
        console.error('[StepTracker] Failed to setup app state listener:', e);
      }
    };

    setupListener();

    return () => {
      if (appStateListener) {
        appStateListener.remove();
        console.log('[StepTracker] App state listener removed');
      }
    };
  }, [loadPersistedData, startTracking]);

  return {
    steps: state.steps,
    error: state.error,
    permissionStatus: state.permissionStatus,
    isTracking: state.isTracking,
    requestPermission,
    startTracking,
    stopTracking
  };
}
