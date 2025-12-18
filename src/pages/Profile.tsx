import { motion } from "framer-motion";
import { User, Settings, Bell, Shield, LogOut, ChevronRight, Zap, Target, Calendar, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const menuItems = [
  { icon: Heart, label: "Health Profile", action: "health-profile" },
  { icon: Bell, label: "Notifications", action: "notifications" },
  { icon: Target, label: "Goals & Targets", action: "goals" },
  { icon: Shield, label: "Privacy & Security", action: "privacy" },
  { icon: Settings, label: "App Settings", action: "settings" },
];

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: streak } = useQuery({
    queryKey: ["streak", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ["stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return { totalSteps: 0, targetHits: 0 };
      
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("daily_steps")
        .select("steps, target_hit")
        .eq("user_id", user.id)
        .gte("date", startOfMonth.toISOString().split("T")[0]);
      
      if (error) throw error;
      
      const totalSteps = data?.reduce((sum, d) => sum + (d.steps || 0), 0) || 0;
      const targetHits = data?.filter(d => d.target_hit).length || 0;
      
      return { totalSteps, targetHits };
    },
    enabled: !!user?.id,
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const displayName = profile?.display_name || "HOTSTEPPER";
  const avatarInitials = profile?.avatar_initials || displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen-safe page-with-bottom-nav">
      {/* Header with safe area */}
      <motion.header 
        className="px-4 pb-4 text-center header-safe"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Avatar */}
        <motion.div 
          className="mx-auto mb-4 h-24 w-24 rounded-full bg-secondary border-2 border-primary/50 flex items-center justify-center"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <span className="text-2xl font-bold text-primary">{avatarInitials}</span>
        </motion.div>
        
        <h1 className="text-xl font-bold uppercase tracking-wider text-foreground">
          {displayName}
        </h1>
        <p className="text-xs font-medium text-muted-foreground mt-1">
          {user?.email}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-primary mt-2">
          Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Today'}
        </p>
      </motion.header>

      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-3 gap-3 px-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="tactical-card flex flex-col items-center py-4">
          <Zap className="h-5 w-5 text-accent mb-1" />
          <span className="text-2xl font-bold text-accent">{streak?.current_streak || 0}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Day Streak</span>
        </div>
        <div className="tactical-card flex flex-col items-center py-4">
          <Target className="h-5 w-5 text-primary mb-1" />
          <span className="text-2xl font-bold text-foreground">{stats?.targetHits || 0}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Targets Hit</span>
        </div>
        <div className="tactical-card flex flex-col items-center py-4">
          <Calendar className="h-5 w-5 text-primary mb-1" />
          <span className="text-2xl font-bold text-foreground">#{1}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Global Rank</span>
        </div>
      </motion.div>

      {/* Total Steps */}
      <motion.div 
        className="px-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="tactical-card text-center py-6">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Total Steps This Month
          </span>
          <div className="text-4xl font-bold text-primary mt-2">
            {(stats?.totalSteps || 0).toLocaleString()}
          </div>
        </div>
      </motion.div>

      {/* Menu Items */}
      <div className="px-4 space-y-2">
        {menuItems.map((item, index) => (
          <motion.button
            key={item.action}
            onClick={() => {
              const routes: Record<string, string> = {
                'health-profile': '/health-profile',
                'notifications': '/notifications',
                'goals': '/goals',
                'privacy': '/privacy',
                'settings': '/settings',
              };
              navigate(routes[item.action]);
            }}
            className="w-full tactical-card flex items-center justify-between hover:border-primary/50 transition-smooth touch-target press-scale"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">{item.label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        ))}
      </div>

      {/* Logout */}
      <motion.div 
        className="px-4 mt-8 pb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 py-3 text-destructive hover:bg-destructive/20 transition-smooth touch-target press-scale"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">Log Out</span>
        </button>
      </motion.div>

      <BottomNav />
    </div>
  );
};

export default Profile;
