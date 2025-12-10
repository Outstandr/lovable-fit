import { motion } from "framer-motion";
import { MapPin, Flame, Zap, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProgressRing } from "@/components/ProgressRing";
import { StatCard } from "@/components/StatCard";
import { LeaderboardPreview } from "@/components/LeaderboardPreview";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";

// Mock data - will be replaced with real health data
const mockData = {
  steps: 6450,
  target: 10000,
  distance: 5.2,
  calories: 258,
  streak: 12,
};

const mockLeaderboard = [
  { rank: 1, name: "J. STEELE", steps: 15400 },
  { rank: 2, name: "M. FROST", steps: 14200 },
  { rank: 3, name: "THE HOTSTEPPER", steps: 13800, isCurrentUser: true },
  { rank: 4, name: "K. DARK", steps: 12500 },
];

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <motion.header 
        className="px-4 pt-6 pb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-foreground">
          Hotstepper
        </h1>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Protocol Active • Day {mockData.streak}
        </p>
      </motion.header>

      {/* Main Progress Ring */}
      <div className="flex justify-center px-4 py-6">
        <ProgressRing current={mockData.steps} target={mockData.target} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 px-4">
        <StatCard 
          icon={MapPin} 
          label="Distance" 
          value={`${mockData.distance} KM`}
          delay={0.2}
        />
        <StatCard 
          icon={Flame} 
          label="Calories" 
          value={`${mockData.calories}`}
          delay={0.3}
        />
        <StatCard 
          icon={Zap} 
          label="Streak" 
          value={`Day ${mockData.streak}`}
          highlight
          delay={0.4}
        />
      </div>

      {/* Leaderboard Preview */}
      <div className="px-4 py-6">
        <LeaderboardPreview 
          entries={mockLeaderboard}
          onViewAll={() => navigate('/leaderboard')}
        />
      </div>

      {/* Action Button */}
      <div className="fixed bottom-20 left-4 right-4 z-40">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <Button 
            variant="tactical" 
            size="full"
            onClick={() => navigate('/active')}
            className="animate-pulse-glow"
          >
            <Play className="mr-2 h-5 w-5" />
            Start Active Session
          </Button>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
