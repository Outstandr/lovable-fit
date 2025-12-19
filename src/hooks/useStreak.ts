import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastTargetHitDate: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UseStreakReturn {
  streak: StreakData;
  updateStreakOnTargetHit: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useStreak(): UseStreakReturn {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastTargetHitDate: null,
    isLoading: true,
    error: null
  });

  const fetchStreak = useCallback(async () => {
    if (!user) {
      setStreak(prev => ({ ...prev, isLoading: false }));
      return;
    }

    setStreak(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase
        .from('streaks')
        .select('current_streak, longest_streak, last_target_hit_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setStreak({
        currentStreak: data?.current_streak || 0,
        longestStreak: data?.longest_streak || 0,
        lastTargetHitDate: data?.last_target_hit_date || null,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('[useStreak] Fetch error:', error);
      setStreak(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to fetch streak data'
      }));
    }
  }, [user]);

  const updateStreakOnTargetHit = useCallback(async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    try {
      // Get current streak data
      const { data: currentData } = await supabase
        .from('streaks')
        .select('current_streak, longest_streak, last_target_hit_date')
        .eq('user_id', user.id)
        .maybeSingle();

      let newCurrentStreak = 1;
      let newLongestStreak = currentData?.longest_streak || 0;
      const lastHitDate = currentData?.last_target_hit_date;

      // If already hit target today, don't update
      if (lastHitDate === today) {
        return;
      }

      // Check if streak continues (hit target yesterday)
      if (lastHitDate === yesterday) {
        newCurrentStreak = (currentData?.current_streak || 0) + 1;
      }

      // Update longest streak if needed
      if (newCurrentStreak > newLongestStreak) {
        newLongestStreak = newCurrentStreak;
      }

      // Update the database
      const { error } = await supabase
        .from('streaks')
        .upsert({
          user_id: user.id,
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          last_target_hit_date: today
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // Update local state
      setStreak({
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastTargetHitDate: today,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('[useStreak] Update error:', error);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  return {
    streak,
    updateStreakOnTargetHit,
    refetch: fetchStreak
  };
}
