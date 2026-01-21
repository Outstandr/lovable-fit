import { useState, useEffect, useCallback, useRef } from 'react';
import { backgroundStepService } from '@/services/backgroundStepService';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { supabase } from '@/integrations/supabase/client';
import { haptics } from '@/utils/haptics';
import { useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const ONBOARDING_KEY = 'device_onboarding_completed';
const STEPS_PER_CALORIE = 20;
const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
const SYNC_THRESHOLD = 50; // Sync to database every 50 steps

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

    const initBackgroundTracking = async () => {
      console.log('[usePedometer] Initializing background step tracking...');

      // Check if service is already running
      if (backgroundStepService.isRunning()) {
        console.log('[usePedometer] ✅ Background service already running');
        const todaySteps = await backgroundStepService.getTodaySteps();
        const totalSteps = Math.max(todaySteps, baseSteps.current);
        
        if (isMounted) {
          setState(prev => ({
            ...prev,
            steps: totalSteps,
            distance: (totalSteps * 0.762) / 1000,
            calories: Math.round(totalSteps / STEPS_PER_CALORIE),
            isTracking: true,
            hasPermission: true,
            dataSource: 'pedometer',
            lastUpdate: Date.now()
          }));
        }
        return;
      }

      // Start the background service
      const result = await backgroundStepService.requestPermissionAndStart();
      
      if (isMounted) {
        if (result.success) {
          const todaySteps = await backgroundStepService.getTodaySteps();
          const totalSteps = Math.max(todaySteps, baseSteps.current);
          
          setState(prev => ({
            ...prev,
            steps: totalSteps,
            distance: (totalSteps * 0.762) / 1000,
            calories: Math.round(totalSteps / STEPS_PER_CALORIE),
            isTracking: true,
            hasPermission: true,
            dataSource: 'pedometer',
            lastUpdate: Date.now()
          }));
        } else {
          setState(prev => ({
            ...prev,
            isTracking: false,
            hasPermission: false,
            dataSource: 'database',
            error: result.error || 'Failed to start background tracking'
          }));
        }
      }

      console.log('[usePedometer] Background service started:', result.success);
    };

    // Delay init slightly to ensure other components are ready
    const timer = setTimeout(initBackgroundTracking, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
      // Don't stop on route changes - let tracking persist
      // Only stop on explicit user action
    };
  }, [location.pathname]);

  // Poll for step updates from background service
  useEffect(() => {
    if (!state.isTracking || state.dataSource !== 'pedometer') {
      return;
    }

    const pollSteps = async () => {
      const todaySteps = await backgroundStepService.getTodaySteps();
      
      // Only update if steps increased
      if (todaySteps > state.steps) {
        console.log('[usePedometer] 📊 Steps updated:', state.steps, '->', todaySteps);
        
        setState(prev => ({
          ...prev,
          steps: todaySteps,
          distance: (todaySteps * 0.762) / 1000,
          calories: Math.round(todaySteps / STEPS_PER_CALORIE),
          lastUpdate: Date.now()
        }));
      }
    };

    // Initial poll
    pollSteps();
    
    // Set up polling interval
    const intervalId = setInterval(pollSteps, POLL_INTERVAL_MS);
    
    return () => clearInterval(intervalId);
  }, [state.isTracking, state.dataSource, state.steps]);

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
        console.log('[usePedometer] ✅ Synced successfully');
      } else {
        queueStepData(today, state.steps, state.distance, state.calories);
      }
    } catch (error) {
      console.error('[usePedometer] Sync error:', error);
      queueStepData(today, state.steps, state.distance, state.calories);
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

  // Background Resume Sync - sync when app comes to foreground
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let appStateListener: { remove: () => void } | null = null;

    const setupListener = async () => {
      appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
        if (isActive && user) {
          console.log('[usePedometer] App resumed - fetching latest steps');
          
          // Get latest steps from background service
          const todaySteps = await backgroundStepService.getTodaySteps();
          
          if (todaySteps > state.steps) {
            setState(prev => ({
              ...prev,
              steps: todaySteps,
              distance: (todaySteps * 0.762) / 1000,
              calories: Math.round(todaySteps / STEPS_PER_CALORIE),
              lastUpdate: Date.now()
            }));
          }
          
          // Force sync to database
          await syncToDatabase(true);
        }
      });
    };

    setupListener();

    return () => {
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, [user, state.steps, syncToDatabase]);

  // Manual Actions
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return true;
    
    const result = await backgroundStepService.requestPermissionAndStart();
    setState(prev => ({ ...prev, hasPermission: result.success }));
    return result.success;
  }, []);

  const startTracking = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return true;

    const result = await backgroundStepService.requestPermissionAndStart();
    
    if (result.success) {
      const todaySteps = await backgroundStepService.getTodaySteps();
      const totalSteps = Math.max(todaySteps, baseSteps.current);
      
      setState(prev => ({
        ...prev,
        steps: totalSteps,
        distance: (totalSteps * 0.762) / 1000,
        calories: Math.round(totalSteps / STEPS_PER_CALORIE),
        isTracking: true,
        hasPermission: true,
        dataSource: 'pedometer',
        lastUpdate: Date.now()
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
    await backgroundStepService.stop();
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
