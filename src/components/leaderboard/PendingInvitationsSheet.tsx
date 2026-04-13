import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, XCircle, Loader2, Bell, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PendingInvitation {
  id: string;
  group_id: string;
  group_name: string;
  group_emoji: string;
  invited_by_name: string;
  invited_by_avatar: string | null;
  member_count: number;
  created_at: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAccepted: () => void;
}

export const PendingInvitationsSheet = ({ isOpen, onClose, onAccepted }: Props) => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_pending_invitations', { target_user_id: user.id });
      if (error) throw error;
      setInvitations((data || []) as PendingInvitation[]);
    } catch (err) {
      console.error('[Invitations] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) fetchInvitations();
  }, [isOpen, fetchInvitations]);

  const handleAccept = async (inv: PendingInvitation) => {
    if (!user) return;
    setResponding(inv.id);
    try {
      // Add user to group
      const { error: joinErr } = await supabase
        .from('friend_group_members')
        .insert({ group_id: inv.group_id, user_id: user.id, role: 'member' });

      if (joinErr && joinErr.code !== '23505') throw joinErr;

      // Update invitation status
      const { error: updateErr } = await supabase
        .from('group_invitations')
        .update({ status: 'accepted' })
        .eq('id', inv.id);

      if (updateErr) throw updateErr;

      toast.success(`Joined "${inv.group_name}"!`);
      setInvitations(prev => prev.filter(i => i.id !== inv.id));
      onAccepted();
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept');
    } finally {
      setResponding(null);
    }
  };

  const handleDecline = async (inv: PendingInvitation) => {
    setResponding(inv.id);
    try {
      const { error } = await supabase
        .from('group_invitations')
        .update({ status: 'rejected' })
        .eq('id', inv.id);

      if (error) throw error;
      setInvitations(prev => prev.filter(i => i.id !== inv.id));
      toast.info('Invitation declined');
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline');
    } finally {
      setResponding(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Sheet */}
        <motion.div
          className="relative w-full max-w-lg bg-card border-t border-border/60 rounded-t-3xl p-6 pb-10 max-h-[70vh] overflow-y-auto"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Handle */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Invitations</h2>
              {invitations.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
                  {invitations.length}
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary/50">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Users className="h-8 w-8 text-primary/40" />
              </div>
              <p className="text-muted-foreground text-sm">No pending invitations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((inv) => (
                <motion.div
                  key={inv.id}
                  className="p-4 rounded-2xl bg-gradient-to-r from-secondary/50 to-secondary/20 border border-border/50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  layout
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-base font-bold">{inv.group_emoji} {inv.group_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited by {inv.invited_by_name} • {inv.member_count} members • {formatTime(inv.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(inv)}
                      disabled={responding === inv.id}
                      className="flex-1 bg-gradient-to-r from-primary to-cyan-500 text-xs font-bold"
                    >
                      {responding === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(inv)}
                      disabled={responding === inv.id}
                      className="flex-1 text-xs font-bold border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Decline
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
