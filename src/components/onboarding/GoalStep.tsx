import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Target, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';

interface GoalStepProps {
  onNext: () => void;
}

const PRESET_GOALS = [
  { label: '4,000', value: 4000, desc: 'Light activity' },
  { label: '6,000', value: 6000, desc: 'Moderate' },
  { label: '10,000', value: 10000, desc: 'Recommended', popular: true },
];

export function GoalStep({ onNext }: GoalStepProps) {
  const { user } = useAuth();
  const [selectedGoal, setSelectedGoal] = useState<number | null>(10000);
  const [customGoal, setCustomGoal] = useState<string>('');
  const [showCustom, setShowCustom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

    setIsSaving(true);

    await supabase
      .from('profiles')
      .update({ daily_step_goal: goal })
      .eq('id', user.id);

    setIsSaving(false);
    onNext();
  };

  const isValid = showCustom 
    ? customGoal && parseInt(customGoal) >= 1000 && parseInt(customGoal) <= 50000
    : selectedGoal !== null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress indicator */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-primary" />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">Step 5 of 5</p>
      </div>

      {/* Main content - scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="flex flex-col items-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-4"
          >
            <Target className="w-8 h-8 text-primary" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold text-foreground text-center"
          >
            Set Your Daily Goal
          </motion.h1>
        </div>

        {/* Goal Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {PRESET_GOALS.map((goal, index) => (
            <motion.button
              key={goal.value}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={() => handleSelectGoal(goal.value)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                selectedGoal === goal.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-secondary/50 hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedGoal === goal.value ? 'bg-primary' : 'bg-background'
                }`}>
                  {selectedGoal === goal.value ? (
                    <Check className="w-5 h-5 text-primary-foreground" />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">
                      {(goal.value / 1000).toFixed(0)}K
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-lg font-bold text-foreground block">
                    {goal.label} steps
                  </span>
                  <span className="text-xs text-muted-foreground">{goal.desc}</span>
                </div>
              </div>
              {goal.popular && (
                <span className="px-2 py-1 rounded-full bg-accent/20 text-xs font-medium text-accent">
                  Popular
                </span>
              )}
            </motion.button>
          ))}

          {/* Custom Goal */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            onClick={handleCustomGoal}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
              showCustom
                ? 'border-primary bg-primary/10'
                : 'border-border bg-secondary/50 hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                showCustom ? 'bg-primary' : 'bg-background'
              }`}>
                {showCustom ? (
                  <Check className="w-5 h-5 text-primary-foreground" />
                ) : (
                  <span className="text-lg font-bold text-muted-foreground">?</span>
                )}
              </div>
              <span className="text-lg font-bold text-foreground">
                Custom Goal
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Custom Input */}
          {showCustom && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 rounded-xl bg-secondary/50 border border-border/50"
            >
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  placeholder="Enter steps"
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  className="flex-1 h-12 text-lg bg-background border-border text-foreground"
                  min={1000}
                  max={50000}
                />
                <span className="text-muted-foreground text-sm">steps</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Between 1,000 and 50,000 steps
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Fixed bottom button */}
      <div className="px-6 pb-6 pt-4 border-t border-border/30 bg-background">
        <Button
          onClick={handleContinue}
          disabled={!isValid || isSaving}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base disabled:opacity-50"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Complete Setup
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
