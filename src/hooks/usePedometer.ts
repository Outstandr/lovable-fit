import { useState, useEffect, useCallback, useRef } from 'react';
import { stepTrackingService } from '@/services/stepTrackingService';
import { healthService } from '@/services/healthService';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { supabase } from '@/integrations/supabase/client';
import { haptics } from '@/utils/haptics';
import { useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { getLocalDateString } from '@/lib/utils';

const ONBOARDING_KEY = 'device_onboarding_completed';
const STEPS_PER_CALORIE = 20;
const SYNC_THRESHOLD = 50; // Sync to database every 50 steps

// Step validation constants
const MAX_STEPS_PER_UPDATE = 5000; // ~50 min of walking in one update is max realistic
const MAX_DAILY_STEPS = 100000;    // Ultra-marathon territory

// Midnight rollover storage key
const LAST_TRACKED_DATE_KEY = 'last_tracked_date';

export interface PedometerState {
  steps: number;
  distance: number;
  calories: number;
  isTracking: boolean;
  hasPermission: boolean;
  isInitializing: boolean;
  error: string | null;
  dataSource: 'pedometer' | 'database' | 'unavailable';
  lastUpdate: number | null;
}

export function usePedometer() {
  const { user } = useAuth();
  const { isOnline, queueStepData } = useOfflineSync();
  const location = useLocation();

  const [state, setState] = useState<PedometerState>({
    steps: 0,
    distance: 0,
    calories: 0,
    isTracking: false,
    hasPermission: false,
    isInitializing: true,
    error: null,
    dataSource: 'unavailable',
    lastUpdate: null
  });

  const lastSyncSteps = useRef<number>(0);
  const celebrated10K = useRef<string | null>(null);
  const baseSteps = useRef<number>(0);
  // Sensor baseline for TYPE_STEP_COUNTER (cumulative since boot)
  const sensorBaseline = useRef<number | null>(null);
  
  // Refs for background sync - ensures latest values are available in stale closures
  const backgroundSyncSteps = useRef<number>(0);
  const backgroundSyncDistance = useRef<number>(0);
  const backgroundSyncCalories = useRef<number>(0);

  // Midnight rollover tracking
  const lastTrackedDate = useRef<string>(
    localStorage.getItem(LAST_TRACKED_DATE_KEY) || getLocalDateString()
  );

  // Previous session steps for anomaly detection
  const previousSessionSteps = useRef<number>(0);

  // Daily goal tracking for target_hit calculation
  const dailyGoalRef = useRef<number>(10000);

  // Fetch user's daily goal for target_hit calculation
  useEffect(() => {
    const fetchGoal = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('daily_step_goal')
          .eq('id', user.id)
          .maybeSingle();
        if (data?.daily_step_goal) {
          dailyGoalRef.current = data.daily_step_goal;
          console.log('[usePedometer] Daily goal loaded:', dailyGoalRef.current);
        }
      } catch (e) {
        console.error('[usePedometer] Failed to load daily goal:', e);
      }
    };
    fetchGoal();
  }, [user]);

  // 10K Milestone Celebration
  useEffect(() => {
    const today = getLocalDateString();
    if (state.steps >= 10000 && celebrated10K.current !== today) {
      celebrated10K.current = today;
      haptics.success();
      console.log('[usePedometer] 🎉 10K milestone!');
    }
  }, [state.steps]);

  // Load Today's Steps from Database
  useEffect(() => {
    const loadTodayData = async () => {
      if (!user) {
        setState(prev => ({ ...prev, isInitializing: false }));
        return;
      }

      try {
        const today = getLocalDateString();
        const { data } = await supabase
          .from('daily_steps')
          .select('steps, distance_km, calories')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle();

        if (data) {
          console.log('[usePedometer] Loaded from DB:', data);
          baseSteps.current = data.steps || 0;
          lastSyncSteps.current = data.steps || 0;
          setState(prev => ({
            ...prev,
            steps: data.steps || 0,
            distance: data.distance_km || 0,
            calories: data.calories || 0,
            dataSource: 'database',
            isInitializing: false
          }));
        } else {
          setState(prev => ({ ...prev, isInitializing: false }));
        }
      } catch (error) {
        console.error('[usePedometer] Error loading data:', error);
        setState(prev => ({ ...prev, isInitializing: false }));
      }
    };

    loadTodayData();
  }, [user]);

  // Handle midnight rollover - sync previous day and reset counters
  const handleMidnightRollover = useCallback(async (previousDate: string, currentDate: string) => {
    console.log('[usePedometer] 🌙 Midnight rollover detected!', {
      previousDate,
      newDate: currentDate
    });

    // Force sync previous day's data before resetting
    if (user && backgroundSyncSteps.current > 0) {
      try {
        const targetHit = backgroundSyncSteps.current >= dailyGoalRef.current;
        await supabase.from('daily_steps').upsert({
          user_id: user.id,
          date: previousDate,
          steps: backgroundSyncSteps.current,
          distance_km: backgroundSyncDistance.current,
          calories: backgroundSyncCalories.current,
          target_hit: targetHit,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,date' });
        console.log('[usePedometer] ✅ Previous day synced on rollover:', backgroundSyncSteps.current, 'target_hit:', targetHit);
      } catch (e) {
        console.error('[usePedometer] Failed to sync on rollover:', e);
      }
    }

    // Reset all counters for new day
    baseSteps.current = 0;
    sensorBaseline.current = null; // Will be set on next sensor reading
    lastSyncSteps.current = 0;
    backgroundSyncSteps.current = 0;
    backgroundSyncDistance.current = 0;
    backgroundSyncCalories.current = 0;
    previousSessionSteps.current = 0;
    celebrated10K.current = null;

    // Update tracked date
    lastTrackedDate.current = currentDate;
    localStorage.setItem(LAST_TRACKED_DATE_KEY, currentDate);

    // Reset state
    setState(prev => ({
      ...prev,
      steps: 0,
      distance: 0,
      calories: 0
    }));
  }, [user]);

  // Initialize Background Step Tracking
  useEffect(() => {
    const isOnboarding = location.pathname === '/onboarding';
    const onboardingComplete = localStorage.getItem(ONBOARDING_KEY) === 'true';

    if (isOnboarding || !onboardingComplete) {
      console.log('[usePedometer] Skipping init - onboarding not complete');
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      console.log('[usePedometer] Web platform - skipping');
      return;
    }

    let isMounted = true;

    const updateState = (data: { steps: number; distance: number }) => {
      const currentDate = getLocalDateString();

      // MIDNIGHT ROLLOVER DETECTION
      if (lastTrackedDate.current !== currentDate) {
        handleMidnightRollover(lastTrackedDate.current, currentDate);
        return; // Skip this update, next one will use fresh counters
      }

      // Handle TYPE_STEP_COUNTER which returns cumulative steps since boot
      // Set baseline on first reading to calculate session steps correctly
      if (sensorBaseline.current === null && data.steps > 0) {
        sensorBaseline.current = data.steps;
        console.log('[usePedometer] 📍 Sensor baseline set:', sensorBaseline.current);
      }

      // Calculate session steps as delta from baseline
      const sessionSteps = sensorBaseline.current !== null
        ? Math.max(0, data.steps - sensorBaseline.current)
        : 0;

      // STEP VALIDATION - Reject anomalous increments
      const stepIncrement = sessionSteps - previousSessionSteps.current;
      
      if (stepIncrement > MAX_STEPS_PER_UPDATE) {
        console.warn('[usePedometer] ⚠️ Anomaly: Step increment too large', {
          increment: stepIncrement,
          threshold: MAX_STEPS_PER_UPDATE,
          previousSession: previousSessionSteps.current,
          currentSession: sessionSteps
        });
        // Skip this update - likely sensor glitch
        return;
      }

      // Update previous session steps for next comparison
      previousSessionSteps.current = sessionSteps;

      // Calculate total steps
      let totalSteps = baseSteps.current + sessionSteps;

      // Cap at maximum daily steps
      if (totalSteps > MAX_DAILY_STEPS) {
        console.warn('[usePedometer] ⚠️ Capping steps at maximum:', MAX_DAILY_STEPS);
        totalSteps = MAX_DAILY_STEPS;
      }

      const distanceKm = (data.distance || (sessionSteps * 0.762)) / 1000;
      const totalDistance = (baseSteps.current * 0.762) / 1000 + distanceKm;
      const calories = Math.round(totalSteps / STEPS_PER_CALORIE);

      console.log('[usePedometer] 📊 Step calculation:', {
        rawSensorSteps: data.steps,
        sensorBaseline: sensorBaseline.current,
        sessionSteps,
        dbBaseSteps: baseSteps.current,
        totalSteps
      });

      if (isMounted) {
        setState(prev => ({
          ...prev,
          steps: totalSteps,
          distance: totalDistance,
          calories,
          isTracking: true,
          hasPermission: true,
          dataSource: 'pedometer',
          lastUpdate: Date.now()
        }));
      }
    };

    const initBackgroundTracking = async () => {
      console.log('[usePedometer] Initializing background step tracking...');
      
      // Check for midnight rollover on init
      const currentDate = getLocalDateString();
      if (lastTrackedDate.current !== currentDate) {
        await handleMidnightRollover(lastTrackedDate.current, currentDate);
      }

      // Reset sensor baseline for new session
      sensorBaseline.current = null;

      // Set up reboot detection callback (Android only)
      if (Capacitor.getPlatform() === 'android') {
        try {
          const { backgroundStepService } = await import('@/services/backgroundStepService');
          backgroundStepService.setRebootCallback((lostSensorValue) => {
            console.log('[usePedometer] ⚠️ Device reboot detected - preserving steps');
            // Reset the sensor baseline so new readings start from 0
            sensorBaseline.current = null;
            previousSessionSteps.current = 0;
          });
        } catch (e) {
          console.error('[usePedometer] Failed to set reboot callback:', e);
        }
      }

      // Check if already running
      if (stepTrackingService.isRunning()) {
        console.log('[usePedometer] ✅ Already running - subscribing to updates');
        stepTrackingService.subscribeToUpdates(updateState);
        setState(prev => ({
          ...prev,
          isTracking: true,
          hasPermission: true,
          dataSource: 'pedometer'
        }));
        return;
      }

      // Start step tracking via platform router
      const result = await stepTrackingService.requestPermissionAndStart(updateState);

      if (isMounted) {
        if (result.success) {
          setState(prev => ({
            ...prev,
            isTracking: true,
            hasPermission: true,
            dataSource: 'pedometer'
          }));
        } else {
          setState(prev => ({
            ...prev,
            isTracking: false,
            hasPermission: false,
            dataSource: 'database',
            error: result.error || 'Failed to start tracking'
          }));
        }
      }

      console.log('[usePedometer] Background tracking started:', result.success);
    };

    // Delay init slightly to ensure other components are ready
    const timer = setTimeout(initBackgroundTracking, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      // Don't stop service on unmount - it should keep running in background
    };
  }, [location.pathname, handleMidnightRollover]);

  // Sync to Database
  const syncToDatabase = useCallback(async (force = false) => {
    if (!user) return;

    const stepDiff = state.steps - lastSyncSteps.current;

    console.log('[usePedometer] Sync check:', {
      currentSteps: state.steps,
      lastSynced: lastSyncSteps.current,
      diff: stepDiff,
      force
    });

    if (!force && stepDiff < SYNC_THRESHOLD) {
      return;
    }

    const today = getLocalDateString();
    const targetHit = state.steps >= dailyGoalRef.current;
    const data = {
      user_id: user.id,
      date: today,
      steps: state.steps,
      distance_km: state.distance,
      calories: state.calories,
      target_hit: targetHit,
      updated_at: new Date().toISOString()
    };

    try {
      if (isOnline) {
        console.log('[usePedometer] Syncing to DB:', state.steps, 'target_hit:', targetHit);
        const { error } = await supabase
          .from('daily_steps')
          .upsert(data, { onConflict: 'user_id,date' });
        if (error) throw error;
        lastSyncSteps.current = state.steps;
        console.log('[usePedometer] ✅ Synced successfully');
      } else {
        queueStepData(today, state.steps, state.distance, state.calories, targetHit);
      }
    } catch (error) {
      console.error('[usePedometer] Sync error:', error);
      queueStepData(today, state.steps, state.distance, state.calories, targetHit);
    }
  }, [user, state.steps, state.distance, state.calories, isOnline, queueStepData]);

  // Trigger sync when steps change significantly
  useEffect(() => {
    if (state.steps > 0) {
      syncToDatabase();
    }
  }, [state.steps, syncToDatabase]);

  // Periodic sync as backup (every 30 seconds when tracking)
  useEffect(() => {
    if (!state.isTracking || !user) return;

    const intervalId = setInterval(() => {
      console.log('[usePedometer] Periodic sync triggered');
      syncToDatabase(true);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [state.isTracking, user, syncToDatabase]);

  // Keep refs updated with latest state for background sync (avoids stale closure)
  useEffect(() => {
    backgroundSyncSteps.current = state.steps;
    backgroundSyncDistance.current = state.distance;
    backgroundSyncCalories.current = state.calories;
  }, [state.steps, state.distance, state.calories]);

  // App State Change Listener - sync on background AND resume
  // CRITICAL: Set up ONCE and use refs to avoid stale closure bug
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let appStateListener: { remove: () => void } | null = null;
    const platform = Capacitor.getPlatform();

    const setupListener = async () => {
      appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
        if (!user) return;

        const today = getLocalDateString();

        // Check for midnight rollover on any state change
        if (lastTrackedDate.current !== today) {
          await handleMidnightRollover(lastTrackedDate.current, today);
        }

        if (!isActive) {
          // App going to BACKGROUND - sync immediately using REFS (always current)
          const stepsToSync = backgroundSyncSteps.current;
          const distanceToSync = backgroundSyncDistance.current;
          const caloriesToSync = backgroundSyncCalories.current;
          
          console.log('[usePedometer] App going to background - syncing steps:', stepsToSync);
          
          if (stepsToSync > 0) {
            try {
              const targetHit = stepsToSync >= dailyGoalRef.current;
              await supabase
                .from('daily_steps')
                .upsert({
                  user_id: user.id,
                  date: today,
                  steps: stepsToSync,
                  distance_km: distanceToSync,
                  calories: caloriesToSync,
                  target_hit: targetHit,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,date' });
              console.log('[usePedometer] ✅ Background sync successful:', stepsToSync, 'target_hit:', targetHit);
              lastSyncSteps.current = stepsToSync;
            } catch (e) {
              console.error('[usePedometer] Background sync error:', e);
              const targetHit = stepsToSync >= dailyGoalRef.current;
              queueStepData(today, stepsToSync, distanceToSync, caloriesToSync, targetHit);
            }
          }
        } else {
          // App RESUMED - sync from health source OR reload from database
          console.log('[usePedometer] App resumed - syncing');
          
          // Reset baseline to capture background steps
          sensorBaseline.current = null;
          previousSessionSteps.current = 0;
          
          let loadedFromHealth = false;
          
          // On iOS, try HealthKit first
          if (platform === 'ios') {
            try {
              console.log('[usePedometer] iOS: Syncing from HealthKit...');
              const healthData = await healthService.readTodayData();
              if (healthData && healthData.steps > 0) {
                if (healthData.steps > baseSteps.current) {
                  console.log('[usePedometer] iOS: HealthKit has more steps:', healthData.steps, 'vs', baseSteps.current);
                  baseSteps.current = healthData.steps;
                  sensorBaseline.current = 0;
                  backgroundSyncSteps.current = healthData.steps;
                  backgroundSyncDistance.current = healthData.distance;
                  backgroundSyncCalories.current = healthData.calories;
                  
                  setState(prev => ({
                    ...prev,
                    steps: healthData.steps,
                    distance: healthData.distance,
                    calories: healthData.calories,
                    dataSource: 'pedometer'
                  }));
                  loadedFromHealth = true;
                }
              }
            } catch (e) {
              console.error('[usePedometer] iOS HealthKit sync error:', e);
            }
          }
          
          // If HealthKit unavailable/empty, reload from database as fallback
          if (platform === 'ios' && !loadedFromHealth) {
            console.log('[usePedometer] iOS: HealthKit unavailable, reloading from DB');
            try {
              const { data } = await supabase
                .from('daily_steps')
                .select('steps, distance_km, calories')
                .eq('user_id', user.id)
                .eq('date', today)
                .maybeSingle();
              
              if (data && data.steps > baseSteps.current) {
                console.log('[usePedometer] iOS: Restored from DB:', data.steps);
                baseSteps.current = data.steps;
                lastSyncSteps.current = data.steps;
                backgroundSyncSteps.current = data.steps;
                backgroundSyncDistance.current = data.distance_km || 0;
                backgroundSyncCalories.current = data.calories || 0;
                
                setState(prev => ({
                  ...prev,
                  steps: data.steps,
                  distance: data.distance_km || 0,
                  calories: data.calories || 0,
                  dataSource: 'database'
                }));
              }
            } catch (e) {
              console.error('[usePedometer] DB reload error:', e);
            }
          }
        }
      });
    };

    setupListener();

    return () => {
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, [user, queueStepData, handleMidnightRollover]); // Minimal deps - listener set up once, uses refs for current values

  // Manual Actions
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return true;

    const result = await stepTrackingService.requestPermissionAndStart();
    setState(prev => ({ ...prev, hasPermission: result.success }));
    return result.success;
  }, []);

  const startTracking = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return true;

    const result = await stepTrackingService.requestPermissionAndStart((data: { steps: number; distance: number }) => {
      const sessionSteps = sensorBaseline.current !== null
        ? Math.max(0, data.steps - sensorBaseline.current)
        : 0;
      const totalSteps = Math.min(baseSteps.current + sessionSteps, MAX_DAILY_STEPS);
      const distanceKm = (data.distance || (sessionSteps * 0.762)) / 1000;
      const totalDistance = (baseSteps.current * 0.762) / 1000 + distanceKm;
      const calories = Math.round(totalSteps / STEPS_PER_CALORIE);

      setState(prev => ({
        ...prev,
        steps: totalSteps,
        distance: totalDistance,
        calories,
        isTracking: true,
        dataSource: 'pedometer',
        lastUpdate: Date.now()
      }));
    });

    if (result.success) {
      setState(prev => ({
        ...prev,
        isTracking: true,
        hasPermission: true,
        dataSource: 'pedometer'
      }));
    } else {
      setState(prev => ({
        ...prev,
        isTracking: false,
        dataSource: 'unavailable',
        error: result.error || null
      }));
    }

    return result.success;
  }, []);

  const stopTracking = useCallback(async () => {
    await stepTrackingService.stop();
    setState(prev => ({ ...prev, isTracking: false }));
  }, []);

  return {
    ...state,
    requestPermission,
    startTracking,
    stopTracking,
    syncToDatabase
  };
}
