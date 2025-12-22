import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Loader2, WifiOff, Footprints, Flame } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { PullToRefresh } from "@/components/PullToRefresh";
import { RubberBandScroll } from "@/components/ui/RubberBandScroll";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useNavigate } from "react-router-dom";


type TabType = 'today' | 'week' | 'month';

interface LeaderboardEntry {
  rank: number;
  name: string;
  steps: number;
  avatar: string;
  userId: string;
  isCurrentUser: boolean;
  streak: number;
}

const StreakBadge = ({ streak }: { streak: number }) => {
  if (streak === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold">
      <Flame className="h-3 w-3" />
      {streak}
    </span>
  );
};

const getRankStyle = (rank: number) => {
  if (rank === 1) return { bg: "bg-yellow-500/20", border: "border-yellow-500/50", text: "text-yellow-400" };
  if (rank === 2) return { bg: "bg-gray-400/20", border: "border-gray-400/50", text: "text-gray-300" };
  if (rank === 3) return { bg: "bg-amber-600/20", border: "border-amber-600/50", text: "text-amber-500" };
  return { bg: "bg-secondary", border: "border-border", text: "text-muted-foreground" };
};

const TAB_CONFIG: { key: TabType; label: string; subtitle: string }[] = [
  { key: 'today', label: 'Today', subtitle: "Today's Rankings" },
  { key: 'week', label: 'Week', subtitle: "This Week's Rankings" },
  { key: 'month', label: 'Month', subtitle: "This Month's Rankings" },
];

const Leaderboard = () => {
  const { user } = useAuth();
  const { isOnline } = useOfflineSync();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchLeaderboard = useCallback(async (tab: TabType = activeTab) => {
    try {
      setLoading(true);
      console.log(`[Leaderboard] Fetching ${tab} leaderboard...`);
      
      let data: any[] | null = null;
      let error: any = null;

      if (tab === 'today') {
        const result = await supabase.rpc('get_today_leaderboard');
        data = result.data;
        error = result.error;
      } else if (tab === 'week') {
        const result = await supabase.rpc('get_weekly_leaderboard');
        data = result.data;
        error = result.error;
      } else if (tab === 'month') {
        const result = await supabase.rpc('get_monthly_leaderboard');
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('[Leaderboard] RPC error:', error);
        return;
      }

      console.log('[Leaderboard] RPC data:', data);

      // Transform RPC data to LeaderboardEntry format
      const entries: LeaderboardEntry[] = (data || []).map((row: any) => ({
        rank: Number(row.rank),
        name: row.display_name || 'Unknown',
        steps: tab === 'today' ? (row.steps || 0) : (row.total_steps || 0),
        avatar: row.avatar_initials || 'NA',
        userId: row.user_id,
        isCurrentUser: row.user_id === user?.id,
        streak: row.current_streak || 0
      }));

      setLeaderboard(entries);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('[Leaderboard] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user?.id]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    fetchLeaderboard(tab);
  };

  const handleRefresh = useCallback(async () => {
    await fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    fetchLeaderboard();

    // Set up real-time subscription for daily_steps changes
    const channel = supabase
      .channel('leaderboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_steps'
        },
        (payload) => {
          console.log('[Leaderboard] Real-time update received:', payload);
          fetchLeaderboard();
        }
      )
      .subscribe((status) => {
        console.log('[Leaderboard] Real-time subscription status:', status);
      });

    // Auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => fetchLeaderboard(), 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  }, [user, fetchLeaderboard]);

  // Refetch when coming back online
  useEffect(() => {
    if (isOnline) {
      fetchLeaderboard();
    }
  }, [isOnline, fetchLeaderboard]);

  const currentUser = leaderboard.find(e => e.isCurrentUser);
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const activeTabConfig = TAB_CONFIG.find(t => t.key === activeTab)!;

  if (loading && leaderboard.length === 0) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col page-with-bottom-nav relative">
      <RubberBandScroll className="flex-1" contentClassName="pb-24">
      <PullToRefresh onRefresh={handleRefresh} className="h-full">

      {/* Offline Banner with safe area */}
      {!isOnline && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2 safe-area-pt">
          <div className="flex items-center gap-2 text-yellow-400">
            <WifiOff className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Offline Mode - Showing cached data
            </span>
          </div>
        </div>
      )}

      {/* Header with safe area */}
      <motion.header 
        className={`px-4 pb-4 ${isOnline ? 'header-safe' : 'pt-4'}`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-foreground">
            Leaderboard
          </h1>
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
          {activeTabConfig.subtitle} • {leaderboard.length} Participants • Updated {lastUpdate.toLocaleTimeString()}
        </p>
      </motion.header>

      {/* Tab Switcher */}
      <div className="px-4 pb-4">
        <div className="flex rounded-lg bg-secondary p-1 gap-1">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex-1 py-2 px-3 text-sm font-medium uppercase tracking-wider rounded-md transition-all ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading overlay for tab switches */}
      {loading && leaderboard.length > 0 && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State - Improved */}
      {!loading && leaderboard.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Footprints className="h-16 w-16 text-primary/50 mb-4" />
          <p className="text-lg font-semibold text-foreground text-center">
            Be the First!
          </p>
          <p className="text-muted-foreground text-center mt-2">
            No one has logged steps {activeTab === 'today' ? 'today' : activeTab === 'week' ? 'this week' : 'this month'} yet.<br />Start walking to top the leaderboard!
          </p>
          <Button 
            variant="outline"
            onClick={() => navigate('/')}
            className="mt-6"
          >
            View Dashboard
          </Button>
        </div>
      )}

      {/* Top 3 Podium - Only show if exactly 3+ users */}
      {!loading && top3.length >= 3 && (
        <motion.div 
          className="flex items-end justify-center gap-2 px-4 py-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className={`h-16 w-16 rounded-full border-2 border-gray-400/50 bg-secondary flex items-center justify-center ${top3[1].isCurrentUser ? 'ring-2 ring-primary' : ''}`}>
                <span className="text-lg font-bold text-gray-300">{top3[1].avatar}</span>
              </div>
              <Medal className="absolute -bottom-1 -right-1 h-5 w-5 text-gray-300" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-sm font-semibold text-foreground truncate max-w-[70px]">{top3[1].name}</span>
              <StreakBadge streak={top3[1].streak} />
            </div>
            <span className="text-xs font-medium text-primary">{top3[1].steps.toLocaleString()}</span>
            <div className="mt-2 h-16 w-20 rounded-t-lg bg-gray-400/20 border-t border-x border-gray-400/30" />
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 h-6 w-6 text-yellow-400" />
              <div className={`h-20 w-20 rounded-full border-2 border-yellow-500/50 bg-secondary flex items-center justify-center ${top3[0].isCurrentUser ? 'ring-2 ring-primary' : ''}`}>
                <span className="text-xl font-bold text-yellow-400">{top3[0].avatar}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-sm font-bold text-foreground truncate max-w-[80px]">{top3[0].name}</span>
              <StreakBadge streak={top3[0].streak} />
            </div>
            <span className="text-xs font-bold text-yellow-400">{top3[0].steps.toLocaleString()}</span>
            <div className="mt-2 h-24 w-24 rounded-t-lg bg-yellow-500/20 border-t border-x border-yellow-500/30" />
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className={`h-16 w-16 rounded-full border-2 border-amber-600/50 bg-secondary flex items-center justify-center ${top3[2].isCurrentUser ? 'ring-2 ring-primary' : ''}`}>
                <span className="text-lg font-bold text-amber-500">{top3[2].avatar}</span>
              </div>
              <Medal className="absolute -bottom-1 -right-1 h-5 w-5 text-amber-500" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-sm font-semibold text-foreground truncate max-w-[70px]">{top3[2].name}</span>
              <StreakBadge streak={top3[2].streak} />
            </div>
            <span className="text-xs font-medium text-primary">{top3[2].steps.toLocaleString()}</span>
            <div className="mt-2 h-12 w-20 rounded-t-lg bg-amber-600/20 border-t border-x border-amber-600/30" />
          </div>
        </motion.div>
      )}

      {/* Simplified Cards for 1-2 users */}
      {!loading && leaderboard.length > 0 && leaderboard.length < 3 && (
        <motion.div 
          className="px-4 py-6 space-y-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {leaderboard.map((entry, index) => {
            const style = getRankStyle(index + 1);
            return (
              <div 
                key={entry.userId}
                className={`p-4 rounded-xl ${style.bg} border ${style.border} ${entry.isCurrentUser ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-14 w-14 rounded-full bg-secondary flex items-center justify-center border-2 ${style.border}`}>
                      <span className={`text-xl font-bold ${style.text}`}>{entry.avatar}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {index === 0 && <Crown className="h-5 w-5 text-yellow-400" />}
                        {index === 1 && <Medal className="h-5 w-5 text-gray-300" />}
                        <span className={`font-bold ${style.text}`}>#{entry.rank}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-foreground font-semibold">{entry.name}</span>
                        <StreakBadge streak={entry.streak} />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{entry.steps.toLocaleString()}</p>
                    <span className="text-xs text-muted-foreground">steps</span>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Full List */}
      {!loading && (
        <div className="px-4 space-y-2 pb-4">
          {rest.map((entry, index) => {
            const style = getRankStyle(entry.rank);
            return (
              <motion.div
                key={entry.userId}
                className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                  entry.isCurrentUser 
                    ? 'bg-primary/10 border border-primary/30' 
                    : style.bg + ' border ' + style.border
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
              >
                <div className="flex items-center gap-4">
                  <span className={`w-8 text-lg font-bold ${entry.isCurrentUser ? 'text-primary' : style.text}`}>
                    #{entry.rank}
                  </span>
                  <div className="h-10 w-10 rounded-full bg-secondary border border-border flex items-center justify-center">
                    <span className="text-sm font-semibold text-foreground">{entry.avatar}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-semibold ${entry.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                      {entry.name}
                    </span>
                    <StreakBadge streak={entry.streak} />
                  </div>
                </div>
                <span className="text-sm font-bold text-primary">
                  {entry.steps.toLocaleString()}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
      </PullToRefresh>
      </RubberBandScroll>

      {/* Pinned User Rank - Fixed above bottom nav */}
      {currentUser && currentUser.rank > 3 && (
        <motion.div 
          className="fixed left-4 right-4 z-fixed fixed-above-nav"
          style={{ marginBottom: '0.5rem' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-center justify-between rounded-lg bg-primary/20 border border-primary/40 px-4 py-3 glass-strong">
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-primary">
                #{currentUser.rank}
              </span>
              <div className="h-10 w-10 rounded-full bg-secondary border border-primary/50 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">{currentUser.avatar}</span>
              </div>
              <div>
                <span className="text-sm font-bold text-primary">{currentUser.name}</span>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your Rank</p>
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
