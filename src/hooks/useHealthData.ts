import { useState, useEffect, useCallback } from 'react';
import { healthService, HealthData, Platform } from '@/services/healthService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UseHealthDataReturn {
  healthData: HealthData & {
    isLoading: boolean;
    hasPermission: boolean;
    platform: Platform;
    error: string | null;
  };
  requestPermissions: () => Promise<boolean>;
  refetch: () => Promise<void>;
  syncToDatabase: () => Promise<void>;
}

// Get start of today in local timezone
function getStartOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

// Get end of today in local timezone
function getEndOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

export function useHealthData(): UseHealthDataReturn {
  const { user } = useAuth();
  const platform = healthService.getPlatform();
  const [permissionChecked, setPermissionChecked] = useState(false);
  
  const [healthData, setHealthData] = useState<HealthData & {
    isLoading: boolean;
    hasPermission: boolean;
    platform: Platform;
    error: string | null;
  }>({
    steps: 0,
    distance: 0,
    calories: 0,
    isLoading: true,
    hasPermission: false,
    platform,
    error: null
  });

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[useHealthData] Requesting permissions...');
      const granted = await healthService.requestPermissions();
      console.log('[useHealthData] Permission result:', granted);
      setHealthData(prev => ({ ...prev, hasPermission: granted }));
      setPermissionChecked(true);
      return granted;
    } catch (error) {
      console.error('[useHealthData] Permission error:', error);
      setHealthData(prev => ({ 
        ...prev, 
        hasPermission: false,
        error: 'Failed to request health permissions'
      }));
      setPermissionChecked(true);
      return false;
    }
  }, []);

  // Auto-request permission on app open for native platforms (with delay for plugin readiness)
  useEffect(() => {
    if (platform !== 'web' && !permissionChecked) {
      // Delay to ensure Capacitor plugins are fully initialized
      const timer = setTimeout(async () => {
        try {
          console.log('[useHealthData] Auto-requesting permission on app open...');
          await requestPermissions();
        } catch (error) {
          console.error('[useHealthData] Auto-permission request failed:', error);
          setPermissionChecked(true);
        }
      }, 1000); // 1 second delay for plugin initialization
      
      return () => clearTimeout(timer);
    }
  }, [platform, permissionChecked, requestPermissions]);

  const fetchHealthData = useCallback(async () => {
    setHealthData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const currentPlatform = healthService.getPlatform();
      
      if (currentPlatform === 'web') {
        // On web, try to load from database if available
        if (user) {
          const today = new Date().toISOString().split('T')[0];
          const { data } = await supabase
            .from('daily_steps')
            .select('steps, distance_km, calories')
            .eq('user_id', user.id)
            .eq('date', today)
            .maybeSingle();
          
          if (data) {
            setHealthData({
              steps: data.steps || 0,
              distance: Number(data.distance_km) || 0,
              calories: data.calories || 0,
              isLoading: false,
              hasPermission: false,
              platform: 'web',
              error: null
            });
            return;
          }
        }
        
        // No data available on web
        setHealthData({
          steps: 0,
          distance: 0,
          calories: 0,
          isLoading: false,
          hasPermission: false,
          platform: 'web',
          error: null
        });
        return;
      }

      // For Android: Check if we have permissions BEFORE attempting any native calls
      if (currentPlatform === 'android') {
        const hasPermission = healthService.checkAndroidPermissions();
        console.log('[useHealthData] Android - checkAndroidPermissions():', hasPermission);
        
        if (!hasPermission) {
          console.log('[useHealthData] Android - no permission, returning zeros and skipping getHealthData');
          setHealthData({
            steps: 0,
            distance: 0,
            calories: 0,
            isLoading: false,
            hasPermission: false,
            platform: 'android',
            error: null
          });
          return;
        } else {
          console.log('[useHealthData] Android - permission flag is true, checking pedometer availability');

          try {
            const { CapacitorPedometer } = await import('@capgo/capacitor-pedometer');
            const availability = await CapacitorPedometer.isAvailable();
            console.log('[useHealthData] Android - pedometer availability:', availability);

            if (!availability?.stepCounting) {
              console.warn('[useHealthData] Android - step counting not available on this device');
              setHealthData({
                steps: 0,
                distance: 0,
                calories: 0,
                isLoading: false,
                hasPermission: hasPermission,
                platform: 'android',
                error: 'Step counting is not available on this device. You can still use Active Session mode with GPS tracking.'
              });
              return;
            }
          } catch (availabilityError) {
            console.error('[useHealthData] Android - error checking pedometer availability:', availabilityError);
            setHealthData(prev => ({
              ...prev,
              isLoading: false,
              error: 'Unable to access the step counter on this device.'
            }));
            return;
          }
        }
      }
      
      // Only fetch health data if we have permissions (or on non-Android native platforms)
      const startOfDay = getStartOfToday();
      const endOfDay = getEndOfToday();
      
      console.log('[useHealthData] Fetching health data from HealthService', {
        platform: currentPlatform,
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
      });
      const data = await healthService.getHealthData(startOfDay, endOfDay);
      
      setHealthData({
        ...data,
        isLoading: false,
        hasPermission: true,
        platform: currentPlatform,
        error: null
      });
    } catch (error) {
      console.error('[useHealthData] Fetch error:', error);
      setHealthData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to fetch health data'
      }));
    }
  }, [user]);

  const syncToDatabase = useCallback(async () => {
    if (!user || healthData.steps === 0) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const target = 10000; // Default target
      const targetHit = healthData.steps >= target;
      
      const { error } = await supabase
        .from('daily_steps')
        .upsert({
          user_id: user.id,
          date: today,
          steps: healthData.steps,
          distance_km: healthData.distance,
          calories: healthData.calories,
          target_hit: targetHit
        }, {
          onConflict: 'user_id,date'
        });
      
      if (error) {
        console.error('[useHealthData] Sync error:', error);
      }
    } catch (error) {
      console.error('[useHealthData] Sync error:', error);
    }
  }, [user, healthData]);

  // Initial fetch
  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  // Auto-sync when data changes on native
  useEffect(() => {
    if (healthData.platform !== 'web' && healthData.steps > 0 && !healthData.isLoading) {
      syncToDatabase();
    }
  }, [healthData.steps, healthData.platform, healthData.isLoading, syncToDatabase]);

  // Polling for real-time updates on native platforms (only when we have permissions)
  useEffect(() => {
    if (healthData.platform === 'web') return;
    if (!healthData.hasPermission) return; // Don't poll without permission
    
    const interval = setInterval(() => {
      fetchHealthData();
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [healthData.platform, healthData.hasPermission, fetchHealthData]);

  return {
    healthData,
    requestPermissions,
    refetch: fetchHealthData,
    syncToDatabase
  };
}
