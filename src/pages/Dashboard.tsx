import { motion } from "framer-motion";
import { MapPin, Flame, Clock, Play, Pause, Share2, PersonStanding, User, AlertCircle, RefreshCw, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { WeeklyChart } from "@/components/WeeklyChart";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import { OnboardingPrompt } from "@/components/OnboardingPrompt";
import { usePedometer } from "@/hooks/usePedometer";
import { useStreak } from "@/hooks/useStreak";
import { useAudiobook } from "@/hooks/useAudiobook";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from 'sonner';
import { haptics } from '@/utils/haptics';
import { Progress } from "@/components/ui/progress";

const TARGET_STEPS = 10000;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    steps, distance, calories,
    dataSource, lastUpdate, syncToDatabase,
  } = usePedometer();
  const { streak, updateStreakOnTargetHit } = useStreak();
  const { 
    isPlaying, currentChapter, currentTime, duration, 
    togglePlay, formatTime, isLoading: audiobookLoading 
  } = useAudiobook();
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [displayTime, setDisplayTime] = useState(new Date());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Check if profile is complete - show onboarding ONLY ONCE EVER
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;

      // Check if user has EVER completed onboarding
      const onboardingDone = localStorage.getItem('onboarding_completed');
      if (onboardingDone === 'true') return; // Never show again

      const { data, error } = await supabase
        .from('profiles')
        .select('profile_completed')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[Dashboard] Profile check error:', error);
        return;
      }

      // Show onboarding if profile is not complete
      if (!data?.profile_completed) {
        setTimeout(() => setShowOnboarding(true), 2000);
      }
    };

    checkOnboarding();
  }, [user]);

  // Update streak when target is hit
  useEffect(() => {
    if (steps >= TARGET_STEPS) {
      updateStreakOnTargetHit();
    }
  }, [steps, updateStreakOnTargetHit]);

  // Update display time every 10 seconds for "last updated" display
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayTime(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Format last update time
  const formatLastUpdate = () => {
    const now = displayTime;
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffSecs < 30) return 'just now';
    if (diffMins < 1) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    return lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Display distance (use real or estimate from steps)
  const displayDistance = distance > 0 ? distance : (steps * 0.762) / 1000;
  
  // Estimate active time from steps (avg 120 steps/min)
  const activeMinutes = Math.floor(steps / 120);

  const handleOnboardingSkip = () => {
    // Mark as permanently completed
    localStorage.setItem('onboarding_completed', 'true');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    haptics.light();
    
    try {
      await syncToDatabase();
      toast.success('✓ Data refreshed');
    } catch (error) {
      console.error('[Dashboard] Refresh error:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleShareClick = () => {
    haptics.light();
    toast.info('📤 Share Feature Coming Soon!', {
      description: 'Export your progress and share with friends'
    });
  };

  return (
    <div 
      className="min-h-screen-safe page-with-bottom-nav relative"
      onTouchStart={(e) => {
        const touch = e.touches[0];
        const startY = touch.clientY;
        
        const handleTouchMove = (moveEvent: TouchEvent) => {
          const currentY = moveEvent.touches[0].clientY;
          const pullDistance = currentY - startY;
          
          if (pullDistance > 100 && window.scrollY === 0 && !isRefreshing) {
            handleRefresh();
            document.removeEventListener('touchmove', handleTouchMove);
          }
        };
        
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', () => {
          document.removeEventListener('touchmove', handleTouchMove);
        }, { once: true });
      }}
    >
      {/* Refresh Indicator */}
      {isRefreshing && (
        <motion.div 
          className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center py-4 safe-area-pt"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 backdrop-blur-sm">
            <RefreshCw className="h-4 w-4 text-primary animate-spin" />
            <span className="text-xs font-medium text-primary">Refreshing...</span>
          </div>
        </motion.div>
      )}

      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at top center, hsl(186, 100%, 50%, 0.05), transparent 60%)'
      }} />

      {/* Header with safe area */}
      <motion.header 
        className="flex items-center justify-between px-4 pb-2 relative z-content header-safe"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Profile Button */}
        <button 
          onClick={() => {
            haptics.light();
            navigate('/profile');
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-smooth touch-target press-scale"
          aria-label="Open profile settings"
          role="button"
        >
          <User className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">Today</h1>
          <DataSourceBadge dataSource={dataSource} compact />
        </div>
        
        <button 
          onClick={handleShareClick}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-smooth touch-target press-scale"
          aria-label="Share your progress"
          role="button"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </motion.header>

      {/* Permission Denied Alert */}
      {dataSource === 'unavailable' && (
        <motion.div 
          className="mx-4 mb-4 relative z-content"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-yellow-400">
                Step Tracking Unavailable
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Physical activity permission is required to count your steps.
              </p>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  toast.info('Open Settings → Apps → HotStepper → Permissions → Allow Physical Activity');
                }}
                className="text-xs mt-2 h-7 px-2 text-yellow-400 hover:text-yellow-300"
              >
                Open Settings
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <main>
        {/* Main Progress Ring */}
        <motion.div 
          className="flex justify-center px-4 py-8 relative z-content"
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

        {/* Last Update Indicator */}
        <motion.div 
          className="text-center -mt-4 mb-2 relative z-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-xs text-muted-foreground">
            Updated {formatLastUpdate()}
          </p>
        </motion.div>

        {/* Quick Stats Row */}
        <motion.div 
          className="grid grid-cols-4 gap-2 px-4 relative z-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {/* Calories */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-card flex items-center justify-center border border-border/30">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground tabular-nums">{calories}</p>
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Cals</p>
            </div>
          </div>

          {/* Distance */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-card flex items-center justify-center border border-border/30">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground tabular-nums">{displayDistance.toFixed(1)}</p>
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">KM</p>
            </div>
          </div>

          {/* Active Time */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-card flex items-center justify-center border border-border/30">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground tabular-nums">{activeMinutes}</p>
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Min</p>
            </div>
          </div>

          {/* Streak */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-card flex items-center justify-center border border-orange-500/30">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-orange-400 tabular-nums">{streak.currentStreak}</p>
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Streak</p>
            </div>
          </div>
        </motion.div>

        {/* Audiobook Mini Player */}
        <motion.div
          className="px-4 pt-6 relative z-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div 
            className="tactical-card cursor-pointer"
            onClick={() => navigate('/audiobook')}
          >
            <div className="flex items-center gap-3">
              {/* Album Art */}
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 flex-shrink-0">
                <Headphones className="h-6 w-6 text-primary" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {currentChapter ? 'Now Playing' : 'Audiobook'}
                </p>
                <p className="text-sm font-semibold text-foreground truncate">
                  {currentChapter?.title || 'Reset Body & Diet'}
                </p>
                {duration > 0 && (
                  <div className="mt-1.5">
                    <Progress value={(currentTime / duration) * 100} className="h-1" />
                    <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </p>
                  </div>
                )}
              </div>

              {/* Play/Pause Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.medium();
                  togglePlay();
                }}
                disabled={audiobookLoading}
                className="h-10 w-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth flex-shrink-0"
              >
                {audiobookLoading ? (
                  <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Weekly Chart */}
        <div className="px-4 pt-6 relative z-content">
          <WeeklyChart />
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div className="px-4 pt-6 relative z-content">
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

        {/* Empty state for sessions - Improved */}
        {recentSessions.length === 0 && (
          <div className="px-4 pt-6 pb-8 relative z-content">
            <motion.div
              className="tactical-card text-center py-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <PersonStanding className="h-12 w-12 text-primary mx-auto mb-3 opacity-70" />
              <p className="text-base font-semibold text-foreground">
                Ready for Your First Challenge?
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Track your route, monitor your progress, and compete with friends!
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  haptics.medium();
                  navigate('/active');
                }}
                className="mt-4"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Session
              </Button>
            </motion.div>
          </div>
        )}
      </main>

      {/* Action Button - Fixed above bottom nav */}
      <div className="fixed left-4 right-4 z-fixed fixed-above-nav" style={{ marginBottom: '1rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <Button 
            variant="tactical" 
            size="full"
            onClick={() => {
              haptics.medium();
              navigate('/active');
            }}
            className="h-14 text-sm font-bold uppercase tracking-widest shadow-lg press-scale"
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

      {/* Onboarding Prompt */}
      <OnboardingPrompt 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)}
        onSkip={handleOnboardingSkip}
      />
    </div>
  );
};

export default Dashboard;
