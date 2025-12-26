import { useCallback } from 'react';

const CACHE_KEYS = {
  PROFILE: 'cache_profile',
  STREAK: 'cache_streak',
  DAILY_STEPS: 'cache_daily_steps',
  WEEKLY_DATA: 'cache_weekly_data',
  MONTHLY_DATA: 'cache_monthly_data',
  LEADERBOARD: 'cache_leaderboard',
  LAST_SYNC: 'cache_last_sync',
} as const;

interface CachedProfile {
  id: string;
  display_name: string;
  avatar_initials: string | null;
  daily_step_goal: number;
  created_at: string;
}

interface CachedStreak {
  current_streak: number;
  longest_streak: number;
  last_target_hit_date: string | null;
}

interface CachedDailyStep {
  date: string;
  steps: number;
  distance_km: number;
  calories: number;
  target_hit: boolean;
}

interface CachedWeekData {
  day: string;
  steps: number;
  isToday: boolean;
  hitGoal: boolean;
}

interface CachedMonthData {
  date: number;
  steps: number;
  hitGoal: boolean;
  isToday: boolean;
  isFuture: boolean;
}

interface CacheData<T> {
  data: T;
  timestamp: number;
  userId: string;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const useLocalCache = () => {
  const getCache = useCallback(<T>(key: string, userId: string): T | null => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      
      const parsed: CacheData<T> = JSON.parse(stored);
      
      // Check if cache belongs to current user
      if (parsed.userId !== userId) {
        localStorage.removeItem(key);
        return null;
      }
      
      // Check if cache is still valid
      if (Date.now() - parsed.timestamp > CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }
      
      return parsed.data;
    } catch (e) {
      console.error('[LocalCache] Error reading cache:', key, e);
      return null;
    }
  }, []);

  const setCache = useCallback(<T>(key: string, data: T, userId: string): void => {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now(),
        userId,
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
      console.log('[LocalCache] Cached:', key);
    } catch (e) {
      console.error('[LocalCache] Error writing cache:', key, e);
    }
  }, []);

  const clearCache = useCallback((userId?: string): void => {
    Object.values(CACHE_KEYS).forEach(key => {
      if (userId) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.userId === userId) {
              localStorage.removeItem(key);
            }
          } catch {
            localStorage.removeItem(key);
          }
        }
      } else {
        localStorage.removeItem(key);
      }
    });
    console.log('[LocalCache] Cache cleared');
  }, []);

  // Profile cache
  const getCachedProfile = useCallback((userId: string) => 
    getCache<CachedProfile>(CACHE_KEYS.PROFILE, userId), [getCache]);
  
  const setCachedProfile = useCallback((profile: CachedProfile, userId: string) => 
    setCache(CACHE_KEYS.PROFILE, profile, userId), [setCache]);

  // Streak cache
  const getCachedStreak = useCallback((userId: string) => 
    getCache<CachedStreak>(CACHE_KEYS.STREAK, userId), [getCache]);
  
  const setCachedStreak = useCallback((streak: CachedStreak, userId: string) => 
    setCache(CACHE_KEYS.STREAK, streak, userId), [setCache]);

  // Daily steps cache (last 30 days)
  const getCachedDailySteps = useCallback((userId: string) => 
    getCache<CachedDailyStep[]>(CACHE_KEYS.DAILY_STEPS, userId), [getCache]);
  
  const setCachedDailySteps = useCallback((steps: CachedDailyStep[], userId: string) => 
    setCache(CACHE_KEYS.DAILY_STEPS, steps, userId), [setCache]);

  // Weekly data cache
  const getCachedWeekData = useCallback((userId: string) => 
    getCache<CachedWeekData[]>(CACHE_KEYS.WEEKLY_DATA, userId), [getCache]);
  
  const setCachedWeekData = useCallback((data: CachedWeekData[], userId: string) => 
    setCache(CACHE_KEYS.WEEKLY_DATA, data, userId), [setCache]);

  // Monthly data cache
  const getCachedMonthData = useCallback((userId: string) => 
    getCache<CachedMonthData[]>(CACHE_KEYS.MONTHLY_DATA, userId), [getCache]);
  
  const setCachedMonthData = useCallback((data: CachedMonthData[], userId: string) => 
    setCache(CACHE_KEYS.MONTHLY_DATA, data, userId), [setCache]);

  // Last sync time
  const getLastSyncTime = useCallback((userId: string) => 
    getCache<number>(CACHE_KEYS.LAST_SYNC, userId), [getCache]);
  
  const setLastSyncTime = useCallback((userId: string) => 
    setCache(CACHE_KEYS.LAST_SYNC, Date.now(), userId), [setCache]);

  return {
    // Profile
    getCachedProfile,
    setCachedProfile,
    // Streak
    getCachedStreak,
    setCachedStreak,
    // Daily steps
    getCachedDailySteps,
    setCachedDailySteps,
    // Weekly data
    getCachedWeekData,
    setCachedWeekData,
    // Monthly data
    getCachedMonthData,
    setCachedMonthData,
    // Sync time
    getLastSyncTime,
    setLastSyncTime,
    // Utils
    clearCache,
  };
};
