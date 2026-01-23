import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { WelcomeStep } from '@/components/onboarding/WelcomeStep';
import { ChallengeIntroStep } from '@/components/onboarding/ChallengeIntroStep';
import { SignUpStep } from '@/components/onboarding/SignUpStep';
import { PersonalInfoStep } from '@/components/onboarding/PersonalInfoStep';
import { NewsletterStep } from '@/components/onboarding/NewsletterStep';
import { ActivityPermissionStep } from '@/components/onboarding/ActivityPermissionStep';
import { HealthKitPermissionStep } from '@/components/onboarding/HealthKitPermissionStep';
import { LocationPermissionStep } from '@/components/onboarding/LocationPermissionStep';
import { BodyMeasurementsStep } from '@/components/onboarding/BodyMeasurementsStep';
import { BatteryOptimizationStep } from '@/components/onboarding/BatteryOptimizationStep';
import { NotificationStep } from '@/components/onboarding/NotificationStep';
import { GoalStep } from '@/components/onboarding/GoalStep';
import { SetupCompleteStep } from '@/components/onboarding/SetupCompleteStep';
import { LoadingScreen } from '@/components/LoadingScreen';
import { OnboardingProgress, STEP_ORDER } from '@/components/onboarding/OnboardingProgress';

export type OnboardingStep =
  | 'welcome'
  | 'challenge'
  | 'signup'
  | 'personalInfo'
  | 'newsletter'
  | 'activity'
  | 'healthkit'
  | 'location'
  | 'body'
  | 'battery'
  | 'notification'
  | 'goal'
  | 'complete';

const ONBOARDING_KEY = 'device_onboarding_completed';

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
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
    // Wait for auth to finish loading
    if (authLoading) return;

    // Check if device onboarding was already completed (localStorage)
    const deviceOnboardingCompleted = localStorage.getItem(ONBOARDING_KEY) === 'true';
    if (deviceOnboardingCompleted && user) {
      navigate('/');
      return;
    }

    // If user is already authenticated (e.g., returned from OAuth), skip to post-auth steps
    if (user) {
      setCurrentStep('personalInfo');
    }

    setIsLoading(false);
  }, [user, authLoading, navigate]);

  const handleNext = (nextStep: OnboardingStep) => {
    setCurrentStep(nextStep);
  };

  const handleBack = () => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      // Don't allow going back past personalInfo if user is authenticated
      // (can't go back to signup/challenge/welcome after signing in)
      const prevStep = STEP_ORDER[currentIndex - 1];
      if (user && ['signup', 'challenge', 'welcome'].includes(prevStep)) {
        return;
      }
      setCurrentStep(prevStep);
    }
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

  if (isLoading || authLoading) {
    return <LoadingScreen variant="protocol" message="Initializing..." />;
  }

  // Step configuration for cleaner rendering
  const stepConfig: Record<
    OnboardingStep,
    { component: React.ReactNode; nextStep?: OnboardingStep }
  > = {
    welcome: {
      component: <WelcomeStep onNext={() => handleNext('challenge')} />,
    },
    challenge: {
      component: <ChallengeIntroStep onNext={() => handleNext('signup')} />,
    },
    signup: {
      component: <SignUpStep onNext={() => handleNext('personalInfo')} />,
    },
    personalInfo: {
      component: <PersonalInfoStep onNext={() => handleNext('newsletter')} />,
    },
    newsletter: {
      component: <NewsletterStep onNext={() => handleNext('activity')} />,
    },
    activity: {
      component: <ActivityPermissionStep onNext={() => handleNext('healthkit')} />,
    },
    healthkit: {
      component: <HealthKitPermissionStep onNext={() => handleNext('location')} />,
    },
    location: {
      component: <LocationPermissionStep onNext={() => handleNext('body')} />,
    },
    body: {
      component: <BodyMeasurementsStep onNext={() => handleNext('battery')} />,
    },
    battery: {
      component: <BatteryOptimizationStep onNext={() => handleNext('notification')} />,
    },
    notification: {
      component: <NotificationStep onNext={() => handleNext('goal')} />,
    },
    goal: {
      component: <GoalStep onNext={() => handleNext('complete')} />,
    },
    complete: {
      component: <SetupCompleteStep onComplete={handleComplete} />,
    },
  };

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {/* Progress indicator with back button - fixed at top */}
      <div className="absolute top-0 left-0 right-0 z-10 safe-area-pt">
        <OnboardingProgress 
          currentStep={currentStep} 
          onBack={handleBack}
          canGoBack={true}
        />
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
        >
          {stepConfig[currentStep]?.component}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
