import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, BellOff, Clock, Zap, Trophy, Target, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationPreferences {
  daily_reminders: boolean;
  step_alerts: boolean;
  streak_notifications: boolean;
  leaderboard_updates: boolean;
  morning_reminder_time: string;
  evening_reminder_time: string;
}

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSupported, hasPermission, requestPermission, isInitializing } = usePushNotifications();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    daily_reminders: true,
    step_alerts: true,
    streak_notifications: true,
    leaderboard_updates: true,
    morning_reminder_time: "06:00",
    evening_reminder_time: "20:00",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from("user_notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("Error fetching preferences:", error);
        }

        if (data) {
          setPreferences({
            daily_reminders: data.daily_reminders,
            step_alerts: data.step_alerts,
            streak_notifications: data.streak_notifications,
            leaderboard_updates: data.leaderboard_updates,
            morning_reminder_time: data.morning_reminder_time?.slice(0, 5) || "06:00",
            evening_reminder_time: data.evening_reminder_time?.slice(0, 5) || "20:00",
          });
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user?.id]);

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean | string) => {
    if (!user?.id) return;
    
    setSaving(true);
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      const { error } = await supabase
        .from("user_notification_preferences")
        .upsert({
          user_id: user.id,
          ...newPreferences,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) {
        console.error("Error saving preferences:", error);
        toast.error("Failed to save preference");
        // Revert on error
        setPreferences(preferences);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to save preference");
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success("Notifications enabled!");
    } else {
      toast.error("Permission denied. Enable in device settings.");
    }
  };

  const settingsItems = [
    {
      icon: Bell,
      label: "Daily Protocol Reminders",
      description: "Morning, midday, and evening check-ins",
      key: "daily_reminders" as const,
    },
    {
      icon: Target,
      label: "Step Tracking Alerts",
      description: "Progress updates and goal reminders",
      key: "step_alerts" as const,
    },
    {
      icon: Zap,
      label: "Streak Celebrations",
      description: "Celebrate your discipline milestones",
      key: "streak_notifications" as const,
    },
    {
      icon: Trophy,
      label: "Leaderboard Updates",
      description: "Rank changes and competition alerts",
      key: "leaderboard_updates" as const,
    },
  ];

  return (
    <div className="min-h-screen-safe bg-background pb-8">
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
          Notifications
        </h1>
      </motion.header>

      <div className="px-4 pt-6 space-y-6">
        {/* Permission Status */}
        {isSupported && !hasPermission && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="tactical-card border-accent/50 bg-accent/10"
          >
            <div className="flex items-start gap-3">
              <BellOff className="h-5 w-5 text-accent mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Notifications Disabled
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Enable notifications to receive discipline reminders and progress updates.
                </p>
                <button
                  onClick={handleEnableNotifications}
                  disabled={isInitializing}
                  className="mt-3 px-4 py-2 bg-accent text-background text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {isInitializing ? "Enabling..." : "Enable Notifications"}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {!isSupported && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="tactical-card border-muted"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Native App Required
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Push notifications require the native Android/iOS app.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Notification Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Notification Types
          </h2>
          <div className="space-y-2">
            {settingsItems.map((item, index) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="tactical-card"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {item.label}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences[item.key]}
                    onCheckedChange={(checked) => updatePreference(item.key, checked)}
                    disabled={loading || saving || (!hasPermission && isSupported)}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Reminder Times */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Reminder Schedule
          </h2>
          <div className="space-y-2">
            <div className="tactical-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-accent" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Morning Brief
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Start your day with purpose
                    </p>
                  </div>
                </div>
                <input
                  type="time"
                  value={preferences.morning_reminder_time}
                  onChange={(e) => updatePreference("morning_reminder_time", e.target.value)}
                  disabled={loading || saving || (!hasPermission && isSupported)}
                  className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="tactical-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Evening Debrief
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Final countdown reminder
                    </p>
                  </div>
                </div>
                <input
                  type="time"
                  value={preferences.evening_reminder_time}
                  onChange={(e) => updatePreference("evening_reminder_time", e.target.value)}
                  disabled={loading || saving || (!hasPermission && isSupported)}
                  className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Info Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center py-4"
        >
          <p className="text-xs text-muted-foreground">
            Notifications respect quiet hours (10PM - 6AM)
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default NotificationSettings;
