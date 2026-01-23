import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OnboardingStep } from '@/pages/Onboarding';

interface OnboardingProgressProps {
  currentStep: OnboardingStep;
  onBack?: () => void;
  canGoBack?: boolean;
  className?: string;
}

// Define step order and groupings
export const STEP_ORDER: OnboardingStep[] = [
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

// Steps where back button should be disabled (can't go back from these)
const NO_BACK_STEPS: OnboardingStep[] = ['welcome', 'personalInfo', 'complete'];

export const OnboardingProgress = ({ 
  currentStep, 
  onBack,
  canGoBack = true,
  className 
}: OnboardingProgressProps) => {
  // Don't show progress on welcome or complete screens
  if (HIDDEN_STEPS.includes(currentStep)) {
    return null;
  }

  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const totalSteps = STEP_ORDER.length - 2; // Exclude welcome and complete
  const adjustedIndex = currentIndex - 1; // Adjust for hidden welcome step
  const progress = ((adjustedIndex + 1) / totalSteps) * 100;
  
  // Determine if back button should be shown
  const showBackButton = canGoBack && !NO_BACK_STEPS.includes(currentStep) && onBack;

  return (
    <div className={cn('w-full px-6 pt-4', className)}>
      {/* Header with back button and step counter */}
      <div className="flex items-center justify-between mb-3">
        {/* Back button */}
        <div className="w-10">
          {showBackButton && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors touch-target"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
          )}
        </div>
        
        {/* Step counter */}
        <span className="text-xs text-muted-foreground">
          Step {adjustedIndex + 1} of {totalSteps}
        </span>
        
        {/* Spacer for alignment */}
        <div className="w-10" />
      </div>
      
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
    </div>
  );
};
