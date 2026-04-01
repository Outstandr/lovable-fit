import { Share } from '@capacitor/share';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export const InviteFriendsCard = () => {
  const handleShare = async () => {
    try {
      const { value } = await Share.canShare();
      if (!value) {
        toast.error("Sharing is not supported on this device.");
        return;
      }
      await Share.share({
        title: 'Hotstepper Challenge',
        text: "I'm challenging myself to 10,000 steps a day on Hotstepper. Download the app and try to beat my score!",
        url: 'https://apps.apple.com/in/app/lionel-x/id6758130996',
        dialogTitle: 'Share with friends',
      });
    } catch (e) {
      console.log('Share failed:', e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 mt-6 rounded-2xl bg-card border border-border flex flex-col items-center text-center space-y-3 shadow-sm"
    >
      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-1">
        <Share2 className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">Challenge a Friend</h3>
        <p className="text-sm text-muted-foreground mt-1">Invite friends to join Hotstepper and view their step progress on the leaderboard.</p>
      </div>
      <Button onClick={handleShare} className="w-full h-12 mt-2 font-semibold text-base rounded-xl">
        Invite Now
      </Button>
    </motion.div>
  );
};
