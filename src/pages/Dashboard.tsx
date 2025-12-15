import { motion } from "framer-motion";
import { MapPin, Flame, Zap, Play, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProgressRing } from "@/components/ProgressRing";
import { StatCard } from "@/components/StatCard";
import { LeaderboardPreview } from "@/components/LeaderboardPreview";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { HealthPermissionPrompt } from "@/components/HealthPermissionPrompt";
import { usePedometer } from "@/hooks/usePedometer";
import { useStreak } from "@/hooks/useStreak";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const TARGET_STEPS = 10000;

interface LeaderboardEntry {
  rank: number;
  name: string;
  steps: number;
  isCurrentUser?: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    steps, distance, calories, 
    hasPermission, isTracking, error, platform,
    startTracking, stopTracking, requestPermission,
    getDebugState
  } = usePedometer();
  const { streak, updateStreakOnTargetHit } = useStreak();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showDebug, setShowDebug] = useState(true);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: stepsData, error: stepsError } = await supabase
        .from('daily_steps')
        .select('steps, user_id')
        .eq('date', today)
        .order('steps', { ascending: false })
        .limit(10);

      if (stepsError || !stepsData) {
        console.error('[Dashboard] Leaderboard error:', stepsError);
        return;
      }

      const userIds = stepsData.map(item => item.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      const profileMap = new Map(profilesData?.map(p => [p.id, p.display_name]) || []);

      const entries: LeaderboardEntry[] = stepsData.map((item, index) => ({
        rank: index + 1,
        name: profileMap.get(item.user_id) || 'Unknown',
        steps: item.steps,
        isCurrentUser: item.user_id === user?.id
      }));

      setLeaderboard(entries);
    };

    if (user) {
      fetchLeaderboard();
    }
  }, [user, steps]);

  // Update streak when target is hit
  useEffect(() => {
    if (steps >= TARGET_STEPS) {
      updateStreakOnTargetHit();
    }
  }, [steps, updateStreakOnTargetHit]);

  const dashboardData = {
    steps,
    target: TARGET_STEPS,
    distance,
    calories,
    streak: streak.currentStreak
  };

  const debugState = getDebugState();

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
          Protocol Active • Day {dashboardData.streak}
        </p>
      </motion.header>

      {/* Debug Panel */}
      {showDebug && platform !== 'web' && (
        <div className="px-4 pb-2">
          <div className="tactical-card text-xs space-y-1">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold uppercase tracking-wider text-primary">Debug Panel</span>
              <button 
                onClick={() => setShowDebug(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Hide
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 text-muted-foreground">
              <span>Platform:</span>
              <span className="text-foreground">{debugState.platform}</span>
              <span>Permission:</span>
              <span className={debugState.hasPermission ? 'text-accent' : 'text-destructive'}>
                {debugState.hasPermission ? '✓ Granted' : '✗ Not granted'}
              </span>
              <span>Tracking:</span>
              <span className={debugState.isTracking ? 'text-accent' : 'text-muted-foreground'}>
                {debugState.isTracking ? '✓ Active' : '✗ Inactive'}
              </span>
              <span>Steps:</span>
              <span className="text-foreground">{debugState.steps}</span>
              <span>Distance:</span>
              <span className="text-foreground">{debugState.distance.toFixed(2)} km</span>
              <span>Tracking:</span>
              <span className={debugState.isTracking ? 'text-accent' : 'text-muted-foreground'}>
                {debugState.isTracking ? '✓ Active' : '✗ Inactive'}
              </span>
            </div>
            {error && (
              <div className="mt-2 text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Web Notice */}
      {platform === 'web' && (
        <div className="px-4 pb-4">
          <HealthPermissionPrompt
            platform="web"
            hasPermission={false}
            onRequestPermission={async () => false}
            isLoading={false}
          />
        </div>
      )}

      {/* Native step controls */}
      {platform !== 'web' && (
        <div className="px-4 pb-2">
          <div className="tactical-card flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current Steps</p>
              <p className="text-2xl font-bold text-foreground">{steps}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                {hasPermission ? '✓ Permission granted' : '✗ Permission not granted'}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="tactical"
                size="sm"
                onClick={startTracking}
                disabled={isTracking}
              >
                {isTracking ? 'Tracking...' : 'Start'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={stopTracking}
                disabled={!isTracking}
              >
                Stop
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Progress Ring */}
      <div className="flex justify-center px-4 py-6">
        <ProgressRing current={dashboardData.steps} target={dashboardData.target} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 px-4">
        <StatCard 
          icon={MapPin} 
          label="Distance" 
          value={`${dashboardData.distance.toFixed(1)} KM`}
          delay={0.2}
        />
        <StatCard 
          icon={Flame} 
          label="Calories" 
          value={`${dashboardData.calories}`}
          delay={0.3}
        />
        <StatCard 
          icon={Zap} 
          label="Streak" 
          value={`Day ${dashboardData.streak}`}
          highlight
          delay={0.4}
        />
      </div>

      {/* Leaderboard Preview */}
      <div className="px-4 py-6">
        {leaderboard.length > 0 ? (
          <LeaderboardPreview 
            entries={leaderboard}
            onViewAll={() => navigate('/leaderboard')}
          />
        ) : (
          <motion.div 
            className="tactical-card text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              No leaderboard data yet. Start walking to join the competition!
            </p>
          </motion.div>
        )}
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
