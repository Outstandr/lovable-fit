import { motion } from "framer-motion";
import { ArrowLeft, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

import { useState, useEffect } from "react";

const GoalsSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [dailyGoal, setDailyGoal] = useState(10000);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("daily_step_goal")
        .eq("id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile?.daily_step_goal) {
      setDailyGoal(profile.daily_step_goal);
    }
  }, [profile]);

  const updateGoalMutation = useMutation({
    mutationFn: async (goal: number) => {
      const { error } = await supabase
        .from("profiles")
        .update({ daily_step_goal: goal })
        .eq("id", user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const handleSave = () => {
    updateGoalMutation.mutate(dailyGoal);
  };

  const presets = [5000, 7500, 10000, 12500, 15000, 20000];

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
          Goals & Targets
        </h1>
      </motion.header>

      <div className="p-4 space-y-6">
        {/* Daily Step Goal */}
        <motion.div 
          className="tactical-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Target className="h-6 w-6 text-primary" />
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground">
              Daily Step Goal
            </h2>
          </div>

          {/* Current Goal Display */}
          <div className="text-center mb-8">
            <span className="text-5xl font-bold text-primary">
              {dailyGoal.toLocaleString()}
            </span>
            <p className="text-sm text-muted-foreground mt-2">steps per day</p>
          </div>

          {/* Slider */}
          <div className="mb-6">
            <Slider
              value={[dailyGoal]}
              onValueChange={(value) => setDailyGoal(value[0])}
              min={3000}
              max={25000}
              step={500}
              className="w-full"
            />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>3,000</span>
              <span>25,000</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => setDailyGoal(preset)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-smooth ${
                  dailyGoal === preset 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {(preset / 1000).toFixed(preset % 1000 === 0 ? 0 : 1)}K
              </button>
            ))}
          </div>

          {/* Info */}
          <p className="text-xs text-muted-foreground text-center">
            The World Health Organization recommends 10,000 steps daily for optimal health.
          </p>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button 
            onClick={handleSave}
            disabled={updateGoalMutation.isPending}
            className="w-full"
            variant="tactical"
          >
            {updateGoalMutation.isPending ? "Saving..." : "Save Goal"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default GoalsSettings;