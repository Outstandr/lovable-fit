import { motion } from "framer-motion";
import { User, Settings, Bell, Shield, LogOut, ChevronRight, Zap, Target, Calendar } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

const mockProfile = {
  name: "THE HOTSTEPPER",
  email: "hotstepper@protocol.io",
  memberSince: "Nov 2024",
  rank: 4,
  totalSteps: 285400,
  streak: 12,
  targetHits: 28,
};

const menuItems = [
  { icon: Bell, label: "Notifications", action: "notifications" },
  { icon: Target, label: "Goals & Targets", action: "goals" },
  { icon: Shield, label: "Privacy & Security", action: "privacy" },
  { icon: Settings, label: "App Settings", action: "settings" },
];

const Profile = () => {
  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <motion.header 
        className="px-4 pt-6 pb-4 text-center"
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
          <User className="h-12 w-12 text-primary" />
        </motion.div>
        
        <h1 className="text-xl font-bold uppercase tracking-wider text-foreground">
          {mockProfile.name}
        </h1>
        <p className="text-xs font-medium text-muted-foreground mt-1">
          {mockProfile.email}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-primary mt-2">
          Member since {mockProfile.memberSince}
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
          <span className="text-2xl font-bold text-accent">{mockProfile.streak}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Day Streak</span>
        </div>
        <div className="tactical-card flex flex-col items-center py-4">
          <Target className="h-5 w-5 text-primary mb-1" />
          <span className="text-2xl font-bold text-foreground">{mockProfile.targetHits}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Targets Hit</span>
        </div>
        <div className="tactical-card flex flex-col items-center py-4">
          <Calendar className="h-5 w-5 text-primary mb-1" />
          <span className="text-2xl font-bold text-foreground">#{mockProfile.rank}</span>
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
            {mockProfile.totalSteps.toLocaleString()}
          </div>
        </div>
      </motion.div>

      {/* Menu Items */}
      <div className="px-4 space-y-2">
        {menuItems.map((item, index) => (
          <motion.button
            key={item.action}
            className="w-full tactical-card flex items-center justify-between hover:border-primary/50 transition-colors"
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
        className="px-4 mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 py-3 text-destructive hover:bg-destructive/20 transition-colors">
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">Log Out</span>
        </button>
      </motion.div>

      <BottomNav />
    </div>
  );
};

export default Profile;
