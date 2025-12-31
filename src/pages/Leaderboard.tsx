import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Crown, Medal, Loader2, WifiOff, Footprints, Flame } from "lucide-react";
import { SkeletonCard, SkeletonCircle, SkeletonText } from "@/components/ui/SkeletonCard";
import { BottomNav } from "@/components/BottomNav";
import { PullToRefresh } from "@/components/PullToRefresh";
import { RubberBandScroll } from "@/components/ui/RubberBandScroll";
import { StandardHeader } from "@/components/StandardHeader";
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
    console.log('[Leaderboard] Fetching - Version: Fix Duplicates + Privacy V2');
    try {
      setLoading(true);

      // Parallel fetch: Leaderboard Data AND Hidden Users AND Current User Profile
      const [leaderboardResult, hiddenUsersResult, currentUserProfileResult] = await Promise.all([
        (async () => {
          if (tab === 'today') return supabase.rpc('get_today_leaderboard');
          if (tab === 'week') return supabase.rpc('get_weekly_leaderboard');
          return supabase.rpc('get_monthly_leaderboard');
        })(),
        supabase.from('profiles').select('id').eq('show_on_leaderboard', false),
        user?.id ? supabase.from('profiles').select('show_on_leaderboard').eq('id', user.id).single() : { data: null, error: null }
      ]);

      const { data, error } = leaderboardResult;
      const { data: hiddenUsers } = hiddenUsersResult;
      const { data: currentUserProfile } = currentUserProfileResult;

      if (error) {
        console.error('[Leaderboard] Error fetching data:', error);
        return;
      }

      // Create a Set of hidden User IDs
      const hiddenUserIds = new Set((hiddenUsers || []).map(u => u.id));

      // Explicitly add current user to hidden set if their profile says so 
      // (Safety net in case the bulk fetch didn't catch the update yet)
      if (user?.id && currentUserProfile?.show_on_leaderboard === false) {
        hiddenUserIds.add(user.id);
      }

      // 1. Transform
      let entries: LeaderboardEntry[] = (data || []).map((row: any) => ({
        rank: Number(row.rank),
        name: row.display_name || 'Unknown',
        steps: tab === 'today' ? (row.steps || 0) : (row.total_steps || 0),
        avatar: row.avatar_initials || 'NA',
        userId: row.user_id,
        isCurrentUser: row.user_id === user?.id,
        streak: row.current_streak || 0
      }));

      // 2. Deduplicate (Keep first occurrence)
      const uniqueEntriesMap = new Map();
      entries.forEach(entry => {
        if (!uniqueEntriesMap.has(entry.userId)) {
          uniqueEntriesMap.set(entry.userId, entry);
        }
      });
      entries = Array.from(uniqueEntriesMap.values());

      // 3. Filter Hidden Users
      entries = entries.filter((entry: LeaderboardEntry) => !hiddenUserIds.has(entry.userId));

      // 4. Recalculate Ranks
      entries = entries.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      setLeaderboard(entries);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('[Leaderboard] Exception:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user?.id]);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        if (loading) {
          console.warn('[Leaderboard] Force stopping loading after timeout');
          setLoading(false);
        }
      }, 5000); // 5 seconds safety timeout
      return () => clearTimeout(timer);
    }
  }, [loading]);

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
          fetchLeaderboard();
        }
      )
      .subscribe((status) => {
        // Subscription status
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
      <div className="min-h-screen-safe flex flex-col p-4 animate-in fade-in duration-500">
        {/* Title Skeleton */}
        <div className="flex items-center gap-2 mb-2">
          <SkeletonCircle size="h-6 w-6" />
          <SkeletonText width="w-40" className="h-6" />
        </div>
        <SkeletonText width="w-60" className="h-4 mb-6" />

        {/* Podium Skeleton */}
        <div className="flex items-end justify-center gap-2 mb-8 mt-4">
          <div className="flex flex-col items-center gap-2">
            <SkeletonCircle size="h-16 w-16" />
            <SkeletonText width="w-16" className="h-4" />
            <div className="h-16 w-20 rounded-t-lg bg-secondary/50 skeleton-shimmer" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <SkeletonCircle size="h-20 w-20" />
            <SkeletonText width="w-20" className="h-4" />
            <div className="h-24 w-24 rounded-t-lg bg-secondary/50 skeleton-shimmer" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <SkeletonCircle size="h-16 w-16" />
            <SkeletonText width="w-16" className="h-4" />
            <div className="h-12 w-20 rounded-t-lg bg-secondary/50 skeleton-shimmer" />
          </div>
        </div>

        {/* List Skeleton */}
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} variant="list" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col page-with-bottom-nav relative">
      <RubberBandScroll className="flex-1" contentClassName="pb-8">
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

          {/* Standard Header */}
          <StandardHeader
            title="Leaderboard"
            showBack={true}
            subtitle={`${activeTabConfig.subtitle} • ${leaderboard.length} Participants`}
          />

          {/* Tab Switcher */}
          <div className="px-4 pb-4">
            <div className="flex rounded-lg bg-secondary p-1 gap-1">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex-1 py-2 px-3 text-sm font-medium uppercase tracking-wider rounded-md transition-all ${activeTab === tab.key
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
              className="flex items-end justify-center gap-3 px-4 py-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              {/* 2nd Place */}
              <motion.div
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <div className="relative">
                  <div className={`h-16 w-16 rounded-full border-2 border-gray-400/50 bg-secondary flex items-center justify-center shadow-depth ${top3[1].isCurrentUser ? 'ring-2 ring-primary' : ''}`}>
                    <span className="text-lg font-bold text-gray-300">{top3[1].avatar}</span>
                  </div>
                  <Medal className="absolute -bottom-1 -right-1 h-5 w-5 text-gray-300 drop-shadow-lg" />
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm font-semibold text-foreground truncate max-w-[70px]">{top3[1].name}</span>
                  <StreakBadge streak={top3[1].streak} />
                </div>
                <span className="text-xs font-medium text-primary">{top3[1].steps.toLocaleString()}</span>
                <motion.div
                  className="mt-2 h-16 w-20 rounded-t-lg bg-gray-400/20 border-t border-x border-gray-400/30 shadow-depth"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  style={{ transformOrigin: "bottom" }}
                />
              </motion.div>

              {/* 1st Place */}
              <motion.div
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, type: "spring" }}
              >
                <div className="relative">
                  <motion.div
                    animate={{ y: [-2, 2, -2] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Crown className="absolute -top-7 left-1/2 -translate-x-1/2 h-7 w-7 text-yellow-400 drop-shadow-lg" />
                  </motion.div>
                  <div className={`h-20 w-20 rounded-full border-2 border-yellow-500/50 bg-secondary flex items-center justify-center shadow-glow-md ${top3[0].isCurrentUser ? 'ring-2 ring-primary' : ''}`}>
                    <span className="text-xl font-bold text-yellow-400">{top3[0].avatar}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm font-bold text-foreground truncate max-w-[80px]">{top3[0].name}</span>
                  <StreakBadge streak={top3[0].streak} />
                </div>
                <span className="text-xs font-bold text-yellow-400">{top3[0].steps.toLocaleString()}</span>
                <motion.div
                  className="mt-2 h-24 w-24 rounded-t-lg bg-yellow-500/20 border-t border-x border-yellow-500/30 shadow-glow-sm relative overflow-hidden"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                  style={{ transformOrigin: "bottom" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent" />
                </motion.div>
              </motion.div>

              {/* 3rd Place */}
              <motion.div
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, type: "spring" }}
              >
                <div className="relative">
                  <div className={`h-16 w-16 rounded-full border-2 border-amber-600/50 bg-secondary flex items-center justify-center shadow-depth ${top3[2].isCurrentUser ? 'ring-2 ring-primary' : ''}`}>
                    <span className="text-lg font-bold text-amber-500">{top3[2].avatar}</span>
                  </div>
                  <Medal className="absolute -bottom-1 -right-1 h-5 w-5 text-amber-500 drop-shadow-lg" />
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm font-semibold text-foreground truncate max-w-[70px]">{top3[2].name}</span>
                  <StreakBadge streak={top3[2].streak} />
                </div>
                <span className="text-xs font-medium text-primary">{top3[2].steps.toLocaleString()}</span>
                <motion.div
                  className="mt-2 h-12 w-20 rounded-t-lg bg-amber-600/20 border-t border-x border-amber-600/30 shadow-depth"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.45, type: "spring" }}
                  style={{ transformOrigin: "bottom" }}
                />
              </motion.div>
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
                    className={`flex items-center justify-between rounded-lg px-4 py-3 ${entry.isCurrentUser
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
          className="fixed left-4 right-4 z-fixed fixed-above-nav mb-2"
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
