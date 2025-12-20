import { useState, useEffect, useCallback, useRef } from 'react';
import { healthService, DataSource, Platform } from '@/services/healthService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from './useOfflineSync';
import { toast } from 'sonner';
import { haptics } from '@/utils/haptics';

const LOG_PREFIX = '[useHealth]';

interface HealthState {
  steps: number;
  distance: number;
  calories: number;
  hasPermission: boolean;
  isTracking: boolean;
  error: string | null;
  platform: Platform;
  dataSource: DataSource;
  isInitializing: boolean;
  lastUpdate: Date;
}

const HEALTH_POLL_INTERVAL = 30000; // 30 seconds (health data doesn't update as frequently)

export function useHealth() {
  const { user } = useAuth();
  const { isOnline, queueStepData } = useOfflineSync();
  const [state, setState] = useState<HealthState>({
    steps: 0,
    distance: 0,
    calories: 0,
    hasPermission: false,
    isTracking: false,
    error: null,
    platform: healthService.getPlatform(),
    dataSource: 'unavailable',
    isInitializing: true,
    lastUpdate: new Date(),
  });

  const lastSyncSteps = useRef(0);
  const hasHit10K = useRef(false);
  const lastCelebrationDay = useRef('');

  // 10K Milestone Celebration
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // Reset celebration flag for new day
    if (lastCelebrationDay.current !== today) {
      hasHit10K.current = false;
      lastCelebrationDay.current = today;
    }
    
    // Celebrate 10K milestone once per day
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
      
      try {
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
          
          // Check if already hit 10K today
          if (data.steps >= 10000) {
            hasHit10K.current = true;
            lastCelebrationDay.current = today;
          }
        }
      } catch (error) {
        console.error(`${LOG_PREFIX} Error loading today steps:`, error);
      }
    };
    
    if (user) {
      loadTodaySteps();
    }
  }, [user]);

  // AUTOMATIC INITIALIZATION - Start health service on app launch
  // Only after onboarding is complete to avoid permission conflicts
  useEffect(() => {
    const platform = healthService.getPlatform();
    
    if (platform === 'web') {
      console.log(`${LOG_PREFIX} Web platform, skipping initialization`);
      setState(prev => ({ ...prev, isInitializing: false }));
      return;
    }

    // CRITICAL: Skip if currently on onboarding page
    if (window.location.pathname === '/onboarding') {
      console.log(`${LOG_PREFIX} On onboarding page, skipping auto-init`);
      setState(prev => ({ ...prev, isInitializing: false }));
      return;
    }

    // CRITICAL: Skip if onboarding hasn't been completed yet
    const onboardingCompleted = localStorage.getItem('device_onboarding_completed') === 'true';
    if (!onboardingCompleted) {
      console.log(`${LOG_PREFIX} Onboarding not completed, skipping auto-init`);
      setState(prev => ({ ...prev, isInitializing: false }));
      return;
    }

    // Delay initialization slightly to let page settle
    const timer = setTimeout(async () => {
      console.log(`${LOG_PREFIX} === STARTING HEALTH TRACKING ===`);
      
      try {
        const started = await healthService.start();
        
        if (started) {
          console.log(`${LOG_PREFIX} ✅ Health service started successfully`);
          
          // Fetch initial data
          const data = await healthService.readTodayData();
          
          setState(prev => ({
            ...prev,
            dataSource: 'health',
            isTracking: true,
            hasPermission: true,
            isInitializing: false,
            lastUpdate: new Date(),
            steps: data?.steps || prev.steps,
            distance: data?.distance || prev.distance,
            calories: data?.calories || prev.calories,
          }));
        } else {
          console.log(`${LOG_PREFIX} ⚠️ Health service failed to start`);
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
    }, 1500); // 1.5 second delay to let onboarding complete first

    return () => clearTimeout(timer);
  }, []);

  // AUTOMATIC POLLING - Update health data periodically
  useEffect(() => {
    if (state.platform === 'web' || state.isInitializing) {
      return;
    }

    if (state.dataSource !== 'health') {
      console.log(`${LOG_PREFIX} Health not active, skipping poll`);
      return;
    }

    console.log(`${LOG_PREFIX} Starting health poll every 30 seconds`);

    const poll = async () => {
      try {
        const data = await healthService.readTodayData();
        
        if (data) {
          setState(prev => ({
            ...prev,
            steps: data.steps,
            distance: data.distance,
            calories: data.calories,
            lastUpdate: new Date(),
          }));
        }
      } catch (error) {
        console.error(`${LOG_PREFIX} Poll error:`, error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const interval = setInterval(poll, HEALTH_POLL_INTERVAL);
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
        queueStepData(today, state.steps, state.distance, state.calories);
      } else {
        lastSyncSteps.current = state.steps;
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Database sync error:`, error);
      queueStepData(today, state.steps, state.distance, state.calories);
    }
  }, [user, state.steps, state.distance, state.calories, isOnline, queueStepData]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await healthService.requestPermission();
      if (granted) {
        setState(prev => ({ ...prev, hasPermission: true }));
      }
      return granted;
    } catch (error) {
      console.error(`${LOG_PREFIX} requestPermission error:`, error);
      return false;
    }
  }, []);

  const startTracking = useCallback(async (): Promise<boolean> => {
    try {
      if (state.dataSource === 'health') {
        return true; // Already tracking
      }
      
      const started = await healthService.start();
      if (started) {
        setState(prev => ({ ...prev, isTracking: true, dataSource: 'health', hasPermission: true }));
      }
      return started;
    } catch (error) {
      console.error(`${LOG_PREFIX} startTracking error:`, error);
      return false;
    }
  }, [state.dataSource]);

  const stopTracking = useCallback((): void => {
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
    requestPermission,
    startTracking,
    stopTracking,
    syncToDatabase,
  };
}
