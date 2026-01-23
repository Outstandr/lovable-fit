import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QueuedStep {
  date: string;
  steps: number;
  distance: number;
  calories: number;
  targetHit: boolean;
  timestamp: number;
}

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState<QueuedStep[]>([]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineSync] Device is online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[OfflineSync] Device is offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load queue from localStorage on mount
  useEffect(() => {
    const loadQueue = () => {
      const stored = localStorage.getItem('offlineStepQueue');
      if (stored) {
        try {
          const queue = JSON.parse(stored);
          setSyncQueue(queue);
          console.log('[OfflineSync] Loaded queue:', queue.length, 'items');
        } catch (e) {
          console.error('[OfflineSync] Error loading queue:', e);
        }
      }
    };
    
    loadQueue();
  }, []);

  // Sync queue when online
  useEffect(() => {
    const syncQueuedData = async () => {
      if (!isOnline || syncQueue.length === 0) return;

      console.log('[OfflineSync] Syncing', syncQueue.length, 'queued items');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const item of syncQueue) {
        try {
          await supabase
            .from('daily_steps')
            .upsert({
              user_id: user.id,
              date: item.date,
              steps: item.steps,
              distance_km: item.distance,
              calories: item.calories,
              target_hit: item.targetHit,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,date'
            });

          console.log('[OfflineSync] Synced:', item.date, item.steps, 'target_hit:', item.targetHit);
        } catch (error) {
          console.error('[OfflineSync] Sync error:', error);
        }
      }

      // Clear queue after successful sync
      setSyncQueue([]);
      localStorage.removeItem('offlineStepQueue');
      console.log('[OfflineSync] Queue synced successfully');
    };

    if (isOnline && syncQueue.length > 0) {
      syncQueuedData();
    }
  }, [isOnline, syncQueue]);

  // Function to queue step data when offline - WITH DEDUPLICATION
  const queueStepData = useCallback((date: string, steps: number, distance: number, calories: number, targetHit: boolean = false) => {
    setSyncQueue(prev => {
      // Check if an entry for this date already exists
      const existingIndex = prev.findIndex(item => item.date === date);

      let newQueue: QueuedStep[];

      if (existingIndex >= 0) {
        // Update existing entry - keep highest step count
        const existing = prev[existingIndex];

        if (steps > existing.steps) {
          newQueue = [...prev];
          newQueue[existingIndex] = {
            date,
            steps,
            distance,
            calories,
            targetHit,
            timestamp: Date.now()
          };
          console.log('[OfflineSync] Updated queued data:', date, steps, 'target_hit:', targetHit, '(was', existing.steps, ')');
        } else {
          console.log('[OfflineSync] Skipped lower value:', steps, '<=', existing.steps);
          return prev; // No change needed
        }
      } else {
        // Add new entry
        newQueue = [...prev, {
          date,
          steps,
          distance,
          calories,
          targetHit,
          timestamp: Date.now()
        }];
        console.log('[OfflineSync] Queued new offline data:', date, steps, 'target_hit:', targetHit);
      }

      localStorage.setItem('offlineStepQueue', JSON.stringify(newQueue));
      return newQueue;
    });
  }, []);

  return {
    isOnline,
    queueStepData
  };
};
