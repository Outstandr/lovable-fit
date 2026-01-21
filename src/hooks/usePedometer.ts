import { useState, useEffect, useCallback, useRef } from 'react';
import { pedometerService } from '@/services/pedometerService';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { supabase } from '@/integrations/supabase/client';
import { haptics } from '@/utils/haptics';
import { useLocation } from 'react-router-dom';

const ONBOARDING_KEY = 'device_onboarding_completed';
const STEPS_PER_CALORIE = 20;

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

  // 10K Milestone Celebration
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
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
        const today = new Date().toISOString().split('T')[0];
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

  // Initialize Pedometer
  useEffect(() => {
    const isOnboarding = location.pathname === '/onboarding';
    const onboardingComplete = localStorage.getItem(ONBOARDING_KEY) === 'true';

    if (isOnboarding || !onboardingComplete) {
      console.log('[usePedometer] Skipping init - onboarding not complete');
      return;
    }

    if (!pedometerService.isNative()) {
      console.log('[usePedometer] Web platform - skipping');
      return;
    }

    let isMounted = true;

    const updateState = (data: { steps: number; distance: number }) => {
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
      
      const totalSteps = baseSteps.current + sessionSteps;
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
    };

    const initPedometer = async () => {
      console.log('[usePedometer] Initializing...');
      // Reset sensor baseline for new session
      sensorBaseline.current = null;

      // Check if tracker was already started during onboarding
      if (pedometerService.isTracking()) {
        console.log('[usePedometer] ✅ Tracker already running (started during onboarding) - subscribing');
        pedometerService.subscribeToUpdates((data) => {
          if (!isMounted) return;
          updateState(data);
        });
        setState(prev => ({
          ...prev,
          isTracking: true,
          hasPermission: true,
          dataSource: 'pedometer'
        }));
        return;
      }

      try {
        // Start sensor with callback - now returns StartResult
        console.log('[usePedometer] Starting fresh tracker...');
        const result = await pedometerService.start((data) => {
          if (!isMounted) return;
          updateState(data);
        });

        if (isMounted) {
          setState(prev => ({
            ...prev,
            isTracking: result.success,
            hasPermission: result.success,
            dataSource: result.success ? 'pedometer' : 'database',
            error: result.success ? null : (result.guidance || result.error || null)
          }));
        }

        console.log('[usePedometer] Started:', result.success, result.error);
      } catch (error) {
        console.error('[usePedometer] Init error:', error);
        if (isMounted) {
          setState(prev => ({ ...prev, error: String(error), dataSource: 'database' }));
        }
      }
    };

    const timer = setTimeout(initPedometer, 500);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      pedometerService.stop();
    };
  }, [location.pathname]);

  // Sync to Database
  const syncToDatabase = useCallback(async () => {
    if (!user) return;

    const stepDiff = state.steps - lastSyncSteps.current;
    if (stepDiff < 100) return;

    const today = new Date().toISOString().split('T')[0];
    const data = {
      user_id: user.id,
      date: today,
      steps: state.steps,
      distance_km: state.distance,
      calories: state.calories,
      updated_at: new Date().toISOString()
    };

    try {
      if (isOnline) {
        console.log('[usePedometer] Syncing:', state.steps);
        const { error } = await supabase
          .from('daily_steps')
          .upsert(data, { onConflict: 'user_id,date' });
        if (error) throw error;
        lastSyncSteps.current = state.steps;
      } else {
        queueStepData(today, state.steps, state.distance, state.calories);
      }
    } catch (error) {
      console.error('[usePedometer] Sync error:', error);
      queueStepData(today, state.steps, state.distance, state.calories);
    }
  }, [user, state.steps, state.distance, state.calories, isOnline, queueStepData]);

  useEffect(() => {
    if (state.steps > 0) {
      syncToDatabase();
    }
  }, [state.steps, syncToDatabase]);

  // Manual Actions
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!pedometerService.isNative()) return true;
    const granted = await pedometerService.requestPermission();
    setState(prev => ({ ...prev, hasPermission: granted }));
    return granted;
  }, []);

  const startTracking = useCallback(async (): Promise<boolean> => {
    if (!pedometerService.isNative()) return true;

    const result = await pedometerService.start((data) => {
      const totalSteps = baseSteps.current + data.steps;
      const distanceKm = (data.distance || (data.steps * 0.762)) / 1000;
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

    setState(prev => ({
      ...prev,
      isTracking: result.success,
      dataSource: result.success ? 'pedometer' : 'unavailable',
      error: result.success ? null : (result.guidance || result.error || null)
    }));

    return result.success;
  }, []);

  const stopTracking = useCallback(() => {
    pedometerService.stop();
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
