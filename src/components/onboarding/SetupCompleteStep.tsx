import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SetupCompleteStepProps {
  onComplete: () => void;
}

export const SetupCompleteStep = forwardRef<HTMLDivElement, SetupCompleteStepProps>(
  ({ onComplete }, ref) => {
    return (
      <div ref={ref} className="h-screen flex flex-col px-6 py-8 overflow-hidden">
        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-32 h-32 rounded-full bg-accent flex items-center justify-center mb-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
            >
              <CheckCircle className="w-16 h-16 text-accent-foreground" strokeWidth={3} />
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-2xl font-bold text-foreground text-center mb-4"
          >
            Setup Complete
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-muted-foreground text-center max-w-xs leading-relaxed"
          >
            Your step counter is now set up. Start walking and track your progress!
          </motion.p>
        </div>

        {/* Done Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="safe-area-pb"
        >
          <Button
            onClick={onComplete}
            className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold text-base"
          >
            Done
          </Button>
        </motion.div>
      </div>
    );
  }
);

SetupCompleteStep.displayName = 'SetupCompleteStep';
