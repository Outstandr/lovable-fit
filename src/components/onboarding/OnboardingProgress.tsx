import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { OnboardingStep } from '@/pages/Onboarding';

interface OnboardingProgressProps {
  currentStep: OnboardingStep;
  className?: string;
}

// Define step order and groupings
const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'challenge',
  'signup',
  'personalInfo',
  'newsletter',
  'activity',
  'healthkit',
  'location',
  'body',
  'battery',
  'notification',
  'goal',
  'complete',
];

// Steps where progress indicator should be hidden
const HIDDEN_STEPS: OnboardingStep[] = ['welcome', 'complete'];

export const OnboardingProgress = ({ currentStep, className }: OnboardingProgressProps) => {
  // Don't show progress on welcome or complete screens
  if (HIDDEN_STEPS.includes(currentStep)) {
    return null;
  }

  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const totalSteps = STEP_ORDER.length - 2; // Exclude welcome and complete
  const adjustedIndex = currentIndex - 1; // Adjust for hidden welcome step
  const progress = ((adjustedIndex + 1) / totalSteps) * 100;

  return (
    <div className={cn('w-full px-6 pt-4', className)}>
      {/* Progress bar container */}
      <div className="relative h-1 bg-muted/30 rounded-full overflow-hidden">
        {/* Animated progress fill */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      
      {/* Step counter */}
      <div className="mt-2 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          Step {adjustedIndex + 1} of {totalSteps}
        </span>
        <span className="text-xs text-muted-foreground">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};
