import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AvatarSelector } from '@/components/profile/AvatarSelector';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AtSign, Edit2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { AIAvatarGenerator } from '@/components/profile/AIAvatarGenerator';

interface Props {
  userId: string;
  currentUsername?: string | null;
  currentAvatarId?: string | null;
  currentAvatarUrl?: string | null;
}

export const EditIdentityDialog = ({ userId, currentUsername, currentAvatarId, currentAvatarUrl }: Props) => {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(currentUsername || '');
  const [avatarId, setAvatarId] = useState(currentAvatarId || '');
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setUsername(currentUsername || '');
      setAvatarId(currentAvatarId || '');
      setAvatarUrl(currentAvatarUrl || '');
      setError('');
    }
  };

  const handleSave = async () => {
    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!avatarId) {
      setError('Please select an avatar');
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
      if (username.trim().toLowerCase() !== (currentUsername || '').toLowerCase()) {
        const { data: existing } = await supabase.from('profiles').select('id').eq('username', username.trim().toLowerCase()).single();
        if (existing && existing.id !== userId) {
          setError('This username is already taken');
          setIsSubmitting(false);
          return;
        }
      }

      const { error: updateError } = await supabase.from('profiles').update({
        username: username.trim().toLowerCase(),
        avatar_id: avatarId,
        avatar_url: avatarUrl
      }).eq('id', userId);

      if (updateError) throw updateError;
      
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success('Identity updated successfully!');
      setOpen(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 mt-4 rounded-full border-primary/50 text-primary hover:bg-primary/10">
          <Edit2 className="w-4 h-4" /> Edit Identity
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-background border-border max-w-[90vw] max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold uppercase tracking-wider">Edit Identity</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-username" className="text-sm font-medium">Username</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="edit-username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase());
                  setError('');
                }}
                className="pl-10"
                maxLength={30}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium">Avatar</Label>
            
            {/* Custom AI Avatar generator block */}
            <div className="bg-secondary/20 p-4 rounded-xl border border-border">
              <AIAvatarGenerator 
                onAvatarGenerated={async (url) => {
                  setAvatarUrl(url);
                  setAvatarId('custom_ai'); // Special marker for custom URLs
                  setError('');
                  
                  // Auto-save the AI avatar to the database instantly
                  if (userId) {
                    setIsSubmitting(true);
                    try {
                      await supabase.from('profiles').update({ avatar_url: url, avatar_id: 'custom_ai' }).eq('id', userId);
                      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
                      toast.success('AI Avatar instantly saved to your profile!');
                      setTimeout(() => setOpen(false), 800);
                    } catch(e) {
                      console.error(e);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }
                }} 
              />
              
              {avatarUrl && avatarId === 'custom_ai' && (
                <div className="mt-4 flex flex-col items-center">
                  <div className="text-xs text-muted-foreground mb-2">Current AI Generated Avatar:</div>
                  <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                    <img src={avatarUrl} alt="AI Avatar" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>

            <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-center my-2">-- OR Select Classic Avatar --</div>

            <div className="max-h-[40vh] overflow-y-auto pr-2 pb-2">
              <AvatarSelector selectedId={avatarId} onSelect={(id) => { 
                setAvatarId(id); 
                if (id !== 'custom_ai') setAvatarUrl(''); 
                setError(''); 
              }} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
