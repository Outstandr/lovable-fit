import { motion } from 'framer-motion';
import { CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SetupCompleteStepProps {
  onComplete: () => void;
}

export function SetupCompleteStep({ onComplete }: SetupCompleteStepProps) {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Success animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative mb-8"
        >
          <div className="w-28 h-28 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
            >
              <CheckCircle className="w-14 h-14 text-accent" strokeWidth={2.5} />
            </motion.div>
          </div>
          
          {/* Sparkles */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute -top-2 -right-2"
          >
            <Sparkles className="w-6 h-6 text-primary" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute -bottom-1 -left-3"
          >
            <Sparkles className="w-5 h-5 text-accent" />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-3xl font-bold text-foreground text-center mb-3"
        >
          You're All Set!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground text-center max-w-xs text-base"
        >
          Start walking and track your progress towards a healthier you.
        </motion.p>

        {/* Fun stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex items-center gap-4"
        >
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">10K</p>
            <p className="text-xs text-muted-foreground">Daily Goal</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">0</p>
            <p className="text-xs text-muted-foreground">Steps Today</p>
          </div>
        </motion.div>
      </div>

      {/* Fixed bottom button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="px-6 pb-6 pt-4"
      >
        <Button
          onClick={onComplete}
          className="w-full h-14 rounded-xl bg-accent text-accent-foreground font-bold text-lg glow-green"
        >
          Let's Go! 🚀
        </Button>
      </motion.div>
    </div>
  );
}
