import { useState, useEffect, useCallback, useRef } from 'react';
import { pedometerService } from '@/services/pedometerService';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { supabase } from '@/integrations/supabase/client';
import { haptics } from '@/utils/haptics';
import { useLocation } from 'react-router-dom';

const ONBOARDING_KEY = 'device_onboarding_completed';
const STEPS_PER_CALORIE = 20; // Approximate steps per calorie burned

export interface PedometerState {
  steps: number;
  distance: number; // km
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

  // Refs to avoid stale closures
  const lastSyncSteps = useRef<number>(0);
  const celebrated10K = useRef<string | null>(null);
  const baseSteps = useRef<number>(0); // Steps from database at start of day

  // ======= 10K Milestone Celebration =======
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    if (state.steps >= 10000 && celebrated10K.current !== today) {
      celebrated10K.current = today;
      haptics.success();
      console.log('[usePedometer] 🎉 10,000 steps milestone!');
    }
  }, [state.steps]);

  // ======= Load Today's Steps from Database =======
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
        console.error('[usePedometer] Error loading today data:', error);
        setState(prev => ({ ...prev, isInitializing: false }));
      }
    };

    loadTodayData();
  }, [user]);

  // ======= Initialize Pedometer =======
  useEffect(() => {
    const isOnboarding = location.pathname === '/onboarding';
    const onboardingComplete = localStorage.getItem(ONBOARDING_KEY) === 'true';

    // Skip initialization during onboarding or if not completed
    if (isOnboarding || !onboardingComplete) {
      console.log('[usePedometer] Skipping init - onboarding not complete');
      return;
    }

    // Skip on web
    if (!pedometerService.isNative()) {
      console.log('[usePedometer] Web platform - skipping pedometer');
      return;
    }

    let isMounted = true;

    const initPedometer = async () => {
      console.log('[usePedometer] Starting pedometer initialization...');

      try {
        // Check if pedometer was already started during onboarding
        if (pedometerService.isTracking()) {
          console.log('[usePedometer] Pedometer already running from onboarding - attaching callback');
          
          const success = await pedometerService.attachCallback((data) => {
            const totalSteps = baseSteps.current + data.steps;
            const distanceKm = (data.distance || (data.steps * 0.762)) / 1000;
            const totalDistance = (baseSteps.current * 0.762) / 1000 + distanceKm;
            const calories = Math.round(totalSteps / STEPS_PER_CALORIE);

            console.log('[usePedometer] Measurement - sensor:', data.steps, 'total:', totalSteps);

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

        // Check if step counter is available on this device
        const isAvailable = await pedometerService.isAvailable();
        console.log('[usePedometer] Step counter available:', isAvailable);
        
        if (!isAvailable) {
          console.log('[usePedometer] Step counter not available on device');
          if (isMounted) {
            setState(prev => ({ ...prev, dataSource: 'database', error: 'Step counter not available' }));
          }
          return;
        }

        // Check permission
        const hasPermission = await pedometerService.checkPermission();
        console.log('[usePedometer] Has permission:', hasPermission);
        
        if (!hasPermission) {
          console.log('[usePedometer] No permission - using DB data only');
          if (isMounted) {
            setState(prev => ({ ...prev, hasPermission: false, dataSource: 'database' }));
          }
          return;
        }

        console.log('[usePedometer] Permission granted, starting tracking...');

        // Start tracking
        const success = await pedometerService.start((data) => {
          if (!isMounted) return;
          
          const totalSteps = baseSteps.current + data.steps;
          const distanceKm = (data.distance || (data.steps * 0.762)) / 1000;
          const totalDistance = (baseSteps.current * 0.762) / 1000 + distanceKm;
          const calories = Math.round(totalSteps / STEPS_PER_CALORIE);

          console.log('[usePedometer] Measurement - sensor:', data.steps, 'total:', totalSteps);

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
        });

        if (isMounted) {
          setState(prev => ({
            ...prev,
            isTracking: success,
            hasPermission: success,
            dataSource: success ? 'pedometer' : 'database'
          }));
        }

        console.log('[usePedometer] Pedometer started:', success);
      } catch (error) {
        console.error('[usePedometer] Init error:', error);
        if (isMounted) {
          setState(prev => ({ ...prev, error: String(error), dataSource: 'database' }));
        }
      }
    };

    // Small delay to ensure DB load completes first
    const timer = setTimeout(initPedometer, 500);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      pedometerService.stop();
    };
  }, [location.pathname]);

  // ======= Sync to Database Every 100 Steps =======
  const syncToDatabase = useCallback(async () => {
    if (!user) return;

    const stepDiff = state.steps - lastSyncSteps.current;
    if (stepDiff < 100) return; // Only sync every 100 steps

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
        console.log('[usePedometer] Syncing to DB:', state.steps);
        const { error } = await supabase
          .from('daily_steps')
          .upsert(data, { onConflict: 'user_id,date' });

        if (error) throw error;
        lastSyncSteps.current = state.steps;
      } else {
        console.log('[usePedometer] Offline - queuing data');
        queueStepData(today, state.steps, state.distance, state.calories);
      }
    } catch (error) {
      console.error('[usePedometer] Sync error:', error);
      // Queue for later sync
      queueStepData(today, state.steps, state.distance, state.calories);
    }
  }, [user, state.steps, state.distance, state.calories, isOnline, queueStepData]);

  // Auto-sync when steps change
  useEffect(() => {
    if (state.steps > 0) {
      syncToDatabase();
    }
  }, [state.steps, syncToDatabase]);

  // ======= Manual Actions =======
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
    setState(prev => ({
      ...prev,
      isTracking: false
    }));
  }, []);

  return {
    ...state,
    requestPermission,
    startTracking,
    stopTracking,
    syncToDatabase
  };
}
