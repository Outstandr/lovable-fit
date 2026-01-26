import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Footprints } from 'lucide-react';
import { Button } from '@/components/ui/button';
import lxLogo from '@/assets/lx_logo.png';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep = forwardRef<HTMLDivElement, WelcomeStepProps>(
  ({ onNext }, ref) => {
    return (
      <div
        ref={ref}
        className="flex flex-col h-full bg-background text-foreground overflow-hidden"
      >
        {/* Scrollable Hero Section */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-6 py-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl font-bold text-center mb-3 tracking-tight"
          >
            HOTSTEPPER
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="flex items-center gap-2 mb-2"
          >
            <span className="text-sm text-muted-foreground">by</span>
            <img
              src={lxLogo}
              alt="Lionel X"
              className="w-16 h-16 object-contain"
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-xl text-muted-foreground text-center mb-2"
          >
            Track your steps. Build discipline.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-sm text-muted-foreground/70 text-center max-w-xs"
          >
            Join thousands taking the 10,000 steps challenge
          </motion.p>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-8 space-y-3 w-full max-w-xs"
          >
            {[
              'Automatic step tracking',
              'Daily progress insights',
              'Community leaderboard',
            ].map((feature, index) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Footprints className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-foreground/80">{feature}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Fixed CTA Section - always visible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="flex-shrink-0 px-6 pt-4 pb-8 safe-area-pb"
        >
          <Button
            onClick={onNext}
            size="lg"
            className="w-full h-14 text-lg font-semibold"
          >
            Get Started
          </Button>
        </motion.div>
      </div>
    );
  }
);

WelcomeStep.displayName = 'WelcomeStep';
