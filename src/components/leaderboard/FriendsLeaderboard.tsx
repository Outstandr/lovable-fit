import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, LogIn, Share2, LogOut, Crown, Medal, Flame, Copy, Check, ArrowLeft, Loader2, Footprints, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AVATARS } from '@/components/profile/AvatarSelector';
import { generateJoinCode } from '@/utils/countryDetection';
import { Share } from '@capacitor/share';
import { toast } from 'sonner';

interface FriendGroup {
  id: string;
  name: string;
  emoji: string;
  join_code: string;
  created_by: string;
  member_count: number;
}

interface GroupMember {
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

const AvatarDisplay = ({ entry, size = "md", style }: { entry: GroupMember, size?: "sm" | "md" | "lg" | "xl", style?: any }) => {
  const sizeClasses = {
    sm: "h-10 w-10 text-sm",
    md: "h-14 w-14 text-xl",
    lg: "h-16 w-16 text-lg",
    xl: "h-20 w-20 text-xl"
  };
  const borderClass = style?.border || "border-border";
  return (
    <div className={`relative ${sizeClasses[size]} rounded-full bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center border-2 ${borderClass} overflow-hidden ${entry.isCurrentUser ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
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
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500/25 to-red-500/25 text-orange-400 text-[10px] font-bold border border-orange-500/20">
      <Flame className="h-3 w-3" />
      {streak}
    </span>
  );
};

const getRankStyle = (rank: number) => {
  if (rank === 1) return { bg: "bg-gradient-to-r from-yellow-500/15 to-amber-500/10", border: "border-yellow-500/40", text: "text-yellow-400", glow: "shadow-[0_0_15px_rgba(234,179,8,0.15)]" };
  if (rank === 2) return { bg: "bg-gradient-to-r from-gray-400/15 to-slate-400/10", border: "border-gray-400/40", text: "text-gray-300", glow: "" };
  if (rank === 3) return { bg: "bg-gradient-to-r from-amber-600/15 to-orange-600/10", border: "border-amber-600/40", text: "text-amber-500", glow: "" };
  return { bg: "bg-secondary/40", border: "border-border/50", text: "text-muted-foreground", glow: "" };
};

const EMOJI_OPTIONS = ['🏆', '🏃', '💪', '🔥', '⚡', '🎯', '👟', '🏅', '💎', '🌟', '👊', '🦾'];

export const FriendsLeaderboard = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<FriendGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showCreatedCode, setShowCreatedCode] = useState<string | null>(null);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('🏆');
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinPreview, setJoinPreview] = useState<{ group_id: string; group_name: string; group_emoji: string; member_count: number } | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: memberships, error: memErr } = await supabase
        .from('friend_group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memErr) throw memErr;
      if (!memberships || memberships.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const groupIds = memberships.map(m => m.group_id);
      const { data: groupsData, error: grpErr } = await supabase
        .from('friend_groups')
        .select('*')
        .in('id', groupIds);

      if (grpErr) throw grpErr;

      const groupsWithCounts: FriendGroup[] = await Promise.all(
        (groupsData || []).map(async (g: any) => {
          const { count } = await supabase
            .from('friend_group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', g.id);
          return { id: g.id, name: g.name, emoji: g.emoji || '🏆', join_code: g.join_code, created_by: g.created_by, member_count: count || 0 };
        })
      );
      setGroups(groupsWithCounts);
    } catch (err) {
      console.error('[FriendsLeaderboard] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const fetchGroupLeaderboard = useCallback(async (group: FriendGroup) => {
    try {
      setGroupLoading(true);
      setActiveGroup(group);
      const { data, error } = await supabase.rpc('get_group_leaderboard', { target_group_id: group.id });
      if (error) throw error;

      const entries: GroupMember[] = (data || []).map((row: any) => {
        const avatarAsset = AVATARS.find(a => a.id === row.avatar_id);
        return {
          rank: Number(row.rank),
          name: row.display_name || 'Unknown',
          username: row.username ? `@${row.username}` : null,
          steps: row.steps || 0,
          avatarInitials: row.avatar_initials || 'NA',
          avatarUrl: row.avatar_url || (avatarAsset ? avatarAsset.url : null),
          userId: row.user_id,
          isCurrentUser: row.user_id === user?.id,
          streak: row.current_streak || 0,
        };
      });
      setGroupMembers(entries);
    } catch (err) {
      console.error('[FriendsLeaderboard] Group leaderboard error:', err);
      toast.error('Failed to load group leaderboard');
    } finally {
      setGroupLoading(false);
    }
  }, [user]);

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    setCreating(true);
    try {
      const code = generateJoinCode();
      const { data: newGroup, error: createErr } = await supabase
        .from('friend_groups')
        .insert({ name: newGroupName.trim(), emoji: newGroupEmoji, join_code: code, created_by: user.id })
        .select()
        .single();

      if (createErr) throw createErr;

      const { error: joinErr } = await supabase
        .from('friend_group_members')
        .insert({ group_id: newGroup.id, user_id: user.id, role: 'admin' });

      if (joinErr) throw joinErr;

      setShowCreateDialog(false);
      setNewGroupName('');
      setNewGroupEmoji('🏆');
      setShowCreatedCode(code);
      fetchGroups();
    } catch (err: any) {
      console.error('[FriendsLeaderboard] Create error:', err);
      toast.error(err.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleLookupCode = async () => {
    if (joinCode.length < 6) return;
    try {
      const { data, error } = await supabase.rpc('lookup_group_by_code', { code: joinCode.toUpperCase() });
      if (error) throw error;
      if (data && data.length > 0) {
        setJoinPreview(data[0]);
      } else {
        toast.error('No group found with that code');
        setJoinPreview(null);
      }
    } catch {
      toast.error('Invalid code');
    }
  };

  const handleJoinGroup = async () => {
    if (!user || !joinPreview) return;
    setJoining(true);
    try {
      const { error } = await supabase
        .from('friend_group_members')
        .insert({ group_id: joinPreview.group_id, user_id: user.id, role: 'member' });

      if (error) {
        if (error.code === '23505') toast.info('You are already in this group!');
        else throw error;
      } else {
        toast.success(`Joined "${joinPreview.group_name}"!`);
      }

      setShowJoinDialog(false);
      setJoinCode('');
      setJoinPreview(null);
      fetchGroups();
    } catch (err: any) {
      toast.error(err.message || 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveGroup = async (group: FriendGroup) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('friend_group_members')
        .delete()
        .eq('group_id', group.id)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success(`Left "${group.name}"`);
      setActiveGroup(null);
      setGroupMembers([]);
      fetchGroups();
    } catch (err: any) {
      toast.error(err.message || 'Failed to leave group');
    }
  };

  const handleShareCode = async (code: string, groupName: string) => {
    try {
      await Share.share({
        title: `Join "${groupName}" on Lionel X!`,
        text: `Join my step challenge group "${groupName}"! Enter this code: ${code}`,
        dialogTitle: 'Share Group Invite',
      });
    } catch {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success('Code copied!');
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ==========================================
  // CREATED CODE SUCCESS SCREEN
  // ==========================================
  if (showCreatedCode) {
    return (
      <div className="px-4 pb-4">
        <motion.div
          className="flex flex-col items-center py-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-cyan-500/20 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,200,255,0.15)]">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-1">Group Created! 🎉</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Share this code with friends so they can join your group
          </p>

          {/* Big code display */}
          <div className="w-full max-w-xs p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/80 to-secondary/40 border border-primary/20 shadow-[0_0_25px_rgba(0,200,255,0.1)] mb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Invite Code</p>
            <p className="text-3xl font-mono font-black tracking-[0.4em] text-primary">{showCreatedCode}</p>
          </div>

          <div className="flex gap-2 w-full max-w-xs">
            <Button onClick={() => handleShareCode(showCreatedCode, '')} className="flex-1 bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90">
              <Share2 className="h-4 w-4 mr-1.5" /> Share
            </Button>
            <Button variant="outline" onClick={() => copyCode(showCreatedCode)} className="flex-1">
              {copiedCode ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
              {copiedCode ? 'Copied!' : 'Copy'}
            </Button>
          </div>

          <Button variant="ghost" size="sm" className="mt-4 text-muted-foreground" onClick={() => setShowCreatedCode(null)}>
            Done
          </Button>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // GROUP DETAIL VIEW
  // ==========================================
  if (activeGroup) {
    const top3 = groupMembers.slice(0, 3);
    const rest = groupMembers.slice(3);

    return (
      <div className="px-4 pb-4">
        {/* Back + Header */}
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => { setActiveGroup(null); setGroupMembers([]); }} className="p-2 -ml-2 rounded-xl hover:bg-secondary/60 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{activeGroup.emoji} {activeGroup.name}</h2>
            <p className="text-xs text-muted-foreground">{groupMembers.length} members</p>
          </div>
        </div>

        {/* Invite Code Banner */}
        <motion.div
          className="mb-4 p-3 rounded-xl bg-gradient-to-r from-primary/10 via-cyan-500/5 to-primary/10 border border-primary/15 backdrop-blur-sm"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Invite Code</p>
              <p className="text-lg font-mono font-bold text-primary tracking-[0.25em]">{activeGroup.join_code}</p>
            </div>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleShareCode(activeGroup.join_code, activeGroup.name)}>
                <Share2 className="h-4 w-4 text-primary" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => copyCode(activeGroup.join_code)}>
                {copiedCode ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => handleLeaveGroup(activeGroup)}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {groupLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : groupMembers.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Footprints className="h-12 w-12 text-primary/40 mb-3" />
            <p className="text-muted-foreground">No steps logged today yet!</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length >= 3 && (
              <motion.div className="flex items-end justify-center gap-2 pt-4 pb-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* 2nd */}
                <div className="flex flex-col items-center flex-1">
                  <div className="relative">
                    <AvatarDisplay entry={top3[1]} size="lg" style={getRankStyle(2)} />
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-[10px] font-black text-gray-900">2</div>
                  </div>
                  <div className="flex flex-col items-center mt-2">
                    <span className="text-xs font-semibold truncate max-w-[70px]">{top3[1].name}</span>
                    <span className="text-xs font-bold text-gray-300">{top3[1].steps.toLocaleString()}</span>
                    <StreakBadge streak={top3[1].streak} />
                  </div>
                  <div className="mt-2 h-16 w-full rounded-t-xl bg-gradient-to-t from-gray-500/10 to-gray-400/20 border-t border-x border-gray-400/20" />
                </div>
                {/* 1st */}
                <div className="flex flex-col items-center flex-1">
                  <div className="relative">
                    <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 h-6 w-6 text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]" />
                    <AvatarDisplay entry={top3[0]} size="xl" style={getRankStyle(1)} />
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center text-[10px] font-black text-yellow-900">1</div>
                  </div>
                  <div className="flex flex-col items-center mt-2">
                    <span className="text-sm font-bold truncate max-w-[80px]">{top3[0].name}</span>
                    <span className="text-sm font-black text-yellow-400">{top3[0].steps.toLocaleString()}</span>
                    <StreakBadge streak={top3[0].streak} />
                  </div>
                  <div className="mt-2 h-24 w-full rounded-t-xl bg-gradient-to-t from-yellow-500/5 to-yellow-500/20 border-t border-x border-yellow-500/20 shadow-[0_-5px_15px_rgba(234,179,8,0.05)]" />
                </div>
                {/* 3rd */}
                <div className="flex flex-col items-center flex-1">
                  <div className="relative">
                    <AvatarDisplay entry={top3[2]} size="lg" style={getRankStyle(3)} />
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center text-[10px] font-black text-amber-900">3</div>
                  </div>
                  <div className="flex flex-col items-center mt-2">
                    <span className="text-xs font-semibold truncate max-w-[70px]">{top3[2].name}</span>
                    <span className="text-xs font-bold text-amber-500">{top3[2].steps.toLocaleString()}</span>
                    <StreakBadge streak={top3[2].streak} />
                  </div>
                  <div className="mt-2 h-12 w-full rounded-t-xl bg-gradient-to-t from-amber-600/5 to-amber-600/15 border-t border-x border-amber-600/20" />
                </div>
              </motion.div>
            )}

            {/* Rank List */}
            <div className="space-y-2 mt-3">
              {rest.map((entry, i) => {
                const style = getRankStyle(entry.rank);
                return (
                  <motion.div
                    key={entry.userId}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 backdrop-blur-sm ${entry.isCurrentUser ? 'bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/25 shadow-[0_0_15px_rgba(0,200,255,0.08)]' : style.bg + ' border ' + style.border} ${style.glow}`}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 text-base font-black ${entry.isCurrentUser ? 'text-primary' : style.text}`}>#{entry.rank}</span>
                      <AvatarDisplay entry={entry} size="sm" style={style} />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-semibold ${entry.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>{entry.name}</span>
                          <StreakBadge streak={entry.streak} />
                        </div>
                        {entry.username && <p className="text-[10px] text-muted-foreground">{entry.username}</p>}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary">{entry.steps.toLocaleString()}</span>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  // ==========================================
  // GROUPS LIST VIEW
  // ==========================================
  return (
    <div className="px-4 pb-4">
      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <Button onClick={() => setShowCreateDialog(true)} size="sm" className="flex-1 text-xs font-bold bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 shadow-[0_0_15px_rgba(0,200,255,0.15)]">
          <Plus className="h-4 w-4 mr-1" /> Create Group
        </Button>
        <Button onClick={() => setShowJoinDialog(true)} variant="outline" size="sm" className="flex-1 text-xs font-bold border-primary/20 hover:bg-primary/5">
          <LogIn className="h-4 w-4 mr-1" /> Join with Code
        </Button>
      </div>

      {/* How it works hint */}
      {groups.length === 0 && !showCreateDialog && !showJoinDialog && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mb-4 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/40 border border-primary/10 text-xs text-muted-foreground"
        >
          <p className="font-semibold text-foreground mb-1">💡 How it works:</p>
          <p><strong>Create</strong> a group → get a <strong>6-character code</strong> → <strong>share</strong> it with friends → they <strong>join</strong> using the code → compete on steps!</p>
        </motion.div>
      )}

      {/* Create Group Dialog */}
      <AnimatePresence>
        {showCreateDialog && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-secondary/70 to-secondary/30 border border-border/60 backdrop-blur-sm overflow-hidden shadow-lg"
          >
            <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Create a New Group
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Group Name</Label>
                <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. Morning Walkers" maxLength={30} className="mt-1 bg-background/50" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Choose Icon</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {EMOJI_OPTIONS.map(e => (
                    <button
                      key={e}
                      onClick={() => setNewGroupEmoji(e)}
                      className={`text-xl p-2 rounded-xl transition-all ${newGroupEmoji === e ? 'bg-primary/20 ring-2 ring-primary scale-110 shadow-[0_0_10px_rgba(0,200,255,0.15)]' : 'hover:bg-secondary/80'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleCreateGroup} disabled={creating || !newGroupName.trim()} size="sm" className="flex-1 bg-gradient-to-r from-primary to-cyan-500">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  Create
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Group Dialog */}
      <AnimatePresence>
        {showJoinDialog && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-secondary/70 to-secondary/30 border border-border/60 backdrop-blur-sm overflow-hidden shadow-lg"
          >
            <h3 className="text-sm font-bold mb-1">Join with Invite Code</h3>
            <p className="text-[11px] text-muted-foreground mb-3">Ask a friend for their 6-character group code</p>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={joinCode}
                  onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinPreview(null); }}
                  placeholder="ABC123"
                  maxLength={6}
                  className="font-mono text-center text-lg tracking-[0.35em] uppercase bg-background/50 h-12"
                />
                <Button onClick={handleLookupCode} disabled={joinCode.length < 6} size="sm" variant="outline" className="h-12 px-4">
                  Find
                </Button>
              </div>
              {joinPreview && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
                >
                  <p className="text-sm font-bold">{joinPreview.group_emoji} {joinPreview.group_name}</p>
                  <p className="text-xs text-muted-foreground mb-2">{joinPreview.member_count} members</p>
                  <Button onClick={handleJoinGroup} disabled={joining} size="sm" className="w-full bg-gradient-to-r from-primary to-cyan-500">
                    {joining ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Users className="h-4 w-4 mr-1" />}
                    Join Group
                  </Button>
                </motion.div>
              )}
              <Button variant="ghost" size="sm" className="w-full" onClick={() => { setShowJoinDialog(false); setJoinCode(''); setJoinPreview(null); }}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Groups List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : groups.length === 0 && !showCreateDialog && !showJoinDialog ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-8 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/15 to-cyan-500/10 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,200,255,0.1)]">
            <Users className="h-10 w-10 text-primary/50" />
          </div>
          <p className="text-lg font-bold">No Groups Yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
            Create a group and share the invite code with friends to start competing!
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {groups.map((group, i) => (
            <motion.button
              key={group.id}
              onClick={() => fetchGroupLeaderboard(group)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-secondary/40 to-secondary/20 border border-border/50 hover:border-primary/20 hover:shadow-[0_0_15px_rgba(0,200,255,0.05)] transition-all text-left backdrop-blur-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-2xl w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">{group.emoji}</div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{group.name}</p>
                  <p className="text-[11px] text-muted-foreground">{group.member_count} {group.member_count === 1 ? 'member' : 'members'}</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Code</span>
                <span className="text-xs font-mono font-bold text-primary/70">{group.join_code}</span>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};
