import { ReactNode, useEffect, useState, forwardRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: ReactNode;
  skipOnboardingCheck?: boolean;
}

export const ProtectedRoute = forwardRef<HTMLDivElement, ProtectedRouteProps>(
  ({ children, skipOnboardingCheck = false }, ref) => {
    const { user, loading } = useAuth();
    const [checkingOnboarding, setCheckingOnboarding] = useState(!skipOnboardingCheck);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);

    useEffect(() => {
      const checkOnboarding = async () => {
        if (!user || skipOnboardingCheck) {
          setCheckingOnboarding(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('profile_completed')
          .eq('id', user.id)
          .single();

        if (!profile?.profile_completed) {
          setNeedsOnboarding(true);
        }
        setCheckingOnboarding(false);
      };

      if (user && !skipOnboardingCheck) {
        checkOnboarding();
      } else {
        setCheckingOnboarding(false);
      }
    }, [user, skipOnboardingCheck]);

    if (loading || checkingOnboarding) {
      return (
        <div ref={ref} className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Loading Protocol...
            </span>
          </div>
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/auth" replace />;
    }

    if (needsOnboarding && !skipOnboardingCheck) {
      return <Navigate to="/onboarding" replace />;
    }

    return <div ref={ref}>{children}</div>;
  }
);

ProtectedRoute.displayName = "ProtectedRoute";
