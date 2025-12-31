import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PushNotificationInitializer } from "@/components/PushNotificationInitializer";
import { PageTransition } from "@/components/PageTransition";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import ActiveSession from "./pages/ActiveSession";
import Leaderboard from "./pages/Leaderboard";
import Protocol from "./pages/Protocol";
import Profile from "./pages/Profile";
import Audiobook from "./pages/Audiobook";
import HealthProfileSetup from "./pages/HealthProfileSetup";
import NotificationSettings from "./pages/NotificationSettings";
import GoalsSettings from "./pages/GoalsSettings";
import PrivacySettings from "./pages/PrivacySettings";
import AppSettings from "./pages/AppSettings";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import MapTest from "./pages/MapTest";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/auth" element={
          <PageTransition>
            <Auth />
          </PageTransition>
        } />
        <Route path="/onboarding" element={
          <ProtectedRoute skipOnboardingCheck>
            <PageTransition>
              <Onboarding />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <PageTransition>
              <Index />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/active" element={
          <ProtectedRoute>
            <PageTransition>
              <ActiveSession />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/map-test" element={
          <PageTransition>
            <MapTest />
          </PageTransition>
        } />
        <Route path="/leaderboard" element={
          <ProtectedRoute>
            <PageTransition>
              <Leaderboard />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/protocol" element={
          <ProtectedRoute>
            <PageTransition>
              <Protocol />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <PageTransition>
              <Profile />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/audiobook" element={
          <ProtectedRoute>
            <PageTransition>
              <Audiobook />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/health-profile" element={
          <ProtectedRoute>
            <PageTransition>
              <HealthProfileSetup />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <PageTransition>
              <NotificationSettings />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/goals" element={
          <ProtectedRoute>
            <PageTransition>
              <GoalsSettings />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/privacy" element={
          <ProtectedRoute>
            <PageTransition>
              <PrivacySettings />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <PageTransition>
              <AppSettings />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/privacy-policy" element={
          <PageTransition>
            <PrivacyPolicy />
          </PageTransition>
        } />
        <Route path="*" element={
          <PageTransition>
            <NotFound />
          </PageTransition>
        } />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <BrowserRouter>
          <PushNotificationInitializer>
            <div className="mx-auto max-w-lg">
              <AnimatedRoutes />
            </div>
          </PushNotificationInitializer>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;