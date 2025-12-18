import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PushNotificationInitializer } from "@/components/PushNotificationInitializer";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PushNotificationInitializer>
            <div className="mx-auto max-w-lg">
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } />
                <Route path="/active" element={
                  <ProtectedRoute>
                    <ActiveSession />
                  </ProtectedRoute>
                } />
                <Route path="/leaderboard" element={
                  <ProtectedRoute>
                    <Leaderboard />
                  </ProtectedRoute>
                } />
                <Route path="/protocol" element={
                  <ProtectedRoute>
                    <Protocol />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/audiobook" element={
                  <ProtectedRoute>
                    <Audiobook />
                  </ProtectedRoute>
                } />
                <Route path="/health-profile" element={
                  <ProtectedRoute>
                    <HealthProfileSetup />
                  </ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <NotificationSettings />
                  </ProtectedRoute>
                } />
                <Route path="/goals" element={
                  <ProtectedRoute>
                    <GoalsSettings />
                  </ProtectedRoute>
                } />
                <Route path="/privacy" element={
                  <ProtectedRoute>
                    <PrivacySettings />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <AppSettings />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </PushNotificationInitializer>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
