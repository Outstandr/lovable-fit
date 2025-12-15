import { useState, useEffect, useCallback } from 'react';
import { pedometerService } from '@/services/pedometerService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const LOG_PREFIX = '[usePedometer]';

interface PedometerState {
  steps: number;
  distance: number;
  calories: number;
  hasPermission: boolean;
  isTracking: boolean;
  error: string | null;
  platform: 'android' | 'ios' | 'web';
}

export function usePedometer() {
  const { user } = useAuth();
  const [state, setState] = useState<PedometerState>({
    steps: 0,
    distance: 0,
    calories: 0,
    hasPermission: false,
    isTracking: false,
    error: null,
    platform: pedometerService.getPlatform()
  });

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    console.log(`${LOG_PREFIX} requestPermission called`);
    setState(prev => ({ ...prev, error: null }));
    
    try {
      const granted = await pedometerService.requestPermission();
      console.log(`${LOG_PREFIX} requestPermission result: ${granted}`);
      setState(prev => ({ ...prev, hasPermission: granted }));
      return granted;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Permission request failed';
      console.error(`${LOG_PREFIX} requestPermission error:`, error);
      setState(prev => ({ ...prev, error: msg }));
      return false;
    }
  }, []);

  // Start tracking
  const startTracking = useCallback(async (): Promise<boolean> => {
    console.log(`${LOG_PREFIX} startTracking called`);
    setState(prev => ({ ...prev, error: null }));
    
    try {
      const started = await pedometerService.start();
      console.log(`${LOG_PREFIX} startTracking result: ${started}`);
      
      if (started) {
        setState(prev => ({ 
          ...prev, 
          isTracking: true, 
          hasPermission: true 
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          error: 'Could not start tracking. Permission may be denied.' 
        }));
      }
      return started;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to start tracking';
      console.error(`${LOG_PREFIX} startTracking error:`, error);
      setState(prev => ({ ...prev, error: msg }));
      return false;
    }
  }, []);

  // Stop tracking
  const stopTracking = useCallback(async (): Promise<void> => {
    console.log(`${LOG_PREFIX} stopTracking called`);
    
    try {
      await pedometerService.stop();
      setState(prev => ({ ...prev, isTracking: false }));
    } catch (error) {
      console.error(`${LOG_PREFIX} stopTracking error:`, error);
    }
  }, []);

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
      } else {
        console.log(`${LOG_PREFIX} syncToDatabase success`);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} syncToDatabase error:`, error);
    }
  }, [user, state.steps, state.distance, state.calories]);

  // Check permission status on mount but don't auto-start (let permission flow handle it)
  useEffect(() => {
    const platform = pedometerService.getPlatform();
    if (platform === 'web') {
      console.log(`${LOG_PREFIX} Web platform, skipping permission check`);
      return;
    }

    console.log(`${LOG_PREFIX} Native platform detected, checking if tracking already started...`);
    
    const timer = setTimeout(() => {
      const serviceState = pedometerService.getState();
      console.log(`${LOG_PREFIX} Service state:`, serviceState);
      
      if (serviceState.isTracking) {
        console.log(`${LOG_PREFIX} Already tracking, syncing state...`);
        setState(prev => ({
          ...prev,
          steps: serviceState.steps,
          distance: serviceState.distance,
          calories: serviceState.calories,
          hasPermission: serviceState.hasPermission,
          isTracking: serviceState.isTracking
        }));
      } else {
        console.log(`${LOG_PREFIX} Not tracking yet, will be started by permission flow`);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Poll for step updates every 3 seconds
  useEffect(() => {
    // Wait 2.5s for auto-start to complete before starting poll
    const startDelay = setTimeout(() => {
      if (!state.isTracking) {
        console.log(`${LOG_PREFIX} Not tracking after delay, skipping poll setup`);
        return;
      }

      if (!state.hasPermission) {
        console.log(`${LOG_PREFIX} No permission after delay, skipping poll setup`);
        return;
      }

      console.log(`${LOG_PREFIX} Starting 3s poll for step updates (permission: ${state.hasPermission}, tracking: ${state.isTracking})`);
      
      const interval = setInterval(async () => {
        // Fetch fresh step count from sensor
        await pedometerService.fetchSteps();
        const serviceState = pedometerService.getState();
        console.log(`${LOG_PREFIX} Poll update: steps=${serviceState.steps}, distance=${serviceState.distance.toFixed(2)}km, tracking=${serviceState.isTracking}`);
        
        setState(prev => ({
          ...prev,
          steps: serviceState.steps,
          distance: serviceState.distance,
          calories: serviceState.calories,
          hasPermission: serviceState.hasPermission,
          isTracking: serviceState.isTracking
        }));
      }, 3000);

      // Cleanup function for interval
      return () => {
        console.log(`${LOG_PREFIX} Stopping poll (cleanup)`);
        clearInterval(interval);
      };
    }, 2500); // Wait 2.5s (auto-start is 1.5s + 1s fetch delay)

    // Cleanup function for delay
    return () => clearTimeout(startDelay);
  }, [state.isTracking, state.hasPermission]);

  // Sync to database when steps change significantly
  useEffect(() => {
    if (state.steps > 0 && state.steps % 100 === 0) {
      syncToDatabase();
    }
  }, [state.steps, syncToDatabase]);

  return {
    // State
    steps: state.steps,
    distance: state.distance,
    calories: state.calories,
    hasPermission: state.hasPermission,
    isTracking: state.isTracking,
    error: state.error,
    platform: state.platform,
    
    // Actions
    requestPermission,
    startTracking,
    stopTracking,
    syncToDatabase,
    
    // Debug
    getDebugState: () => pedometerService.getState()
  };
}
