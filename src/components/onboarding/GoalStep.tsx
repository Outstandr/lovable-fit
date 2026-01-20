import { useState, useEffect, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';

interface GoalStepProps {
  onNext: () => void;
}

const PRESET_GOALS = [
  { label: '4,000 Steps', value: 4000 },
  { label: '6,000 Steps', value: 6000 },
  { label: '10,000 Steps', value: 10000 },
];

export const GoalStep = forwardRef<HTMLDivElement, GoalStepProps>(
  ({ onNext }, ref) => {
    const { user } = useAuth();
    const [selectedGoal, setSelectedGoal] = useState<number | null>(10000);
    const [customGoal, setCustomGoal] = useState<string>('');
    const [showCustom, setShowCustom] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Pre-fill from existing profile goal
    useEffect(() => {
      const loadExistingGoal = async () => {
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('daily_step_goal')
          .eq('id', user.id)
          .single();

        if (profile?.daily_step_goal) {
          const goal = profile.daily_step_goal;
          const isPreset = PRESET_GOALS.some(p => p.value === goal);

          if (isPreset) {
            setSelectedGoal(goal);
          } else {
            setShowCustom(true);
            setSelectedGoal(null);
            setCustomGoal(goal.toString());
          }
        }
      };

      loadExistingGoal();
    }, [user]);

    const handleSelectGoal = (value: number) => {
      setSelectedGoal(value);
      setShowCustom(false);
      setCustomGoal('');
    };

    const handleCustomGoal = () => {
      setShowCustom(true);
      setSelectedGoal(null);
    };

    const handleContinue = async () => {
      if (!user) return;

      const goal = showCustom ? parseInt(customGoal) : selectedGoal;
      if (!goal || goal < 1000 || goal > 50000) return;

      // Optimistic navigation: Move to next step immediately
      onNext();

      try {
        // Save in background
        await supabase
          .from('profiles')
          .update({ daily_step_goal: goal })
          .eq('id', user.id);
      } catch (error) {
        console.error('Error saving goal:', error);
        // Fail silent as we already moved on. 
        // Data can be retried or synced later.
      }
    };

    const isValid = showCustom
      ? customGoal && parseInt(customGoal) >= 1000 && parseInt(customGoal) <= 50000
      : selectedGoal !== null;

    return (
      <div ref={ref} className="absolute inset-0 flex flex-col bg-background safe-area-y">
        {/* Header */}
        <div className="pt-8 px-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-2"
          >
            <Target className="w-8 h-8 text-primary" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold text-foreground text-center"
          >
            Set Your Daily Steps Goal
          </motion.h1>
        </div>

        {/* Goal Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 px-6 space-y-4 min-h-0 overflow-y-auto"
        >
          {PRESET_GOALS.map((goal, index) => (
            <motion.button
              key={goal.value}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={() => handleSelectGoal(goal.value)}
              className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${selectedGoal === goal.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-secondary/50 hover:border-primary/50'
                }`}
            >
              <span className="text-lg font-semibold text-foreground">
                {goal.label}
              </span>
            </motion.button>
          ))}

          {/* Custom Goal */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            onClick={handleCustomGoal}
            className={`w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${showCustom
                ? 'border-primary bg-primary/10'
                : 'border-border bg-secondary/50 hover:border-primary/50'
              }`}
          >
            <span className="text-lg font-semibold text-foreground">
              Custom Goal
            </span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Custom Input */}
          {showCustom && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-2"
            >
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  placeholder="Enter steps"
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  className="flex-1 h-14 text-lg bg-secondary border-border text-foreground"
                  min={1000}
                  max={50000}
                />
                <span className="text-muted-foreground">steps</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Enter a goal between 1,000 and 50,000 steps
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="px-6 pb-6 safe-area-pb mt-4"
        >
          <Button
            onClick={handleContinue}
            disabled={!isValid || isSaving}
            className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold text-base disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Continue'}
          </Button>
        </motion.div>
      </div>
    );
  }
);

GoalStep.displayName = 'GoalStep';
