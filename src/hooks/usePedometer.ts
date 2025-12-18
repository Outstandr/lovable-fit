import { useState, useEffect, useCallback, useRef } from 'react';
import { pedometerService } from '@/services/pedometerService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from './useOfflineSync';

const LOG_PREFIX = '[usePedometer]';

export type DataSource = 'pedometer' | 'unavailable';

interface PedometerState {
  steps: number;
  distance: number;
  calories: number;
  hasPermission: boolean;
  isTracking: boolean;
  error: string | null;
  platform: 'android' | 'ios' | 'web';
  dataSource: DataSource;
  isInitializing: boolean;
  lastUpdate: Date;
}

const PEDOMETER_POLL_INTERVAL = 3000; // 3 seconds

export function usePedometer() {
  const { user } = useAuth();
  const { isOnline, queueStepData } = useOfflineSync();
  const [state, setState] = useState<PedometerState>({
    steps: 0,
    distance: 0,
    calories: 0,
    hasPermission: false,
    isTracking: false,
    error: null,
    platform: pedometerService.getPlatform(),
    dataSource: 'unavailable',
    isInitializing: true,
    lastUpdate: new Date(),
  });

  const lastSyncSteps = useRef(0);

  // Load today's steps from database on login
  useEffect(() => {
    const loadTodaySteps = async () => {
      if (!user) return;
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_steps')
        .select('steps, distance_km, calories')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();
      
      if (data && !error) {
        console.log(`${LOG_PREFIX} Loaded today steps from DB:`, data.steps);
        setState(prev => ({
          ...prev,
          steps: data.steps || 0,
          distance: data.distance_km || 0,
          calories: data.calories || 0,
        }));
        lastSyncSteps.current = data.steps || 0;
      }
    };
    
    if (user) {
      loadTodaySteps();
    }
  }, [user]);

  // AUTOMATIC INITIALIZATION - Start pedometer immediately on app launch
  useEffect(() => {
    const platform = pedometerService.getPlatform();
    
    if (platform === 'web') {
      console.log(`${LOG_PREFIX} Web platform, skipping initialization`);
      setState(prev => ({ ...prev, isInitializing: false }));
      return;
    }

    const init = async () => {
      console.log(`${LOG_PREFIX} === STARTING PEDOMETER TRACKING ===`);
      
      try {
        // Start pedometer (automatically requests ACTIVITY_RECOGNITION permission)
        const started = await pedometerService.start();
        
        if (started) {
          console.log(`${LOG_PREFIX} ✅ Pedometer started successfully`);
          setState(prev => ({
            ...prev,
            dataSource: 'pedometer',
            isTracking: true,
            hasPermission: true,
            isInitializing: false,
            lastUpdate: new Date(),
          }));
        } else {
          console.log(`${LOG_PREFIX} ⚠️ Pedometer failed to start (permission denied or no sensor)`);
          setState(prev => ({
            ...prev,
            dataSource: 'unavailable',
            isTracking: false,
            hasPermission: false,
            isInitializing: false,
          }));
        }
      } catch (error) {
        console.error(`${LOG_PREFIX} Initialization error:`, error);
        setState(prev => ({
          ...prev,
          dataSource: 'unavailable',
          isInitializing: false,
        }));
      }
    };

    // Start immediately (no delay)
    init();
  }, []);

  // AUTOMATIC POLLING - Update steps every 3 seconds
  useEffect(() => {
    if (state.platform === 'web' || state.isInitializing) {
      return;
    }

    if (state.dataSource !== 'pedometer') {
      console.log(`${LOG_PREFIX} Pedometer not active, skipping poll`);
      return;
    }

    console.log(`${LOG_PREFIX} Starting pedometer poll every 3 seconds`);

    const poll = async () => {
      try {
        await pedometerService.fetchSteps();
        const serviceState = pedometerService.getState();
        
        setState(prev => ({
          ...prev,
          steps: serviceState.steps,
          distance: serviceState.distance,
          calories: serviceState.calories,
          lastUpdate: new Date(),
        }));
      } catch (error) {
        console.error(`${LOG_PREFIX} Poll error:`, error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const interval = setInterval(poll, PEDOMETER_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [state.dataSource, state.isInitializing, state.platform]);

  // AUTOMATIC DATABASE SYNC - Every 100 steps
  useEffect(() => {
    if (!user || state.steps === 0) return;
    
    if (state.steps - lastSyncSteps.current >= 100) {
      lastSyncSteps.current = state.steps;
      syncToDatabase();
    }
  }, [state.steps, user]);

  const syncToDatabase = useCallback(async (): Promise<void> => {
    if (!user || state.steps === 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`${LOG_PREFIX} Syncing ${state.steps} steps to database`);
    
    // If offline, queue for later sync
    if (!isOnline) {
      console.log(`${LOG_PREFIX} Offline, queuing step data`);
      queueStepData(today, state.steps, state.distance, state.calories);
      lastSyncSteps.current = state.steps;
      return;
    }
    
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
        console.error(`${LOG_PREFIX} Database sync error:`, error);
        // Queue if sync fails
        queueStepData(today, state.steps, state.distance, state.calories);
      } else {
        lastSyncSteps.current = state.steps;
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Database sync error:`, error);
      queueStepData(today, state.steps, state.distance, state.calories);
    }
  }, [user, state.steps, state.distance, state.calories, isOnline, queueStepData]);

  // For Active Session use
  const startTracking = useCallback(async (): Promise<boolean> => {
    if (state.dataSource === 'pedometer') {
      return true; // Already tracking
    }
    
    const started = await pedometerService.start();
    if (started) {
      setState(prev => ({ ...prev, isTracking: true, dataSource: 'pedometer' }));
    }
    return started;
  }, [state.dataSource]);

  const stopTracking = useCallback(async (): Promise<void> => {
    await pedometerService.stop();
    setState(prev => ({ ...prev, isTracking: false }));
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
    lastUpdate: state.lastUpdate,
    dataSource: state.dataSource,
    isInitializing: state.isInitializing,
    
    // Actions
    startTracking,
    stopTracking,
    syncToDatabase,
  };
}
