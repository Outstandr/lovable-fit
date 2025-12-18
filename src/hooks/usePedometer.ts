import { useState, useEffect, useCallback, useRef } from 'react';
import { pedometerService } from '@/services/pedometerService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from './useOfflineSync';
import { toast } from 'sonner';
import { haptics } from '@/utils/haptics';

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

// Faster polling for smoother updates
const PEDOMETER_POLL_INTERVAL = 1500; // 1.5 seconds (was 3s)
const SYNC_THRESHOLD = 50; // Sync every 50 steps (was 100)
const SMOOTHING_FACTOR = 0.3; // For interpolating step changes

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
  const hasHit10K = useRef(false);
  const lastCelebrationDay = useRef('');
  const baselineSteps = useRef(0); // Steps when tracking started
  const dbSteps = useRef(0); // Steps loaded from database
  const lastRawSteps = useRef(0); // Last raw step count from sensor
  const smoothedSteps = useRef(0); // Smoothed step count for display

  // 10K Milestone Celebration
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    if (lastCelebrationDay.current !== today) {
      hasHit10K.current = false;
      lastCelebrationDay.current = today;
    }
    
    if (state.steps >= 10000 && !hasHit10K.current) {
      hasHit10K.current = true;
      haptics.success();
      
      toast.success('🎉 MILESTONE ACHIEVED!', {
        description: '10,000 steps completed! Outstanding work!',
        duration: 5000,
      });
      
      console.log(`${LOG_PREFIX} 🎉 10K milestone reached!`);
    }
  }, [state.steps]);

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
        dbSteps.current = data.steps || 0;
        smoothedSteps.current = data.steps || 0;
        
        setState(prev => ({
          ...prev,
          steps: data.steps || 0,
          distance: data.distance_km || 0,
          calories: data.calories || 0,
        }));
        lastSyncSteps.current = data.steps || 0;
        
        if (data.steps >= 10000) {
          hasHit10K.current = true;
          lastCelebrationDay.current = today;
        }
      }
    };
    
    if (user) {
      loadTodaySteps();
    }
  }, [user]);

  // AUTOMATIC INITIALIZATION
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
        const started = await pedometerService.start();
        
        if (started) {
          console.log(`${LOG_PREFIX} ✅ Pedometer started successfully`);
          
          // Get initial step count as baseline
          const initialSteps = await pedometerService.fetchSteps();
          baselineSteps.current = initialSteps;
          console.log(`${LOG_PREFIX} Baseline steps: ${baselineSteps.current}`);
          
          setState(prev => ({
            ...prev,
            dataSource: 'pedometer',
            isTracking: true,
            hasPermission: true,
            isInitializing: false,
            lastUpdate: new Date(),
          }));
        } else {
          console.log(`${LOG_PREFIX} ⚠️ Pedometer failed to start`);
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

    init();
  }, []);

  // SMOOTH POLLING - Update steps with interpolation
  useEffect(() => {
    if (state.platform === 'web' || state.isInitializing) {
      return;
    }

    if (state.dataSource !== 'pedometer') {
      console.log(`${LOG_PREFIX} Pedometer not active, skipping poll`);
      return;
    }

    console.log(`${LOG_PREFIX} Starting smooth pedometer poll every ${PEDOMETER_POLL_INTERVAL}ms`);

    const poll = async () => {
      try {
        const rawSteps = await pedometerService.fetchSteps();
        
        // Calculate session steps (steps since tracking started)
        const sessionSteps = Math.max(0, rawSteps - baselineSteps.current);
        
        // Total steps = database steps + session steps
        const totalSteps = dbSteps.current + sessionSteps;
        
        // Only update if steps have changed
        if (totalSteps !== lastRawSteps.current) {
          lastRawSteps.current = totalSteps;
          
          // Smooth the step count for display (prevents jarring jumps)
          const diff = totalSteps - smoothedSteps.current;
          if (Math.abs(diff) > 100) {
            // Large jump - animate quickly but not instantly
            smoothedSteps.current = Math.round(smoothedSteps.current + diff * 0.5);
          } else {
            // Small change - instant update
            smoothedSteps.current = totalSteps;
          }
          
          const distance = (smoothedSteps.current * 0.762) / 1000;
          const calories = Math.round(smoothedSteps.current * 0.04);
          
          setState(prev => ({
            ...prev,
            steps: smoothedSteps.current,
            distance,
            calories,
            lastUpdate: new Date(),
          }));
        }
      } catch (error) {
        console.error(`${LOG_PREFIX} Poll error:`, error);
      }
    };

    // Initial poll
    poll();

    // Set up fast polling interval
    const interval = setInterval(poll, PEDOMETER_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [state.dataSource, state.isInitializing, state.platform]);

  // Removed: Catch-up animation was causing infinite loop

  // AUTOMATIC DATABASE SYNC - Every 50 steps
  useEffect(() => {
    if (!user || state.steps === 0) return;
    
    if (state.steps - lastSyncSteps.current >= SYNC_THRESHOLD) {
      lastSyncSteps.current = state.steps;
      syncToDatabase();
    }
  }, [state.steps, user]);

  const syncToDatabase = useCallback(async (): Promise<void> => {
    if (!user || state.steps === 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`${LOG_PREFIX} Syncing ${state.steps} steps to database`);
    
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
        queueStepData(today, state.steps, state.distance, state.calories);
      } else {
        lastSyncSteps.current = state.steps;
        // Update dbSteps to current value to prevent double counting on restart
        dbSteps.current = state.steps;
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Database sync error:`, error);
      queueStepData(today, state.steps, state.distance, state.calories);
    }
  }, [user, state.steps, state.distance, state.calories, isOnline, queueStepData]);

  const startTracking = useCallback(async (): Promise<boolean> => {
    if (state.dataSource === 'pedometer') {
      return true;
    }
    
    const started = await pedometerService.start();
    if (started) {
      baselineSteps.current = await pedometerService.fetchSteps();
      setState(prev => ({ ...prev, isTracking: true, dataSource: 'pedometer' }));
    }
    return started;
  }, [state.dataSource]);

  const stopTracking = useCallback(async (): Promise<void> => {
    await pedometerService.stop();
    setState(prev => ({ ...prev, isTracking: false }));
  }, []);

  // Force refresh
  const refresh = useCallback(async () => {
    if (state.dataSource === 'pedometer') {
      await pedometerService.fetchSteps();
      const serviceState = pedometerService.getState();
      
      const sessionSteps = Math.max(0, serviceState.steps - baselineSteps.current);
      const totalSteps = dbSteps.current + sessionSteps;
      
      smoothedSteps.current = totalSteps;
      lastRawSteps.current = totalSteps;
      
      setState(prev => ({
        ...prev,
        steps: totalSteps,
        distance: (totalSteps * 0.762) / 1000,
        calories: Math.round(totalSteps * 0.04),
        lastUpdate: new Date(),
      }));
    }
  }, [state.dataSource]);

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
    refresh,
  };
}
