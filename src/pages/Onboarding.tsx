import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ActivityPermissionStep } from '@/components/onboarding/ActivityPermissionStep';
import { LocationPermissionStep } from '@/components/onboarding/LocationPermissionStep';
import { BodyMeasurementsStep } from '@/components/onboarding/BodyMeasurementsStep';
import { BatteryOptimizationStep } from '@/components/onboarding/BatteryOptimizationStep';
import { NotificationStep } from '@/components/onboarding/NotificationStep';
import { GoalStep } from '@/components/onboarding/GoalStep';
import { SetupCompleteStep } from '@/components/onboarding/SetupCompleteStep';
import { LoadingScreen } from '@/components/LoadingScreen';

export type OnboardingStep =
  | 'activity'
  | 'location'
  | 'body'
  | 'battery'
  | 'notification'
  | 'goal'
  | 'complete';

const ONBOARDING_KEY = 'device_onboarding_completed';

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('activity');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Lock body scroll while onboarding is mounted
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if device onboarding was already completed (localStorage)
    const deviceOnboardingCompleted = localStorage.getItem(ONBOARDING_KEY) === 'true';
    if (deviceOnboardingCompleted) {
      navigate('/');
      return;
    }

    setIsLoading(false);
  }, [user, navigate]);

  const handleNext = (nextStep: OnboardingStep) => {
    setCurrentStep(nextStep);
  };

  const handleComplete = async () => {
    if (!user) return;

    try {
      // Mark profile as completed in database
      await supabase
        .from('profiles')
        .update({ profile_completed: true })
        .eq('id', user.id);
    } catch (error) {
      console.error('[Onboarding] Error completing onboarding:', error);
      // Continue anyway - don't block user from using the app
    }

    // Set device onboarding completed in localStorage
    localStorage.setItem(ONBOARDING_KEY, 'true');
    navigate('/');
  };

  if (isLoading) {
    return <LoadingScreen variant="protocol" message="Initializing Onboarding..." />;
  }

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <AnimatePresence mode="wait">
        {currentStep === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <ActivityPermissionStep onNext={() => handleNext('location')} />
          </motion.div>
        )}

        {currentStep === 'location' && (
          <motion.div
            key="location"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <LocationPermissionStep onNext={() => handleNext('body')} />
          </motion.div>
        )}

        {currentStep === 'body' && (
          <motion.div
            key="body"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <BodyMeasurementsStep onNext={() => handleNext('battery')} />
          </motion.div>
        )}

        {currentStep === 'battery' && (
          <motion.div
            key="battery"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <BatteryOptimizationStep onNext={() => handleNext('notification')} />
          </motion.div>
        )}

        {currentStep === 'notification' && (
          <motion.div
            key="notification"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <NotificationStep onNext={() => handleNext('goal')} />
          </motion.div>
        )}

        {currentStep === 'goal' && (
          <motion.div
            key="goal"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <GoalStep onNext={() => handleNext('complete')} />
          </motion.div>
        )}

        {currentStep === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <SetupCompleteStep onComplete={handleComplete} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
