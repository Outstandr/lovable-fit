import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QueuedStep {
  date: string;
  steps: number;
  distance: number;
  calories: number;
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
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,date'
            });

          console.log('[OfflineSync] Synced:', item.date, item.steps);
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

  // Function to queue step data when offline
  const queueStepData = useCallback((date: string, steps: number, distance: number, calories: number) => {
    const newItem: QueuedStep = {
      date,
      steps,
      distance,
      calories,
      timestamp: Date.now()
    };

    setSyncQueue(prev => {
      const newQueue = [...prev, newItem];
      localStorage.setItem('offlineStepQueue', JSON.stringify(newQueue));
      console.log('[OfflineSync] Queued offline data:', date, steps);
      return newQueue;
    });
  }, []);

  return {
    isOnline,
    queueStepData
  };
};
