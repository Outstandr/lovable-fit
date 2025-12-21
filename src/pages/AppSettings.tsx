import { motion } from "framer-motion";
import { ArrowLeft, Settings, Ruler, Info, RefreshCw, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";


const ONBOARDING_KEY = 'device_onboarding_completed';

const AppSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
    <div className="min-h-screen-safe bg-background safe-area-pb">
      {/* Header */}
      <motion.header 
        className="flex items-center gap-4 p-4 border-b border-border header-safe"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button 
          onClick={() => navigate("/profile")}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-smooth"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold uppercase tracking-wider text-foreground">
          App Settings
        </h1>
      </motion.header>

      <div className="p-4 space-y-4">
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
              className={`py-3 px-4 rounded-lg text-sm font-medium transition-smooth ${
                currentUnit === "metric"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              Metric (km)
            </button>
            <button
              onClick={() => updateUnitMutation.mutate("imperial")}
              className={`py-3 px-4 rounded-lg text-sm font-medium transition-smooth ${
                currentUnit === "imperial"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              Imperial (mi)
            </button>
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
              <span className="text-foreground font-medium">2024.12.18</span>
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
            © 2024 Hotstepper. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AppSettings;