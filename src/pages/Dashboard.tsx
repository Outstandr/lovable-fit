import { motion } from "framer-motion";
import { MapPin, Flame, Zap, Play, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProgressRing } from "@/components/ProgressRing";
import { StatCard } from "@/components/StatCard";
import { LeaderboardPreview } from "@/components/LeaderboardPreview";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { HealthConnectPrompt } from "@/components/HealthConnectPrompt";
import { DataSourceBadge } from "@/components/DataSourceBadge";
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
    getDebugState,
    // Health Connect specific
    dataSource,
    healthConnectAvailable,
    healthConnectPermissionGranted,
    isInitializing,
    requestHealthConnectPermission,
    skipHealthConnect,
  } = usePedometer();
  const { streak, updateStreakOnTargetHit } = useStreak();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showDebug, setShowDebug] = useState(true);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

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

  // Fetch recent active sessions
  useEffect(() => {
    const fetchRecentSessions = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('ended_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('[Dashboard] Sessions error:', error);
        return;
      }

      setRecentSessions(data || []);
    };

    if (user) {
      fetchRecentSessions();
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

      {/* Health Connect Prompt - shows for native platforms */}
      {platform !== 'web' && (
        <div className="px-4 pb-2">
          <HealthConnectPrompt
            platform={platform}
            hasPermission={hasPermission}
            onRequestPermission={requestPermission}
            isLoading={isInitializing}
            healthConnectAvailable={healthConnectAvailable}
            healthConnectPermissionGranted={healthConnectPermissionGranted}
            dataSource={dataSource}
            onRequestHealthConnectPermission={requestHealthConnectPermission}
            onSkipHealthConnect={skipHealthConnect}
            isInitializing={isInitializing}
          />
        </div>
      )}

      {/* Web Notice */}
      {platform === 'web' && (
        <div className="px-4 pb-4">
          <HealthConnectPrompt
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
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current Steps</p>
                <DataSourceBadge dataSource={dataSource} compact />
              </div>
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

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div className="px-4 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Recent Sessions
              </h2>
            </div>
            <div className="space-y-2">
              {recentSessions.map((session, index) => {
                const duration = session.duration_seconds || 0;
                const hours = Math.floor(duration / 3600);
                const minutes = Math.floor((duration % 3600) / 60);
                const durationText = hours > 0 
                  ? `${hours}h ${minutes}m` 
                  : `${minutes}m`;

                return (
                  <motion.div
                    key={session.id}
                    className="tactical-card"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {session.ended_at ? new Date(session.ended_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'In progress'}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <div>
                            <span className="text-lg font-bold text-foreground">{session.steps || 0}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">steps</span>
                          </div>
                          <div>
                            <span className="text-lg font-bold text-foreground">{session.distance_km?.toFixed(2) || '0.00'}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">km</span>
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-primary">{durationText}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

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
