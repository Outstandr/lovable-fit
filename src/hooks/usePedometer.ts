import { useState, useEffect, useCallback, useRef } from 'react';
import { pedometerService } from '@/services/pedometerService';
import { healthConnectService, DataSource, HealthConnectStatus } from '@/services/healthConnectService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const LOG_PREFIX = '[usePedometer]';

interface PedometerState {
  steps: number;
  distance: number;
  calories: number;
  activeCalories: number;
  avgSpeed: number;
  maxSpeed: number;
  hasPermission: boolean;
  isTracking: boolean;
  error: string | null;
  platform: 'android' | 'ios' | 'web';
  // Health Connect specific
  dataSource: DataSource;
  healthConnectAvailable: HealthConnectStatus;
  healthConnectPermissionGranted: boolean;
  isInitializing: boolean;
  lastUpdate: Date;
}

const HEALTH_CONNECT_POLL_INTERVAL = 30000; // 30 seconds
const PEDOMETER_POLL_INTERVAL = 3000; // 3 seconds

export function usePedometer() {
  const { user } = useAuth();
  const [state, setState] = useState<PedometerState>({
    steps: 0,
    distance: 0,
    calories: 0,
    activeCalories: 0,
    avgSpeed: 0,
    maxSpeed: 0,
    hasPermission: false,
    isTracking: false,
    error: null,
    platform: pedometerService.getPlatform(),
    dataSource: 'unavailable',
    healthConnectAvailable: 'Unknown',
    healthConnectPermissionGranted: false,
    isInitializing: true,
    lastUpdate: new Date(),
  });

  const lastSyncSteps = useRef(0);

  // Fetch health data from Health Connect
  const fetchHealthConnectData = useCallback(async (): Promise<boolean> => {
    try {
      const data = await healthConnectService.readTodayHealthData();
      
      if (data === null) {
        return false;
      }

      setState(prev => ({
        ...prev,
        steps: data.steps,
        distance: data.distance > 0 ? data.distance : (data.steps * 0.762) / 1000,
        calories: data.totalCalories,
        activeCalories: data.activeCalories,
        avgSpeed: data.avgSpeed,
        maxSpeed: data.maxSpeed,
        lastUpdate: new Date(),
      }));

      return true;
    } catch (error) {
      console.error(`${LOG_PREFIX} fetchHealthConnectData error:`, error);
      return false;
    }
  }, []);

  // Fallback to pedometer
  const startPedometerFallback = useCallback(async (): Promise<boolean> => {
    console.log(`${LOG_PREFIX} Starting pedometer fallback...`);
    
    try {
      const started = await pedometerService.start();
      
      if (started) {
        console.log(`${LOG_PREFIX} Pedometer started successfully`);
        setState(prev => ({
          ...prev,
          dataSource: 'pedometer',
          isTracking: true,
          hasPermission: true,
          lastUpdate: new Date(),
          error: null,
        }));
        
        return true;
      } else {
        console.log(`${LOG_PREFIX} Pedometer failed to start - permission likely denied`);
        setState(prev => ({
          ...prev,
          dataSource: 'unavailable',
          isTracking: false,
          hasPermission: false,
          error: 'Physical Activity permission required for step tracking',
        }));
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Pedometer start error:`, error);
      setState(prev => ({
        ...prev,
        dataSource: 'unavailable',
        isTracking: false,
        error: 'Step tracking unavailable',
      }));
    }
    
    return false;
  }, []);

  // Main initialization - AUTOMATIC tracking on app launch
  useEffect(() => {
    const platform = pedometerService.getPlatform();
    
    if (platform === 'web') {
      console.log(`${LOG_PREFIX} Web platform, skipping initialization`);
      setState(prev => ({ ...prev, isInitializing: false }));
      return;
    }

    const init = async () => {
      console.log(`${LOG_PREFIX} === AUTOMATIC TRACKING INITIALIZATION ===`);
      
      // Check Health Connect availability
      const availability = await healthConnectService.checkAvailability();
      setState(prev => ({ ...prev, healthConnectAvailable: availability }));
      
      if (availability === 'Available') {
        // Check if we already have permission
        const hasPermission = await healthConnectService.checkPermission();
        
        if (hasPermission) {
          console.log(`${LOG_PREFIX} Health Connect ready - starting automatic tracking`);
          const success = await fetchHealthConnectData();
          setState(prev => ({ 
            ...prev, 
            isInitializing: false,
            dataSource: success ? 'healthconnect' : 'pedometer',
            hasPermission: true,
            healthConnectPermissionGranted: success,
            isTracking: true,
          }));
          
          if (!success) {
            // Health Connect failed to read, fall back to pedometer
            await startPedometerFallback();
          }
          return;
        }
        
        // Permission not yet granted - will be auto-requested by HealthConnectPrompt
        console.log(`${LOG_PREFIX} Health Connect available, waiting for permission request`);
        setState(prev => ({ 
          ...prev, 
          isInitializing: false,
          healthConnectAvailable: availability,
        }));
        return;
      }
      
      // Health Connect not available - start pedometer automatically
      console.log(`${LOG_PREFIX} Health Connect not available, starting pedometer`);
      await startPedometerFallback();
      setState(prev => ({ ...prev, isInitializing: false }));
    };

    const timer = setTimeout(init, 1000);
    return () => clearTimeout(timer);
  }, [fetchHealthConnectData, startPedometerFallback]);

  // Polling for step updates - ALWAYS runs when data source is available
  useEffect(() => {
    if (state.platform === 'web' || state.isInitializing) {
      return;
    }

    if (state.dataSource === 'unavailable') {
      console.log(`${LOG_PREFIX} No data source, skipping poll`);
      return;
    }

    const pollInterval = state.dataSource === 'healthconnect' 
      ? HEALTH_CONNECT_POLL_INTERVAL 
      : PEDOMETER_POLL_INTERVAL;

    console.log(`${LOG_PREFIX} Starting ${state.dataSource} poll every ${pollInterval / 1000}s`);

    const poll = async () => {
      try {
        if (state.dataSource === 'healthconnect') {
          const success = await fetchHealthConnectData();
          if (!success) {
            console.log(`${LOG_PREFIX} Health Connect poll failed - switching to pedometer`);
            await startPedometerFallback();
          }
        } else if (state.dataSource === 'pedometer') {
          await pedometerService.fetchSteps();
          const serviceState = pedometerService.getState();
          
          setState(prev => ({
            ...prev,
            steps: serviceState.steps,
            distance: serviceState.distance,
            calories: serviceState.calories,
            lastUpdate: new Date(),
          }));
        }
      } catch (error) {
        console.error(`${LOG_PREFIX} Poll error:`, error);
      }
    };

    // Initial poll
    poll();

    const interval = setInterval(poll, pollInterval);
    return () => clearInterval(interval);
  }, [state.dataSource, state.isInitializing, state.platform, fetchHealthConnectData, startPedometerFallback]);

  // Sync to database when steps change significantly
  useEffect(() => {
    if (!user || state.steps === 0) return;
    
    // Sync every 100 steps
    if (state.steps - lastSyncSteps.current >= 100) {
      lastSyncSteps.current = state.steps;
      syncToDatabase();
    }
  }, [state.steps, user]);

  // Sync to database
  const syncToDatabase = useCallback(async (): Promise<void> => {
    if (!user || state.steps === 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`${LOG_PREFIX} syncToDatabase: ${state.steps} steps for ${today}`);
    
    try {
      const { error } = await supabase
        .from('daily_steps')
        .upsert({
          user_id: user.id,
          date: today,
          steps: state.steps,
          distance_km: state.distance,
          calories: state.calories,
          target_hit: state.steps >= 10000
        }, { onConflict: 'user_id,date' });
      
      if (error) {
        console.error(`${LOG_PREFIX} syncToDatabase error:`, error);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} syncToDatabase error:`, error);
    }
  }, [user, state.steps, state.distance, state.calories]);

  // Skip Health Connect and use pedometer only
  const skipHealthConnect = useCallback(async () => {
    localStorage.setItem('healthConnectSetupDismissed', 'true');
    await startPedometerFallback();
  }, [startPedometerFallback]);

  // Request Health Connect permission (called by HealthConnectPrompt)
  const requestHealthConnectPermission = useCallback(async (): Promise<boolean> => {
    console.log(`${LOG_PREFIX} Requesting Health Connect permission...`);
    
    try {
      const granted = await healthConnectService.requestPermission();
      
      if (granted) {
        console.log(`${LOG_PREFIX} Permission granted - starting Health Connect tracking`);
        const success = await fetchHealthConnectData();
        
        setState(prev => ({
          ...prev,
          healthConnectPermissionGranted: true,
          dataSource: success ? 'healthconnect' : 'pedometer',
          hasPermission: true,
          isTracking: true,
          error: null,
        }));
        
        if (!success) {
          await startPedometerFallback();
        }
        
        return true;
      } else {
        console.log(`${LOG_PREFIX} Permission denied - falling back to pedometer`);
        await startPedometerFallback();
        return false;
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Permission request error:`, error);
      await startPedometerFallback();
      return false;
    }
  }, [fetchHealthConnectData, startPedometerFallback]);

  // Start tracking - for Active Session use
  const startTracking = useCallback(async (): Promise<boolean> => {
    console.log(`${LOG_PREFIX} startTracking called, current dataSource: ${state.dataSource}`);
    
    // If already using Health Connect, confirm tracking
    if (state.dataSource === 'healthconnect') {
      setState(prev => ({ ...prev, isTracking: true }));
      return true;
    }
    
    // If using pedometer, it's already running
    if (state.dataSource === 'pedometer') {
      setState(prev => ({ ...prev, isTracking: true }));
      return true;
    }
    
    // Try Health Connect first if available
    if (state.healthConnectAvailable === 'Available' && !state.healthConnectPermissionGranted) {
      const granted = await requestHealthConnectPermission();
      if (granted) {
        return true;
      }
    }
    
    // Fall back to pedometer
    return await startPedometerFallback();
  }, [state.dataSource, state.healthConnectAvailable, state.healthConnectPermissionGranted, requestHealthConnectPermission, startPedometerFallback]);

  // Stop tracking
  const stopTracking = useCallback(async (): Promise<void> => {
    if (state.dataSource === 'pedometer') {
      await pedometerService.stop();
    }
    setState(prev => ({ ...prev, isTracking: false }));
  }, [state.dataSource]);

  // Open Health Connect settings
  const openHealthConnectSettings = useCallback(async () => {
    await healthConnectService.openSettings();
  }, []);

  return {
    // State
    steps: state.steps,
    distance: state.distance,
    calories: state.calories,
    activeCalories: state.activeCalories,
    avgSpeed: state.avgSpeed,
    maxSpeed: state.maxSpeed,
    hasPermission: state.hasPermission,
    isTracking: state.isTracking,
    error: state.error,
    platform: state.platform,
    lastUpdate: state.lastUpdate,
    
    // Health Connect specific
    dataSource: state.dataSource,
    healthConnectAvailable: state.healthConnectAvailable,
    healthConnectPermissionGranted: state.healthConnectPermissionGranted,
    isInitializing: state.isInitializing,
    
    // Actions
    skipHealthConnect,
    startTracking,
    stopTracking,
    syncToDatabase,
    openHealthConnectSettings,
    requestHealthConnectPermission,
  };
}
