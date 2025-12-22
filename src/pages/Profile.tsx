import { motion } from "framer-motion";
import { User, Settings, Bell, Shield, LogOut, ChevronRight, Zap, Target, Calendar, Heart, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { RubberBandScroll } from "@/components/ui/RubberBandScroll";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonCard, SkeletonCircle, SkeletonText } from "@/components/ui/SkeletonCard";

const menuItems = [
  { icon: Heart, label: "Health Profile", action: "health-profile", color: "text-red-400" },
  { icon: Bell, label: "Notifications", action: "notifications", color: "text-yellow-400" },
  { icon: Target, label: "Goals & Targets", action: "goals", color: "text-primary" },
  { icon: Shield, label: "Privacy & Security", action: "privacy", color: "text-green-400" },
  { icon: Settings, label: "App Settings", action: "settings", color: "text-muted-foreground" },
];

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
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
    <div className="h-screen flex flex-col page-with-bottom-nav relative">
      <RubberBandScroll className="flex-1" contentClassName="pb-24">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      {/* Header with safe area */}
      <motion.header 
        className="px-4 pb-6 text-center header-safe relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {profileLoading ? (
          <div className="flex flex-col items-center">
            <SkeletonCircle size="h-28 w-28" className="mb-4" />
            <SkeletonText width="w-32" className="mb-2" />
            <SkeletonText width="w-40" />
          </div>
        ) : (
          <>
            {/* Avatar with gradient ring */}
            <motion.div 
              className="mx-auto mb-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <div className="relative h-28 w-28 mx-auto">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-cyan-400 p-[3px]">
                  <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary">{avatarInitials}</span>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.h1 
              className="text-2xl font-bold uppercase tracking-wider text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {displayName}
            </motion.h1>
            <motion.p 
              className="text-xs font-medium text-muted-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              {user?.email}
            </motion.p>
            <motion.div
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-primary/10 border border-primary/20"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">
                Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Today'}
              </span>
            </motion.div>
          </>
        )}
      </motion.header>

      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-3 gap-3 px-4 mb-6 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div 
          className="tactical-card flex flex-col items-center py-5"
          whileHover={{ scale: 1.02 }}
        >
          <div className="p-2 rounded-lg bg-accent/15 mb-2">
            <Zap className="h-5 w-5 text-accent" />
          </div>
          <span className="text-3xl font-bold text-accent tabular-nums">{streak?.current_streak || 0}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Day Streak</span>
        </motion.div>
        <motion.div 
          className="tactical-card flex flex-col items-center py-5"
          whileHover={{ scale: 1.02 }}
        >
          <div className="p-2 rounded-lg bg-primary/15 mb-2">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <span className="text-3xl font-bold text-foreground tabular-nums">{stats?.targetHits || 0}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Targets Hit</span>
        </motion.div>
        <motion.div 
          className="tactical-card flex flex-col items-center py-5"
          whileHover={{ scale: 1.02 }}
        >
          <div className="p-2 rounded-lg bg-primary/15 mb-2">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <span className="text-3xl font-bold text-foreground tabular-nums">#{1}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Global Rank</span>
        </motion.div>
      </motion.div>

      {/* Total Steps */}
      <motion.div 
        className="px-4 mb-6 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="tactical-card text-center py-6 relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
          
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground relative z-10">
            Total Steps This Month
          </span>
          <motion.div 
            className="text-4xl font-bold text-gradient-cyan mt-2 relative z-10"
            key={stats?.totalSteps}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
          >
            {(stats?.totalSteps || 0).toLocaleString()}
          </motion.div>
        </div>
      </motion.div>

      {/* Menu Items */}
      <div className="px-4 space-y-2 relative z-10">
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
            className="w-full tactical-card-interactive flex items-center justify-between touch-target"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.08 }}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-secondary/80`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <span className="text-sm font-semibold text-foreground">{item.label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        ))}

        {/* Logout Button */}
        <motion.button
          onClick={handleLogout}
          className="w-full tactical-card flex items-center justify-between hover:border-destructive/50 transition-all duration-300 touch-target press-scale"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + menuItems.length * 0.08 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/15">
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <span className="text-sm font-semibold text-destructive">Log Out</span>
          </div>
          <ChevronRight className="h-4 w-4 text-destructive/50" />
        </motion.button>
        </div>
      </RubberBandScroll>

      <BottomNav />
    </div>
  );
};

export default Profile;