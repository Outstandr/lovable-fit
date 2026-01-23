import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Users, Heart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChallengeIntroStepProps {
  onNext: () => void;
}

export const ChallengeIntroStep = forwardRef<HTMLDivElement, ChallengeIntroStepProps>(
  ({ onNext }, ref) => {
    const benefits = [
      {
        icon: Heart,
        title: 'Improve Health',
        description: 'Reduce risk of heart disease, diabetes, and obesity',
      },
      {
        icon: TrendingUp,
        title: 'Build Discipline',
        description: 'Develop consistent daily habits that stick',
      },
      {
        icon: Users,
        title: 'Join Community',
        description: 'Compete and connect with like-minded steppers',
      },
    ];

    return (
      <div
        ref={ref}
        className="flex flex-col h-full bg-background text-foreground overflow-hidden"
      >
        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Header */}
          <div className="px-6 pt-8 pb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
            >
              <Target className="w-10 h-10 text-primary" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-3xl font-bold text-center mb-3"
            >
              The 10,000 Steps Challenge
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-muted-foreground text-center"
            >
              Transform your health one step at a time
            </motion.p>
          </div>

          {/* Challenge Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mx-6 p-6 rounded-2xl bg-primary/5 border border-primary/10 mb-8"
          >
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">10,000</div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider">
                Steps per day
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-primary/10">
              <div className="text-center">
                <div className="text-xl font-semibold text-foreground">~5</div>
                <div className="text-xs text-muted-foreground">Miles</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-foreground">~400</div>
                <div className="text-xs text-muted-foreground">Calories</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-foreground">~90</div>
                <div className="text-xs text-muted-foreground">Minutes</div>
              </div>
            </div>
          </motion.div>

          {/* Benefits */}
          <div className="px-6 pb-6">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4"
            >
              Why 10,000 Steps?
            </motion.h2>

            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
                  className="flex gap-4 p-4 rounded-xl bg-card border border-border"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Fixed CTA - Always Visible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="flex-shrink-0 px-6 pt-4 safe-area-pb-cta"
        >
          <Button
            onClick={onNext}
            size="lg"
            className="w-full h-14 text-lg font-semibold"
          >
            Join the Challenge
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    );
  }
);

ChallengeIntroStep.displayName = 'ChallengeIntroStep';
