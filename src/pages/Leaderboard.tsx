import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Loader2, WifiOff, RefreshCw, Footprints, Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useNavigate } from "react-router-dom";
import { toast } from 'sonner';
import { haptics } from '@/utils/haptics';

interface LeaderboardEntry {
  rank: number;
  name: string;
  steps: number;
  avatar: string;
  userId: string;
  isCurrentUser: boolean;
}

type Period = 'daily' | 'weekly' | 'monthly';

const getRankStyle = (rank: number) => {
  if (rank === 1) return { bg: "bg-yellow-500/20", border: "border-yellow-500/50", text: "text-yellow-400" };
  if (rank === 2) return { bg: "bg-gray-400/20", border: "border-gray-400/50", text: "text-gray-300" };
  if (rank === 3) return { bg: "bg-amber-600/20", border: "border-amber-600/50", text: "text-amber-500" };
  return { bg: "bg-secondary", border: "border-border", text: "text-muted-foreground" };
};

const Leaderboard = () => {
  const { user } = useAuth();
  const { isOnline } = useOfflineSync();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('daily');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollContainerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    
    if (diff > 0 && scrollContainerRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, 120)); // Apply resistance
    }
  }, [isPulling]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > PULL_THRESHOLD) {
      haptics.medium();
      await handleRefresh();
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance]);

  const fetchDailyLeaderboard = async () => {
    try {
      console.log('[Leaderboard] Fetching daily from RPC function...');
      const { data, error } = await supabase.rpc('get_today_leaderboard');

      if (error) {
        console.error('[Leaderboard] RPC error:', error);
        return fetchDailyFallback();
      }

      return (data || []).map((row: any) => ({
        rank: Number(row.rank),
        name: row.display_name || 'Unknown',
        steps: row.steps || 0,
        avatar: row.avatar_initials || 'NA',
        userId: row.user_id,
        isCurrentUser: row.user_id === user?.id
      }));
    } catch (error) {
      console.error('[Leaderboard] Error:', error);
      return fetchDailyFallback();
    }
  };

  const fetchDailyFallback = async () => {
    const today = new Date().toISOString().split('T')[0];
    return fetchLeaderboardForDates(today, today);
  };

  const fetchWeeklyLeaderboard = async () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    
    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    return fetchLeaderboardForDates(startDate, endDate);
  };

  const fetchMonthlyLeaderboard = async () => {
    try {
      console.log('[Leaderboard] Fetching monthly from RPC function...');
      const { data, error } = await supabase.rpc('get_monthly_leaderboard');

      if (error) {
        console.error('[Leaderboard] Monthly RPC error:', error);
        return fetchMonthlyFallback();
      }

      return (data || []).map((row: any) => ({
        rank: Number(row.rank),
        name: row.display_name || 'Unknown',
        steps: row.total_steps || 0,
        avatar: row.avatar_initials || 'NA',
        userId: row.user_id,
        isCurrentUser: row.user_id === user?.id
      }));
    } catch (error) {
      console.error('[Leaderboard] Monthly error:', error);
      return fetchMonthlyFallback();
    }
  };

  const fetchMonthlyFallback = async () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const startDate = startOfMonth.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    return fetchLeaderboardForDates(startDate, endDate);
  };

  const fetchLeaderboardForDates = async (startDate: string, endDate: string) => {
    try {
      console.log('[Leaderboard] Fetching for dates:', startDate, 'to', endDate);
      
      const { data: stepsData, error: stepsError } = await supabase
        .from('daily_steps')
        .select('user_id, steps')
        .gte('date', startDate)
        .lte('date', endDate);

      if (stepsError) {
        console.error('[Leaderboard] Error fetching steps:', stepsError);
        return [];
      }

      // Aggregate steps by user
      const userSteps = new Map<string, number>();
      stepsData?.forEach(step => {
        const current = userSteps.get(step.user_id) || 0;
        userSteps.set(step.user_id, current + step.steps);
      });

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_initials');

      if (profilesError) {
        console.error('[Leaderboard] Error fetching profiles:', profilesError);
        return [];
      }

      const profilesMap = new Map(
        profilesData?.map(p => [p.id, { name: p.display_name, avatar: p.avatar_initials || 'NA' }]) || []
      );

      // Convert to array and sort
      const entries: LeaderboardEntry[] = Array.from(userSteps.entries())
        .map(([userId, steps]) => {
          const profile = profilesMap.get(userId);
          return {
            rank: 0,
            name: profile?.name || 'Unknown',
            steps,
            avatar: profile?.avatar || 'NA',
            userId,
            isCurrentUser: userId === user?.id
          };
        })
        .sort((a, b) => b.steps - a.steps)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      // Add current user if not in list
      if (user && !entries.find(e => e.userId === user.id)) {
        const currentUserProfile = profilesMap.get(user.id);
        if (currentUserProfile) {
          entries.push({
            rank: entries.length + 1,
            name: currentUserProfile.name,
            steps: 0,
            avatar: currentUserProfile.avatar,
            userId: user.id,
            isCurrentUser: true
          });
        }
      }

      return entries;
    } catch (error) {
      console.error('[Leaderboard] Error:', error);
      return [];
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    let entries: LeaderboardEntry[] = [];

    switch (period) {
      case 'daily':
        entries = await fetchDailyLeaderboard();
        break;
      case 'weekly':
        entries = await fetchWeeklyLeaderboard();
        break;
      case 'monthly':
        entries = await fetchMonthlyLeaderboard();
        break;
    }

    setLeaderboard(entries);
    setLastUpdate(new Date());
    setLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    haptics.light();
    await fetchLeaderboard();
    console.log('[Leaderboard] Refreshed successfully');
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel('leaderboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_steps'
        },
        () => {
          console.log('[Leaderboard] Real-time update received');
          fetchLeaderboard();
        }
      )
      .subscribe();

    const refreshInterval = setInterval(fetchLeaderboard, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  }, [user, period]);

  useEffect(() => {
    if (isOnline) {
      fetchLeaderboard();
    }
  }, [isOnline]);

  const currentUser = leaderboard.find(e => e.isCurrentUser);
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const periodLabels = {
    daily: 'Today',
    weekly: 'This Week',
    monthly: 'This Month'
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading leaderboard...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef}
      className="min-h-screen pb-20 overflow-y-auto safe-area-pt"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <motion.div 
          className="flex items-center justify-center py-4"
          style={{ height: pullDistance }}
          initial={{ opacity: 0 }}
          animate={{ opacity: pullDistance > PULL_THRESHOLD ? 1 : 0.5 }}
        >
          <RefreshCw 
            className={`h-6 w-6 text-primary ${pullDistance > PULL_THRESHOLD ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${pullDistance * 2}deg)` }}
          />
          <span className="ml-2 text-xs text-muted-foreground">
            {pullDistance > PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </motion.div>
      )}
      {/* Refresh Indicator */}
      {isRefreshing && (
        <motion.div 
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-4 pt-safe"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 backdrop-blur-sm">
            <RefreshCw className="h-4 w-4 text-primary animate-spin" />
            <span className="text-xs font-medium text-primary">Refreshing...</span>
          </div>
        </motion.div>
      )}

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2">
          <div className="flex items-center gap-2 text-yellow-400">
            <WifiOff className="h-4 w-4" />
            <span className="text-xs font-medium">Offline - Showing cached data</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold uppercase tracking-wider text-foreground">
              Leaderboard
            </h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-5 w-5 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Period Tabs */}
      <div className="px-4 pb-4">
        <div className="flex rounded-xl bg-secondary/50 p-1 border border-border/50">
          <button
            onClick={() => setPeriod('daily')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              period === 'daily'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Daily
          </button>
          <button
            onClick={() => setPeriod('weekly')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              period === 'weekly'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Weekly
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              period === 'monthly'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            Monthly
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {periodLabels[period]} • {leaderboard.length} participants
        </p>
      </div>

      {/* Empty State */}
      {leaderboard.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <Footprints className="h-14 w-14 text-primary/50 mb-4" />
          <p className="text-lg font-semibold text-foreground text-center">
            Be the First!
          </p>
          <p className="text-muted-foreground text-center text-sm mt-2">
            No one has logged steps yet.
          </p>
          <Button 
            variant="outline"
            onClick={() => {
              haptics.medium();
              navigate('/');
            }}
            className="mt-4"
          >
            Start Walking
          </Button>
        </div>
      )}

      {/* Top 3 Podium */}
      {top3.length >= 3 && (
        <motion.div 
          className="flex items-end justify-center gap-2 px-4 py-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          key={period}
        >
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className={`h-14 w-14 rounded-full border-2 border-gray-400/50 bg-secondary flex items-center justify-center ${top3[1].isCurrentUser ? 'ring-2 ring-primary' : ''}`}>
                <span className="text-base font-bold text-gray-300">{top3[1].avatar}</span>
              </div>
              <Medal className="absolute -bottom-1 -right-1 h-4 w-4 text-gray-300" />
            </div>
            <span className="mt-1.5 text-xs font-semibold text-foreground truncate max-w-[70px]">{top3[1].name}</span>
            <span className="text-xs font-medium text-primary">{top3[1].steps.toLocaleString()}</span>
            <div className="mt-1.5 h-14 w-16 rounded-t-lg bg-gray-400/20 border-t border-x border-gray-400/30" />
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <Crown className="absolute -top-5 left-1/2 -translate-x-1/2 h-5 w-5 text-yellow-400" />
              <div className={`h-16 w-16 rounded-full border-2 border-yellow-500/50 bg-secondary flex items-center justify-center ${top3[0].isCurrentUser ? 'ring-2 ring-primary' : ''}`}>
                <span className="text-lg font-bold text-yellow-400">{top3[0].avatar}</span>
              </div>
            </div>
            <span className="mt-1.5 text-sm font-bold text-foreground truncate max-w-[80px]">{top3[0].name}</span>
            <span className="text-xs font-bold text-yellow-400">{top3[0].steps.toLocaleString()}</span>
            <div className="mt-1.5 h-20 w-20 rounded-t-lg bg-yellow-500/20 border-t border-x border-yellow-500/30" />
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className={`h-14 w-14 rounded-full border-2 border-amber-600/50 bg-secondary flex items-center justify-center ${top3[2].isCurrentUser ? 'ring-2 ring-primary' : ''}`}>
                <span className="text-base font-bold text-amber-500">{top3[2].avatar}</span>
              </div>
              <Medal className="absolute -bottom-1 -right-1 h-4 w-4 text-amber-500" />
            </div>
            <span className="mt-1.5 text-xs font-semibold text-foreground truncate max-w-[70px]">{top3[2].name}</span>
            <span className="text-xs font-medium text-primary">{top3[2].steps.toLocaleString()}</span>
            <div className="mt-1.5 h-10 w-16 rounded-t-lg bg-amber-600/20 border-t border-x border-amber-600/30" />
          </div>
        </motion.div>
      )}

      {/* Cards for 1-2 users */}
      {leaderboard.length > 0 && leaderboard.length < 3 && (
        <div className="px-4 py-4 space-y-3">
          {leaderboard.map((entry, index) => {
            const style = getRankStyle(index + 1);
            return (
              <div 
                key={entry.userId}
                className={`p-4 rounded-xl ${style.bg} border ${style.border} ${entry.isCurrentUser ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-full bg-secondary flex items-center justify-center border-2 ${style.border}`}>
                      <span className={`text-lg font-bold ${style.text}`}>{entry.avatar}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {index === 0 && <Crown className="h-4 w-4 text-yellow-400" />}
                        {index === 1 && <Medal className="h-4 w-4 text-gray-300" />}
                        <span className={`font-bold ${style.text}`}>#{entry.rank}</span>
                      </div>
                      <span className="text-foreground font-medium text-sm">{entry.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{entry.steps.toLocaleString()}</p>
                    <span className="text-xs text-muted-foreground">steps</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rest of the list */}
      <div className="px-4 space-y-2 pb-4">
        {rest.map((entry, index) => {
          const style = getRankStyle(entry.rank);
          return (
            <motion.div
              key={entry.userId}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                entry.isCurrentUser 
                  ? 'bg-primary/10 border border-primary/30' 
                  : style.bg + ' border ' + style.border
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <div className="flex items-center gap-3">
                <span className={`w-7 text-sm font-bold ${entry.isCurrentUser ? 'text-primary' : style.text}`}>
                  #{entry.rank}
                </span>
                <div className="h-9 w-9 rounded-full bg-secondary border border-border flex items-center justify-center">
                  <span className="text-xs font-semibold text-foreground">{entry.avatar}</span>
                </div>
                <span className={`text-sm font-medium ${entry.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                  {entry.name}
                </span>
              </div>
              <span className="text-sm font-bold text-primary">
                {entry.steps.toLocaleString()}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Pinned User Rank */}
      {currentUser && currentUser.rank > 3 && (
        <motion.div 
          className="fixed left-4 right-4 bottom-24 z-40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between rounded-xl bg-primary/20 border border-primary/40 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-primary">
                #{currentUser.rank}
              </span>
              <div className="h-9 w-9 rounded-full bg-secondary border border-primary/50 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">{currentUser.avatar}</span>
              </div>
              <div>
                <span className="text-sm font-bold text-primary">{currentUser.name}</span>
                <p className="text-[10px] text-muted-foreground">Your Rank</p>
              </div>
            </div>
            <span className="text-lg font-bold text-primary">
              {currentUser.steps.toLocaleString()}
            </span>
          </div>
        </motion.div>
      )}

      <BottomNav />
    </div>
  );
};

export default Leaderboard;
