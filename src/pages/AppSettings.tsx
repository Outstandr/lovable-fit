import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Ruler, Info, RefreshCw, RotateCcw, LogOut, ChevronRight, Heart, CheckCircle2, XCircle, Bug } from "lucide-react";
import { StandardHeader } from "@/components/StandardHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import { healthService } from "@/services/healthService";


const ONBOARDING_KEY = 'device_onboarding_completed';

const AppSettings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  
  const [healthConnectStatus, setHealthConnectStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [isConnecting, setIsConnecting] = useState(false);

  // Check Health Connect status on mount
  useEffect(() => {
    const checkHealthConnect = async () => {
      if (!isNative || platform !== 'android') {
        setHealthConnectStatus('disconnected');
        return;
      }
      
      try {
        const hasPermission = await healthService.checkPermission();
        setHealthConnectStatus(hasPermission ? 'connected' : 'disconnected');
      } catch (error) {
        console.error('[AppSettings] Health Connect check error:', error);
        setHealthConnectStatus('disconnected');
      }
    };
    
    checkHealthConnect();
  }, [isNative, platform]);

  const handleConnectHealthConnect = async () => {
    setIsConnecting(true);
    try {
      const granted = await healthService.requestPermission();
      setHealthConnectStatus(granted ? 'connected' : 'disconnected');
    } catch (error) {
      console.error('[AppSettings] Health Connect connect error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      navigate("/auth");
    }
  };

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("unit_preference")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updateUnitMutation = useMutation({
    mutationFn: async (unit: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ unit_preference: unit })
        .eq("id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const handleClearCache = () => {
    // Keep onboarding flag when clearing cache
    const onboardingFlag = localStorage.getItem(ONBOARDING_KEY);
    localStorage.clear();
    if (onboardingFlag) {
      localStorage.setItem(ONBOARDING_KEY, onboardingFlag);
    }
    queryClient.clear();
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    navigate('/onboarding');
  };

  const currentUnit = profile?.unit_preference || "metric";

  return (
    <div className="min-h-screen-safe bg-background safe-area-pb overflow-y-auto">
      {/* Standard Header */}
      <StandardHeader
        title="App Settings"
        showBack={true}
        backTo="/profile" // Explicitly go back to profile
      />

      <div className="p-4 pt-24 space-y-4 pb-32">
        {/* Unit Preference */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Ruler className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Distance Unit</p>
              <p className="text-xs text-muted-foreground">Choose how distances are displayed</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateUnitMutation.mutate("metric")}
              className={`py-3 px-4 rounded-lg text-sm font-medium transition-smooth ${currentUnit === "metric"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
            >
              Metric (km)
            </button>
            <button
              onClick={() => updateUnitMutation.mutate("imperial")}
              className={`py-3 px-4 rounded-lg text-sm font-medium transition-smooth ${currentUnit === "imperial"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
            >
              Imperial (mi)
            </button>
          </div>
        </motion.div>

        {/* Health Connect Card - Android Only */}
        {isNative && platform === 'android' && (
          <motion.div
            className="tactical-card p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Heart className="h-5 w-5 text-rose-500" />
              <div>
                <p className="text-sm font-semibold text-foreground">Health Connect</p>
                <p className="text-xs text-muted-foreground">Sync steps from Health Connect</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {healthConnectStatus === 'connected' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-500 font-medium">Connected</span>
                  </>
                ) : healthConnectStatus === 'disconnected' ? (
                  <>
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Not Connected</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Checking...</span>
                )}
              </div>

              {healthConnectStatus !== 'connected' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConnectHealthConnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>

            {healthConnectStatus === 'connected' && (
              <p className="text-xs text-muted-foreground mt-3">
                Health Connect data will supplement your step tracking.
              </p>
            )}
          </motion.div>
        )}

        {/* Pedometer Debug - Development */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bug className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-foreground">Pedometer Debug</p>
                <p className="text-xs text-muted-foreground">Test step tracking hardware</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/pedometer-debug')}
            >
              Open
            </Button>
          </div>
        </motion.div>

        {/* Reset Onboarding */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RotateCcw className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Reset Onboarding</p>
                <p className="text-xs text-muted-foreground">Re-request all permissions</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetOnboarding}
            >
              Reset
            </Button>
          </div>
        </motion.div>

        {/* Clear Cache */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Clear Cache</p>
                <p className="text-xs text-muted-foreground">Reset local data and cache</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
            >
              Clear
            </Button>
          </div>
        </motion.div>

        {/* Log Out Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <motion.div
              className="tactical-card p-4 flex items-center justify-between cursor-pointer hover:bg-destructive/10 hover:border-destructive/50 transition-all duration-300 group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                  <LogOut className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-destructive">Log Out</p>
                  <p className="text-xs text-muted-foreground">Sign out of your account</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-destructive/50 group-hover:text-destructive transition-colors" />
            </motion.div>
          </AlertDialogTrigger>
          <AlertDialogContent className="w-[90%] rounded-2xl bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Log Out?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Are you sure you want to sign out of your account?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-2">
              <AlertDialogCancel className="flex-1 mt-0 bg-secondary text-foreground border-transparent hover:bg-secondary/80">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Log Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* App Info */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Info className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">App Information</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="text-foreground font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Build</span>
              <span className="text-foreground font-medium">2025.12.24</span>
            </div>
          </div>
        </motion.div>

        {/* Branding */}
        <motion.div
          className="text-center pt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Settings className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold text-primary tracking-wider">HOTSTEPPER</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 Outstandr. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AppSettings;