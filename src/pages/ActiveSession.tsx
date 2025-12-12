import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Gauge, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useHealthData } from "@/hooks/useHealthData";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LiveMap from "@/components/LiveMap";
import MapPlaceholder from "@/components/MapPlaceholder";

const ActiveSession = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { healthData, refetch } = useHealthData();
  const { 
    currentPosition, 
    routePoints, 
    gpsDistance, 
    isTracking: isGpsTracking, 
    startTracking, 
    stopTracking 
  } = useLocationTracking();
  
  const [duration, setDuration] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [startSteps, setStartSteps] = useState<number | null>(null);
  const [sessionStartTime] = useState<Date>(new Date());
  const lastStepsRef = useRef(0);

  // Start GPS tracking when session begins
  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, [startTracking, stopTracking]);

  // Capture start steps when session begins
  useEffect(() => {
    if (startSteps === null && !healthData.isLoading) {
      setStartSteps(healthData.steps);
      lastStepsRef.current = healthData.steps;
    }
  }, [healthData.steps, healthData.isLoading, startSteps]);

  // Timer for duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Refresh health data more frequently during active session
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      refetch();
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, [isRunning, refetch]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate session stats - prefer GPS distance if available
  const sessionSteps = startSteps !== null ? Math.max(0, healthData.steps - startSteps) : 0;
  const stepBasedDistance = (sessionSteps * 0.762) / 1000; // Convert steps to km
  const sessionDistance = gpsDistance > 0 ? gpsDistance : stepBasedDistance; // Prefer GPS
  
  // Calculate pace (min:sec per km)
  const calculatePace = () => {
    if (sessionDistance <= 0 || duration <= 0) return "--:--";
    const paceSeconds = duration / sessionDistance;
    const paceMinutes = Math.floor(paceSeconds / 60);
    const paceRemainderSeconds = Math.floor(paceSeconds % 60);
    return `${paceMinutes}:${paceRemainderSeconds.toString().padStart(2, '0')}`;
  };

  const sessionData = {
    distance: sessionDistance.toFixed(2),
    pace: calculatePace(),
    steps: sessionSteps,
  };

  const handleStop = async () => {
    setIsRunning(false);
    stopTracking();
    if (!user) {
      toast.error("Not logged in");
      navigate('/');
      return;
    }

    try {
      // Save session to database
      const { error } = await supabase
        .from('active_sessions')
        .insert({
          user_id: user.id,
          started_at: sessionStartTime.toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
          steps: sessionSteps,
          distance_km: sessionDistance,
          pace_per_km: sessionData.pace !== "--:--" ? sessionData.pace : null
        });

      if (error) {
        console.error('[ActiveSession] Save error:', error);
        toast.error("Failed to save session");
      } else {
        toast.success(`Session saved! ${sessionSteps} steps`);
      }
    } catch (error) {
      console.error('[ActiveSession] Error:', error);
    }

    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <motion.header 
        className="flex items-center gap-4 px-4 pt-6 pb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button 
          onClick={() => navigate('/')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold uppercase tracking-widest text-primary">
            Active Mode
          </h1>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {isRunning ? "Session in progress" : "Session ended"}
          </p>
        </div>
      </motion.header>

      {/* Map Area */}
      <motion.div 
        className="flex-1 mx-4 rounded-xl overflow-hidden bg-secondary/50 relative min-h-[300px]"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        {currentPosition ? (
          <LiveMap 
            currentPosition={currentPosition}
            routePoints={routePoints}
            isTracking={isGpsTracking}
          />
        ) : (
          <MapPlaceholder />
        )}
      </motion.div>

      {/* Stats Panel */}
      <motion.div 
        className="px-4 py-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="tactical-card">
          {/* Duration - Large */}
          <div className="mb-4 text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Duration
            </span>
            <div className="text-5xl font-bold tracking-tight text-foreground">
              {formatTime(duration)}
            </div>
          </div>

          {/* Other stats */}
          <div className="grid grid-cols-3 gap-4 border-t border-border/50 pt-4">
            <div className="flex flex-col items-center gap-1">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-xl font-bold text-foreground">{sessionData.distance} KM</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Distance</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Gauge className="h-4 w-4 text-primary" />
              <span className="text-xl font-bold text-foreground">{sessionData.pace}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pace /km</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xl font-bold text-foreground">{sessionData.steps}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Steps</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stop Button */}
      <div className="px-4 pb-8">
        <Button 
          variant="tacticalStop" 
          size="full"
          onClick={handleStop}
        >
          <Square className="mr-2 h-5 w-5 fill-current" />
          Stop / Finish
        </Button>
      </div>
    </div>
  );
};

export default ActiveSession;
