import { useState, useEffect, useCallback, useRef } from 'react';
import { pedometerService } from '@/services/pedometerService';
import { healthConnectService, DataSource, HealthConnectStatus } from '@/services/healthConnectService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const LOG_PREFIX = '[usePedometer]';

interface PedometerState {
  steps: number;
  distance: number;
  calories: number;
  hasPermission: boolean;
  isTracking: boolean;
  error: string | null;
  platform: 'android' | 'ios' | 'web';
  // Health Connect specific
  dataSource: DataSource;
  healthConnectAvailable: HealthConnectStatus;
  healthConnectPermissionGranted: boolean;
  isInitializing: boolean;
}

const HEALTH_CONNECT_POLL_INTERVAL = 30000; // 30 seconds
const PEDOMETER_POLL_INTERVAL = 3000; // 3 seconds

export function usePedometer() {
  const { user } = useAuth();
  const [state, setState] = useState<PedometerState>({
    steps: 0,
    distance: 0,
    calories: 0,
    hasPermission: false,
    isTracking: false,
    error: null,
    platform: pedometerService.getPlatform(),
    dataSource: 'unavailable',
    healthConnectAvailable: 'Unknown',
    healthConnectPermissionGranted: false,
    isInitializing: true,
  });

  const healthConnectSetupShown = useRef(false);
  const lastSyncSteps = useRef(0);

  // Check Health Connect availability and try to use it
  const tryHealthConnect = useCallback(async (): Promise<boolean> => {
    console.log(`${LOG_PREFIX} Trying Health Connect...`);
    
    const availability = await healthConnectService.checkAvailability();
    setState(prev => ({ ...prev, healthConnectAvailable: availability }));

    if (availability !== 'Available') {
      console.log(`${LOG_PREFIX} Health Connect not available: ${availability}`);
      return false;
    }

    // Check if we already have permission
    const hasPermission = await healthConnectService.checkPermission();
    
    if (hasPermission) {
      console.log(`${LOG_PREFIX} Health Connect ready!`);
      setState(prev => ({ 
        ...prev, 
        healthConnectPermissionGranted: true,
        dataSource: 'healthconnect',
        hasPermission: true,
      }));
      return true;
    }

    // Permission not granted yet - will be requested when user starts tracking
    console.log(`${LOG_PREFIX} Health Connect available but needs permission (will request on start)`);
    return false;
  }, []);

  // Request Health Connect permission (called automatically when starting tracking)
  const requestHealthConnectPermission = useCallback(async (): Promise<boolean> => {
    console.log(`${LOG_PREFIX} Requesting Health Connect permission...`);
    
    const granted = await healthConnectService.requestPermission();
    
    if (granted) {
      setState(prev => ({
        ...prev,
        healthConnectPermissionGranted: true,
        dataSource: 'healthconnect',
        hasPermission: true,
        error: null,
      }));
      toast.success('Health Connect activated!');
      return true;
    } else {
      console.log(`${LOG_PREFIX} Health Connect permission denied, falling back to pedometer`);
      // Silently fall back - no toast to avoid spam
      return false;
    }
  }, []);

  // Fetch steps from Health Connect
  const fetchHealthConnectSteps = useCallback(async (): Promise<boolean> => {
    const data = await healthConnectService.readTodaySteps();
    
    if (data === null) {
      return false;
    }

    const distance = (data.steps * 0.762) / 1000; // Convert to km
    
    setState(prev => ({
      ...prev,
      steps: data.steps,
      calories: data.calories,
      distance,
    }));

    return true;
  }, []);

  // Fallback to pedometer
  const startPedometerFallback = useCallback(async (): Promise<boolean> => {
    console.log(`${LOG_PREFIX} Starting pedometer fallback...`);
    
    const started = await pedometerService.start();
    
    if (started) {
      setState(prev => ({
        ...prev,
        dataSource: 'pedometer',
        isTracking: true,
        hasPermission: true,
      }));
      
      return true;
    }
    
    return false;
  }, []);

  // Main initialization
  useEffect(() => {
    const platform = pedometerService.getPlatform();
    
    if (platform === 'web') {
      console.log(`${LOG_PREFIX} Web platform, skipping initialization`);
      setState(prev => ({ ...prev, isInitializing: false }));
      return;
    }

    const init = async () => {
      console.log(`${LOG_PREFIX} === INITIALIZATION BEGIN ===`);
      
      // Try Health Connect first
      const healthConnectReady = await tryHealthConnect();
      
      if (healthConnectReady) {
        console.log(`${LOG_PREFIX} Using Health Connect as data source`);
        await fetchHealthConnectSteps();
        setState(prev => ({ ...prev, isInitializing: false, isTracking: true }));
        return;
      }

      // Check if Health Connect is available but needs permission
      const availability = await healthConnectService.checkAvailability();
      if (availability === 'Available') {
        // Permission will be requested when user starts tracking
        setState(prev => ({ 
          ...prev, 
          isInitializing: false,
          healthConnectAvailable: availability,
        }));
        return;
      }

      // Fall back to pedometer
      await startPedometerFallback();
      setState(prev => ({ ...prev, isInitializing: false }));
    };

    const timer = setTimeout(init, 1500);
    return () => clearTimeout(timer);
  }, [tryHealthConnect, fetchHealthConnectSteps, startPedometerFallback]);

  // Polling for step updates
  useEffect(() => {
    if (state.platform === 'web' || state.isInitializing) {
      return;
    }

    if (state.dataSource === 'unavailable') {
      return;
    }

    const pollInterval = state.dataSource === 'healthconnect' 
      ? HEALTH_CONNECT_POLL_INTERVAL 
      : PEDOMETER_POLL_INTERVAL;

    console.log(`${LOG_PREFIX} Starting ${state.dataSource} poll every ${pollInterval / 1000}s`);

    const poll = async () => {
      try {
        if (state.dataSource === 'healthconnect') {
          const success = await fetchHealthConnectSteps();
          if (!success) {
            // Health Connect failed, switch to pedometer
            console.log(`${LOG_PREFIX} Health Connect failed, switching to pedometer`);
            toast.warning('Switched to phone sensor');
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
  }, [state.dataSource, state.isInitializing, state.platform, fetchHealthConnectSteps, startPedometerFallback]);

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

  // Start tracking - automatically requests permissions if needed
  const startTracking = useCallback(async (): Promise<boolean> => {
    console.log(`${LOG_PREFIX} startTracking called, current dataSource: ${state.dataSource}`);
    
    // If already using Health Connect, just mark as tracking
    if (state.dataSource === 'healthconnect') {
      setState(prev => ({ ...prev, isTracking: true }));
      return true;
    }
    
    // If Health Connect is available but not yet connected, try to get permission automatically
    if (state.healthConnectAvailable === 'Available' && !state.healthConnectPermissionGranted) {
      console.log(`${LOG_PREFIX} Attempting Health Connect permission request...`);
      const granted = await requestHealthConnectPermission();
      
      if (granted) {
        await fetchHealthConnectSteps();
        setState(prev => ({ ...prev, isTracking: true }));
        return true;
      }
      
      // Permission denied - silently fall back to pedometer
      console.log(`${LOG_PREFIX} Permission denied, falling back to pedometer`);
    }
    
    // Fall back to pedometer
    const started = await pedometerService.start();
    if (started) {
      setState(prev => ({ 
        ...prev, 
        isTracking: true, 
        hasPermission: true,
        dataSource: 'pedometer',
      }));
    }
    return started;
  }, [state.dataSource, state.healthConnectAvailable, state.healthConnectPermissionGranted, requestHealthConnectPermission, fetchHealthConnectSteps]);

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
    hasPermission: state.hasPermission,
    isTracking: state.isTracking,
    error: state.error,
    platform: state.platform,
    
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
  };
}