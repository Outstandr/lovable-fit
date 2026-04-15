import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Crown, Medal, Loader2, WifiOff, Footprints, Flame, Globe, Users, MapPin, Bell, UserPlus, Lock, TrendingUp } from "lucide-react";
import { SkeletonCard, SkeletonCircle, SkeletonText } from "@/components/ui/SkeletonCard";
import { BottomNav } from "@/components/BottomNav";
import { PullToRefresh } from "@/components/PullToRefresh";
import { RubberBandScroll } from "@/components/ui/RubberBandScroll";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useNavigate } from "react-router-dom";
import { AVATARS } from "@/components/profile/AvatarSelector";
import { FriendsLeaderboard } from "@/components/leaderboard/FriendsLeaderboard";
import { LocalLeaderboard } from "@/components/leaderboard/LocalLeaderboard";
import { PendingInvitationsSheet } from "@/components/leaderboard/PendingInvitationsSheet";
import { InviteToGroupModal } from "@/components/leaderboard/InviteToGroupModal";

type ScopeType = 'friends' | 'global' | 'local';
type TabType = 'today' | 'week' | 'month';

interface LeaderboardEntry {
  rank: number;
  name: string;
  username: string | null;
  steps: number;
  avatarInitials: string;
  avatarUrl: string | null;
  userId: string;
  isCurrentUser: boolean;
  streak: number;
}

const AvatarDisplay = ({ entry, size = "md", style }: { entry: LeaderboardEntry, size?: "sm" | "md" | "lg" | "xl", style?: any }) => {
  const sizeClasses = { sm: "h-10 w-10 text-sm", md: "h-14 w-14 text-xl", lg: "h-16 w-16 text-lg", xl: "h-20 w-20 text-xl" };
  const isSelected = entry.isCurrentUser;
  const borderClass = style?.border || "border-border";
  return (
    <div className={`relative ${sizeClasses[size]} rounded-full bg-secondary flex items-center justify-center border-2 ${borderClass} overflow-hidden ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
      {entry.avatarUrl ? (
        <img src={entry.avatarUrl} alt={entry.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <span className={`font-bold ${style?.text || 'text-foreground'}`}>{entry.avatarInitials}</span>
      )}
    </div>
  );
};

const StreakBadge = ({ streak }: { streak: number }) => {
  if (streak === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold">
      <Flame className="h-3 w-3" />{streak}
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
  const [activeScope, setActiveScope] = useState<ScopeType>('friends');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [currentUserSteps, setCurrentUserSteps] = useState(0);
  const QUALIFY_THRESHOLD = 10000;

  // Invitation state
  const [showInvitations, setShowInvitations] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<{ userId: string; name: string; avatarUrl: string | null } | null>(null);
  const [userGroups, setUserGroups] = useState<{ id: string; name: string; emoji: string }[]>([]);

  // Fetch pending invitation count
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      try {
        const { data } = await supabase.rpc('get_pending_invitations', { target_user_id: user.id });
        setPendingCount((data || []).length);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch current user's step count for qualify progress
  useEffect(() => {
    if (!user) return;
    const fetchUserSteps = async () => {
      try {
        const { data } = await supabase
          .from('daily_steps')
          .select('steps')
          .eq('user_id', user.id)
          .eq('date', new Date().toISOString().split('T')[0])
          .single();
        setCurrentUserSteps(data?.steps || 0);
      } catch {}
    };
    fetchUserSteps();
    const interval = setInterval(fetchUserSteps, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch user groups for invite modal
  useEffect(() => {
    if (!user) return;
    const fetchGroups = async () => {
      try {
        const { data: memberships } = await supabase.from('friend_group_members').select('group_id').eq('user_id', user.id);
        if (!memberships?.length) return;
        const { data: groups } = await supabase.from('friend_groups').select('id, name, emoji').in('id', memberships.map(m => m.group_id));
        setUserGroups((groups || []).map(g => ({ id: g.id, name: g.name, emoji: g.emoji || '🏆' })));
      } catch {}
    };
    fetchGroups();
  }, [user]);

  const fetchLeaderboard = useCallback(async (tab: TabType = activeTab) => {
    try {
      setLoading(true);
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

      if (error) return;

      const hiddenUserIds = new Set((hiddenUsers || []).map(u => u.id));
      if (user?.id && currentUserProfile?.show_on_leaderboard === false) hiddenUserIds.add(user.id);

      let entries: LeaderboardEntry[] = (data || []).map((row: any) => {
        const avatarAsset = AVATARS.find(a => a.id === row.avatar_id);
        return {
          rank: Number(row.rank),
          name: row.display_name || 'Unknown',
          username: row.username ? `@${row.username}` : null,
          steps: tab === 'today' ? (row.steps || 0) : (row.total_steps || 0),
          avatarInitials: row.avatar_initials || 'NA',
          avatarUrl: row.avatar_url || (avatarAsset ? avatarAsset.url : null),
          userId: row.user_id,
          isCurrentUser: row.user_id === user?.id,
          streak: row.current_streak || 0
        };
      });

      const uniqueMap = new Map();
      entries.forEach(e => { if (!uniqueMap.has(e.userId)) uniqueMap.set(e.userId, e); });
      entries = Array.from(uniqueMap.values());
      entries = entries.filter(e => !hiddenUserIds.has(e.userId));
      entries = entries.map((e, i) => ({ ...e, rank: i + 1 }));

      setLeaderboard(entries);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('[Leaderboard] Exception:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user?.id]);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => { if (loading) setLoading(false); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    fetchLeaderboard(tab);
  };

  const handleRefresh = useCallback(async () => { await fetchLeaderboard(); }, [fetchLeaderboard]);

  useEffect(() => {
    if (activeScope === 'global') {
      fetchLeaderboard();
      const channel = supabase.channel('leaderboard-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'daily_steps' }, () => fetchLeaderboard()).subscribe();
      const interval = setInterval(() => fetchLeaderboard(), 30000);
      return () => { supabase.removeChannel(channel); clearInterval(interval); };
    }
  }, [user, fetchLeaderboard, activeScope]);

  useEffect(() => { if (isOnline && activeScope === 'global') fetchLeaderboard(); }, [isOnline, fetchLeaderboard, activeScope]);

  const handleTapUser = (entry: LeaderboardEntry) => {
    if (entry.isCurrentUser || userGroups.length === 0) return;
    setInviteTarget({ userId: entry.userId, name: entry.name, avatarUrl: entry.avatarUrl });
    setShowInviteUser(true);
  };

  const currentUser = leaderboard.find(e => e.isCurrentUser);
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const activeTabConfig = TAB_CONFIG.find(t => t.key === activeTab)!;

  const scopeLabel = activeScope === 'friends' ? 'Friends' : activeScope === 'global' ? 'Global' : 'Local';

  return (
    <div className="h-screen flex flex-col page-with-bottom-nav relative">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2 safe-area-pt flex-shrink-0">
          <div className="flex items-center gap-2 text-yellow-400">
            <WifiOff className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Offline Mode</span>
          </div>
        </div>
      )}

      {/* Header */}
      <motion.header
        className="px-4 pb-2 header-safe flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-gradient-cyan animate-glow-pulse">
              Leaderboard
            </h1>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
              {scopeLabel} {activeScope !== 'friends' && `• ${activeTabConfig.subtitle}`}
            </p>
          </div>

          {/* Right: Invite badge + Scope pills */}
          <div className="flex items-center gap-1.5">
            {/* Pending invitations bell */}
            <button
              onClick={() => setShowInvitations(true)}
              className="relative p-2 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-[9px] font-black text-primary-foreground flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* Scope pill buttons */}
            {[
              { key: 'friends' as ScopeType, icon: Users, label: 'Friends' },
              { key: 'global' as ScopeType, icon: Globe, label: 'Global' },
              { key: 'local' as ScopeType, icon: MapPin, label: 'Local' },
            ].map(scope => {
              const Icon = scope.icon;
              const isActive = activeScope === scope.key;
              return (
                <button
                  key={scope.key}
                  onClick={() => setActiveScope(scope.key)}
                  className={`p-2 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-primary to-cyan-500 text-white shadow-[0_0_12px_rgba(0,200,255,0.2)]'
                      : 'text-muted-foreground hover:bg-secondary/50'
                  }`}
                  title={scope.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      </motion.header>

      <RubberBandScroll className="flex-1 overflow-y-auto">
        <PullToRefresh onRefresh={handleRefresh} className="h-full">
          {/* Friends Tab */}
          {activeScope === 'friends' && <FriendsLeaderboard />}

          {/* Local Tab */}
          {activeScope === 'local' && <LocalLeaderboard />}

          {/* Global Tab */}
          {activeScope === 'global' && (
          <>
            {/* Time Tab Switcher */}
            <div className="px-4 pb-4 app-tour-leaderboard-tabs">
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

            {/* Loading */}
            {loading && leaderboard.length > 0 && (
              <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            )}

            {/* Empty — Qualify Card */}
            {!loading && leaderboard.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <motion.div
                  className="w-full max-w-sm"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 20 }}
                >
                  <div className="tactical-card p-6 text-center border-primary/20">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Lock className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Leaderboard Locked</h3>
                    <p className="text-sm text-muted-foreground mb-5">
                      Hit <span className="text-primary font-bold">10,000 steps</span> {activeTab === 'today' ? 'today' : activeTab === 'week' ? 'this week' : 'this month'} to unlock rankings and compete
                    </p>
                    
                    {/* Progress bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">{currentUserSteps.toLocaleString()} steps</span>
                        <span className="text-primary font-bold">{QUALIFY_THRESHOLD.toLocaleString()}</span>
                      </div>
                      <div className="h-3 rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((currentUserSteps / QUALIFY_THRESHOLD) * 100, 100)}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {currentUserSteps >= QUALIFY_THRESHOLD 
                          ? '✅ You qualify! Pull to refresh.'
                          : `${(QUALIFY_THRESHOLD - currentUserSteps).toLocaleString()} steps to go`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 mt-6">
                    <TrendingUp className="h-4 w-4 text-primary/60" />
                    <p className="text-xs text-muted-foreground">
                      Keep walking — you'll appear once you qualify
                    </p>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Top 3 Podium */}
            {!loading && top3.length >= 3 && (
              <motion.div className="flex items-end justify-center gap-3 px-4 py-6 app-tour-leaderboard-podium"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                {/* 2nd */}
                <motion.div className="flex flex-col items-center cursor-pointer" onClick={() => handleTapUser(top3[1])}
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, type: "spring" }}>
                  <div className="relative">
                    <AvatarDisplay entry={top3[1]} size="lg" style={getRankStyle(top3[1].rank)} />
                    <Medal className="absolute -bottom-1 -right-1 h-5 w-5 text-gray-300 drop-shadow-lg" />
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-sm font-semibold text-foreground truncate max-w-[70px]">{top3[1].name}</span>
                    <StreakBadge streak={top3[1].streak} />
                  </div>
                  <span className="text-xs font-medium text-primary">{top3[1].steps.toLocaleString()}</span>
                  <motion.div className="mt-2 h-16 w-20 rounded-t-lg bg-gray-400/20 border-t border-x border-gray-400/30 shadow-depth"
                    initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.5, type: "spring" }} style={{ transformOrigin: "bottom" }} />
                </motion.div>

                {/* 1st */}
                <motion.div className="flex flex-col items-center cursor-pointer" onClick={() => handleTapUser(top3[0])}
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, type: "spring" }}>
                  <div className="relative">
                    <motion.div animate={{ y: [-2, 2, -2] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="z-10">
                      <Crown className="absolute -top-7 left-1/2 -translate-x-1/2 h-7 w-7 text-yellow-400 drop-shadow-lg" />
                    </motion.div>
                    <AvatarDisplay entry={top3[0]} size="xl" style={getRankStyle(top3[0].rank)} />
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-sm font-bold text-foreground truncate max-w-[80px]">{top3[0].name}</span>
                    <StreakBadge streak={top3[0].streak} />
                  </div>
                  <span className="text-xs font-bold text-yellow-400">{top3[0].steps.toLocaleString()}</span>
                  <motion.div className="mt-2 h-24 w-24 rounded-t-lg bg-yellow-500/20 border-t border-x border-yellow-500/30 shadow-glow-sm relative overflow-hidden"
                    initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.6, type: "spring" }} style={{ transformOrigin: "bottom" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent" />
                  </motion.div>
                </motion.div>

                {/* 3rd */}
                <motion.div className="flex flex-col items-center cursor-pointer" onClick={() => handleTapUser(top3[2])}
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, type: "spring" }}>
                  <div className="relative">
                    <AvatarDisplay entry={top3[2]} size="lg" style={getRankStyle(top3[2].rank)} />
                    <Medal className="absolute -bottom-1 -right-1 h-5 w-5 text-amber-500 drop-shadow-lg" />
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-sm font-semibold text-foreground truncate max-w-[70px]">{top3[2].name}</span>
                    <StreakBadge streak={top3[2].streak} />
                  </div>
                  <span className="text-xs font-medium text-primary">{top3[2].steps.toLocaleString()}</span>
                  <motion.div className="mt-2 h-12 w-20 rounded-t-lg bg-amber-600/20 border-t border-x border-amber-600/30 shadow-depth"
                    initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.45, type: "spring" }} style={{ transformOrigin: "bottom" }} />
                </motion.div>
              </motion.div>
            )}

            {/* 1-2 users */}
            {!loading && leaderboard.length > 0 && leaderboard.length < 3 && (
              <motion.div className="px-4 py-6 space-y-3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                {leaderboard.map((entry, index) => {
                  const style = getRankStyle(index + 1);
                  return (
                    <div key={entry.userId} onClick={() => handleTapUser(entry)}
                      className={`p-4 rounded-xl cursor-pointer ${style.bg} border ${style.border} ${entry.isCurrentUser ? 'ring-2 ring-primary' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <AvatarDisplay entry={entry} size="md" style={style} />
                          <div>
                            <div className="flex items-center gap-2">
                              {index === 0 && <Crown className="h-5 w-5 text-yellow-400" />}
                              <span className={`font-bold ${style.text}`}>#{entry.rank}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
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
                    <motion.div key={entry.userId} onClick={() => handleTapUser(entry)}
                      className={`flex items-center justify-between rounded-lg px-4 py-3 cursor-pointer ${entry.isCurrentUser
                        ? 'bg-primary/10 border border-primary/30'
                        : style.bg + ' border ' + style.border}`}
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + index * 0.05 }}>
                      <div className="flex items-center gap-4">
                        <span className={`w-8 text-lg font-bold ${entry.isCurrentUser ? 'text-primary' : style.text}`}>#{entry.rank}</span>
                        <AvatarDisplay entry={entry} size="sm" style={style} />
                        <div className="flex flex-col justify-center">
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-semibold leading-tight ${entry.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>{entry.name}</span>
                            <StreakBadge streak={entry.streak} />
                          </div>
                          {entry.username && <p className="text-[10px] text-muted-foreground leading-none">{entry.username}</p>}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary">{entry.steps.toLocaleString()}</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
          )}
        </PullToRefresh>
      </RubberBandScroll>

      {/* Pinned User Rank */}
      {activeScope === 'global' && currentUser && currentUser.rank > 3 && (
        <motion.div className="fixed left-4 right-4 z-fixed fixed-above-nav mb-2"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <div className="flex items-center justify-between rounded-lg bg-primary/20 border border-primary/40 px-4 py-3 glass-strong">
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-primary">#{currentUser.rank}</span>
              <AvatarDisplay entry={currentUser} size="sm" style={getRankStyle(currentUser.rank)} />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-primary leading-tight">{currentUser.name}</span>
                <p className="text-[10px] uppercase tracking-wider text-primary/70">Your Rank</p>
              </div>
            </div>
            <span className="text-lg font-bold text-primary">{currentUser.steps.toLocaleString()}</span>
          </div>
        </motion.div>
      )}

      {/* Pending Invitations Sheet */}
      <PendingInvitationsSheet
        isOpen={showInvitations}
        onClose={() => setShowInvitations(false)}
        onAccepted={() => {
          setPendingCount(prev => Math.max(0, prev - 1));
          // Refresh friends if on friends tab
          if (activeScope === 'friends') setActiveScope('friends');
        }}
      />

      {/* Invite User Modal (from leaderboard tap) */}
      <InviteToGroupModal
        isOpen={showInviteUser}
        onClose={() => { setShowInviteUser(false); setInviteTarget(null); }}
        targetUser={inviteTarget}
        targetGroup={null}
        userGroups={userGroups}
      />

      <BottomNav />
    </div>
  );
};

export default Leaderboard;
