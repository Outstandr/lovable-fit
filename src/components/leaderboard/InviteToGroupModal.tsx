import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, UserPlus, Loader2, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AVATARS } from '@/components/profile/AvatarSelector';
import { toast } from 'sonner';

interface SearchResult {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  avatar_id: string | null;
  avatar_initials: string | null;
  already_member: boolean;
  already_invited: boolean;
}

interface FriendGroup {
  id: string;
  name: string;
  emoji: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** If set, invite to this specific group (search mode) */
  targetGroup?: FriendGroup | null;
  /** If set, invite this specific user (pick-group mode from leaderboard tap) */
  targetUser?: { userId: string; name: string; avatarUrl: string | null } | null;
  /** All groups the current user is in */
  userGroups: FriendGroup[];
}

export const InviteToGroupModal = ({ isOpen, onClose, targetGroup, targetUser, userGroups }: Props) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  // Search users (debounced)
  useEffect(() => {
    if (!targetGroup || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase.rpc('search_users_for_invite', {
          search_query: searchQuery,
          exclude_group_id: targetGroup.id,
        });
        if (error) throw error;
        setSearchResults((data || []) as SearchResult[]);
      } catch (err) {
        console.error('[InviteModal] Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, targetGroup]);

  const sendInvite = async (targetUserId: string, groupId: string, groupName: string) => {
    if (!user) return;
    setSending(targetUserId + groupId);
    try {
      const { error } = await supabase
        .from('group_invitations')
        .insert({
          group_id: groupId,
          invited_by: user.id,
          invited_user_id: targetUserId,
        });

      if (error) {
        if (error.code === '23505') {
          toast.info('Already invited to this group');
        } else {
          throw error;
        }
      } else {
        toast.success(`Invitation sent!`);
        setSentIds(prev => new Set(prev).add(targetUserId + groupId));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invite');
    } finally {
      setSending(null);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSentIds(new Set());
    onClose();
  };

  if (!isOpen) return null;

  const getAvatarUrl = (result: SearchResult) => {
    if (result.avatar_url) return result.avatar_url;
    const asset = AVATARS.find(a => a.id === result.avatar_id);
    return asset?.url || null;
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

        <motion.div
          className="relative w-full max-w-lg bg-card border border-border/60 rounded-2xl p-6 max-h-[80vh] flex flex-col shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">
                {targetUser ? `Invite ${targetUser.name}` : 'Invite to Group'}
              </h2>
            </div>
            <button onClick={handleClose} className="p-2 rounded-full hover:bg-secondary/50">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Mode 1: Pick a group (from leaderboard tap) */}
          {targetUser && !targetGroup && (
            <div className="flex-1 overflow-y-auto space-y-2">
              <p className="text-xs text-muted-foreground mb-3">Choose a group to invite them to:</p>
              {userGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  You don't have any groups yet. Create one first!
                </p>
              ) : (
                userGroups.map(group => {
                  const key = targetUser.userId + group.id;
                  const isSent = sentIds.has(key);
                  return (
                    <button
                      key={group.id}
                      onClick={() => !isSent && sendInvite(targetUser.userId, group.id, group.name)}
                      disabled={sending === key || isSent}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                        isSent
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-secondary/30 border-border/50 hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{group.emoji}</span>
                        <span className="text-sm font-semibold">{group.name}</span>
                      </div>
                      {sending === key ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : isSent ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Mode 2: Search users (from group detail) */}
          {targetGroup && (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by username or name..."
                  className="pl-9 bg-secondary/50 h-11"
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5">
                {searching ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : searchQuery.length < 2 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Type at least 2 characters to search
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No users found
                  </p>
                ) : (
                  searchResults.map(result => {
                    const avatarUrl = getAvatarUrl(result);
                    const key = result.user_id + targetGroup.id;
                    const isSent = sentIds.has(key) || result.already_invited;
                    const isMember = result.already_member;

                    return (
                      <div
                        key={result.user_id}
                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/30"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border/50 flex-shrink-0">
                            {avatarUrl ? (
                              <img src={avatarUrl} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold">{result.avatar_initials || '??'}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{result.display_name}</p>
                            {result.username && <p className="text-[10px] text-muted-foreground">@{result.username}</p>}
                          </div>
                        </div>

                        {isMember ? (
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-1 rounded-full bg-secondary/50">Member</span>
                        ) : (
                          <Button
                            size="sm"
                            variant={isSent ? 'ghost' : 'default'}
                            disabled={sending === key || isSent}
                            onClick={() => sendInvite(result.user_id, targetGroup.id, targetGroup.name)}
                            className={`text-xs h-8 ${!isSent ? 'bg-gradient-to-r from-primary to-cyan-500' : ''}`}
                          >
                            {sending === key ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : isSent ? (
                              <><Check className="h-3.5 w-3.5 mr-1" /> Sent</>
                            ) : (
                              <><UserPlus className="h-3.5 w-3.5 mr-1" /> Invite</>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
