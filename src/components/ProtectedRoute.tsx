import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ONBOARDING_KEY = 'device_onboarding_completed';

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  // Check localStorage for device onboarding completion
  const deviceOnboardingCompleted = localStorage.getItem(ONBOARDING_KEY) === 'true';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Loading Protocol...
          </span>
        </div>
      </div>
    );
  }

  // If no user or onboarding not completed, redirect to onboarding
  if (!user || !deviceOnboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
