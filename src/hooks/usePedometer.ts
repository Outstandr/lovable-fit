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

    const initPedometer = async () => {
      console.log('[usePedometer] Initializing...');

      try {
        // If already tracking (started during onboarding), just update callback
        if (pedometerService.isTracking()) {
          console.log('[usePedometer] Already running - updating callback');
          const success = await pedometerService.start((data) => {
            if (!isMounted) return;
            updateState(data);
          });
          if (isMounted) {
            setState(prev => ({
              ...prev,
              isTracking: success,
              hasPermission: true,
              dataSource: 'pedometer'
            }));
          }
          return;
        }

        // Check availability
        const isAvailable = await pedometerService.isAvailable();
        if (!isAvailable) {
          console.log('[usePedometer] Step counter not available');
          if (isMounted) {
            setState(prev => ({ ...prev, dataSource: 'database', error: 'Step counter not available' }));
          }
          return;
        }

        // Start sensor
        console.log('[usePedometer] Starting sensor...');
        const success = await pedometerService.start((data) => {
          if (!isMounted) return;
          updateState(data);
        });

        if (isMounted) {
          setState(prev => ({
            ...prev,
            isTracking: success,
            hasPermission: success,
            dataSource: success ? 'pedometer' : 'database'
          }));
        }

        console.log('[usePedometer] Started:', success);
      } catch (error) {
        console.error('[usePedometer] Init error:', error);
        if (isMounted) {
          setState(prev => ({ ...prev, error: String(error), dataSource: 'database' }));
        }
      }
    };

    const updateState = (data: { steps: number; distance: number }) => {
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
        hasPermission: true,
        dataSource: 'pedometer',
        lastUpdate: Date.now()
      }));
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

    const success = await pedometerService.start((data) => {
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
      isTracking: success,
      dataSource: success ? 'pedometer' : 'unavailable'
    }));

    return success;
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
