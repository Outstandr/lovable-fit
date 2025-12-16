import { motion } from "framer-motion";
import { MapPin, Flame, Zap, Play, Settings, Share2, PersonStanding } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { WeeklyChart } from "@/components/WeeklyChart";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import { usePedometer } from "@/hooks/usePedometer";
import { useStreak } from "@/hooks/useStreak";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const TARGET_STEPS = 10000;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    steps, distance, calories, avgSpeed,
    dataSource,
  } = usePedometer();
  const { streak, updateStreakOnTargetHit } = useStreak();
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  // Fetch recent active sessions
  useEffect(() => {
    const fetchRecentSessions = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('user_id', user.id)
        .not('ended_at', 'is', null)
        .order('ended_at', { ascending: false })
        .limit(3);

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

  return (
    <div className="min-h-screen pb-24 relative">
      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at top center, hsl(186, 100%, 50%, 0.05), transparent 60%)'
      }} />

      {/* Header */}
      <motion.header 
        className="flex items-center justify-between px-4 pt-6 pb-2 relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button 
          onClick={() => navigate('/profile')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <Settings className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">Today</h1>
          <DataSourceBadge dataSource={dataSource} compact />
        </div>
        <button 
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </motion.header>

      {/* Main Progress Ring */}
      <motion.div 
        className="flex justify-center px-4 py-8 relative z-10"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="relative">
          <ProgressRing current={steps} target={TARGET_STEPS} size={280} strokeWidth={16} />
          {/* Walker icon overlay - positioned above the number */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <PersonStanding className="h-8 w-8 text-primary opacity-60 -mt-24" />
          </div>
        </div>
      </motion.div>

      {/* Quick Stats Row */}
      <motion.div 
        className="grid grid-cols-3 gap-3 px-4 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        {/* Calories */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-14 w-14 rounded-full bg-card flex items-center justify-center border border-border/30">
            <Flame className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-foreground tabular-nums">{calories}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Calories</p>
          </div>
        </div>

        {/* Distance */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-14 w-14 rounded-full bg-card flex items-center justify-center border border-border/30">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-foreground tabular-nums">{distance.toFixed(1)}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">KM</p>
          </div>
        </div>

        {/* Avg Speed */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-14 w-14 rounded-full bg-card flex items-center justify-center border border-border/30">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-foreground tabular-nums">{avgSpeed.toFixed(1)}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">km/h</p>
          </div>
        </div>
      </motion.div>

      {/* Weekly Chart */}
      <div className="px-4 pt-6 relative z-10">
        <WeeklyChart />
      </div>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div className="px-4 pt-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground mb-3">
              Recent Sessions
            </h2>
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
                    className="tactical-card flex items-center justify-between"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {session.ended_at ? new Date(session.ended_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                        }) : 'In progress'}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-lg font-bold text-foreground tabular-nums">
                          {(session.steps || 0).toLocaleString()}
                          <span className="text-xs text-muted-foreground ml-1">steps</span>
                        </span>
                        <span className="text-lg font-bold text-foreground tabular-nums">
                          {session.distance_km?.toFixed(2) || '0.00'}
                          <span className="text-xs text-muted-foreground ml-1">km</span>
                        </span>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-primary/20 text-primary text-sm font-semibold">
                      {durationText}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* Empty state for sessions */}
      {recentSessions.length === 0 && (
        <div className="px-4 pt-6 relative z-10">
          <motion.div
            className="tactical-card text-center py-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <PersonStanding className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              No sessions yet. Start your first active session!
            </p>
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
            className="h-14 text-sm font-bold uppercase tracking-widest shadow-lg"
            style={{
              boxShadow: '0 8px 24px hsl(186, 100%, 50%, 0.35)'
            }}
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
