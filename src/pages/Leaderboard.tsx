import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Loader2, WifiOff, RefreshCw, Footprints } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useNavigate } from "react-router-dom";
import { toast } from 'sonner';

interface LeaderboardEntry {
  rank: number;
  name: string;
  steps: number;
  avatar: string;
  userId: string;
  isCurrentUser: boolean;
}

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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchLeaderboard = async () => {
    try {
      console.log('[Leaderboard] Fetching from RPC function...');
      
      // Use the new RPC function for efficient querying
      const { data, error } = await supabase.rpc('get_today_leaderboard');

      if (error) {
        console.error('[Leaderboard] RPC error:', error);
        // Fallback to direct query if RPC fails
        return fetchLeaderboardFallback();
      }

      console.log('[Leaderboard] RPC data:', data);

      // Transform RPC data to LeaderboardEntry format
      const entries: LeaderboardEntry[] = (data || []).map((row: any) => ({
        rank: Number(row.rank),
        name: row.display_name || 'Unknown',
        steps: row.steps || 0,
        avatar: row.avatar_initials || 'NA',
        userId: row.user_id,
        isCurrentUser: row.user_id === user?.id
      }));

      setLeaderboard(entries);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('[Leaderboard] Error:', error);
      fetchLeaderboardFallback();
    } finally {
      setLoading(false);
    }
  };

  // Fallback to direct query if RPC is not available
  const fetchLeaderboardFallback = async () => {
    try {
      console.log('[Leaderboard] Using fallback query...');
      const today = new Date().toISOString().split('T')[0];
      
      const { data: stepsData, error: stepsError } = await supabase
        .from('daily_steps')
        .select('user_id, steps, date')
        .eq('date', today)
        .order('steps', { ascending: false });

      if (stepsError) {
        console.error('[Leaderboard] Error fetching steps:', stepsError);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_initials');

      if (profilesError) {
        console.error('[Leaderboard] Error fetching profiles:', profilesError);
        return;
      }

      const profilesMap = new Map(
        profilesData?.map(p => [p.id, { name: p.display_name, avatar: p.avatar_initials || 'NA' }]) || []
      );

      const entries: LeaderboardEntry[] = (stepsData || []).map((step, index) => {
        const profile = profilesMap.get(step.user_id);
        return {
          rank: index + 1,
          name: profile?.name || 'Unknown',
          steps: step.steps,
          avatar: profile?.avatar || 'NA',
          userId: step.user_id,
          isCurrentUser: step.user_id === user?.id
        };
      });

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

      setLeaderboard(entries);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('[Leaderboard] Fallback error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    await fetchLeaderboard();
    toast.success('✓ Leaderboard updated');
  }, []);

  useEffect(() => {
    fetchLeaderboard();

    // Set up real-time subscription for daily_steps changes (COD-style updates!)
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
    const refreshInterval = setInterval(fetchLeaderboard, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  }, [user]);

  // Refetch when coming back online
  useEffect(() => {
    if (isOnline) {
      fetchLeaderboard();
    }
  }, [isOnline]);

  const currentUser = leaderboard.find(e => e.isCurrentUser);
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  if (loading) {
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
    <div className="min-h-screen-safe page-with-bottom-nav relative">
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-foreground">
              Leaderboard
            </h1>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
            aria-label="Refresh leaderboard"
          >
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
          Today's Rankings • {leaderboard.length} Participants • Updated {lastUpdate.toLocaleTimeString()}
        </p>
      </motion.header>

      {/* Empty State - Improved */}
      {leaderboard.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Footprints className="h-16 w-16 text-primary/50 mb-4" />
          <p className="text-lg font-semibold text-foreground text-center">
            Be the First!
          </p>
          <p className="text-muted-foreground text-center mt-2">
            No one has logged steps today yet.<br />Start walking to top the leaderboard!
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
      {top3.length >= 3 && (
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
            <span className="mt-2 text-sm font-semibold text-foreground truncate max-w-[80px]">{top3[1].name}</span>
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
            <span className="mt-2 text-sm font-bold text-foreground truncate max-w-[96px]">{top3[0].name}</span>
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
            <span className="mt-2 text-sm font-semibold text-foreground truncate max-w-[80px]">{top3[2].name}</span>
            <span className="text-xs font-medium text-primary">{top3[2].steps.toLocaleString()}</span>
            <div className="mt-2 h-12 w-20 rounded-t-lg bg-amber-600/20 border-t border-x border-amber-600/30" />
          </div>
        </motion.div>
      )}

      {/* Simplified Cards for 1-2 users */}
      {leaderboard.length > 0 && leaderboard.length < 3 && (
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
                      <span className="text-foreground font-semibold">{entry.name}</span>
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
                <span className={`text-sm font-semibold ${entry.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
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
      </PullToRefresh>

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
