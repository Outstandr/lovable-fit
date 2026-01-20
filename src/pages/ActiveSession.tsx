import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Gauge, Square, Zap, Footprints, Satellite, RefreshCw, Settings, X, Loader2, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePedometer } from "@/hooks/usePedometer";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import LiveMap from "@/components/LiveMap";
import MapPlaceholder from "@/components/MapPlaceholder";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import { Capacitor } from "@capacitor/core";
import AudiobookPlayer from "@/components/AudiobookPlayer";
import { useAudiobook } from "@/hooks/useAudiobook";
import { RubberBandScroll } from "@/components/ui/RubberBandScroll";
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';

const ActiveSession = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { steps, dataSource } = usePedometer();

  const {
    currentPosition,
    routePoints,
    gpsDistance,
    currentSpeed,
    avgSpeed,
    maxSpeed,
    gpsAccuracy,
    isTracking: isGpsTracking,
    isAcquiringGPS,
    hasPermission: hasGpsPermission,
    error: gpsError,
    startTracking,
    stopTracking,
    retryGPS
  } = useLocationTracking();

  // Audiobook state
  const { isPlaying: isAudioPlaying, getButtonText, togglePlay, allChaptersComplete, stop: stopAudio } = useAudiobook();
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const [duration, setDuration] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [startSteps, setStartSteps] = useState<number | null>(null);
  const [sessionStartTime] = useState<Date>(new Date());
  const [gpsInitialized, setGpsInitialized] = useState(false);
  const [useStepsOnly, setUseStepsOnly] = useState(false);

  // Start GPS tracking when component mounts
  useEffect(() => {
    const initGps = async () => {
      try {
        await startTracking();
      } catch (error) {
        console.error('[ActiveSession] GPS init error:', error);
      } finally {
        setGpsInitialized(true);
      }
    };
    initGps();
    return () => {
      try {
        stopTracking();
      } catch (error) {
        console.error('[ActiveSession] GPS cleanup error:', error);
      }
    };
  }, []);

  // Capture start steps when session begins
  useEffect(() => {
    if (startSteps === null && steps > 0) {
      setStartSteps(steps);
    }
  }, [steps, startSteps]);

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

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate session stats - prefer GPS distance, fallback to steps
  const sessionSteps = startSteps !== null ? Math.max(0, steps - startSteps) : 0;
  const stepBasedDistance = (sessionSteps * 0.762) / 1000;
  const sessionDistance = gpsDistance > 0 ? gpsDistance : stepBasedDistance;
  const usingGps = gpsDistance > 0;

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
    speed: currentSpeed.toFixed(1),
  };

  const handleStop = async () => {
    setIsRunning(false);
    stopTracking();
    stopAudio(); // Stop audiobook when session ends

    if (!user) {
      navigate('/');
      return;
    }

    try {
      // Prepare route coordinates for saving
      const routeCoordinates = routePoints.map(p => ({
        lat: p.latitude,
        lng: p.longitude,
        ts: p.timestamp,
        acc: p.accuracy,
      }));

      const { error } = await supabase
        .from('active_sessions')
        .insert({
          user_id: user.id,
          started_at: sessionStartTime.toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
          steps: sessionSteps,
          distance_km: sessionDistance,
          pace_per_km: sessionData.pace !== "--:--" ? sessionData.pace : null,
          route_snapshot_url: routePoints.length > 1 ? JSON.stringify(routeCoordinates) : null,
        });

      if (error) {
        console.error('[ActiveSession] Save error:', error);
      }
    } catch (error) {
      console.error('[ActiveSession] Error:', error);
    }

    navigate('/');
  };

  const handleUseStepsOnly = () => {
    setUseStepsOnly(true);
    stopTracking();
  };

  const handleRetryGPS = async () => {
    setUseStepsOnly(false);
    await retryGPS();
  };

  const handleOpenSettings = async () => {
    try {
      const platform = Capacitor.getPlatform();
      if (platform === 'android') {
        await NativeSettings.openAndroid({
          option: AndroidSettings.ApplicationDetails,
        });
      } else if (platform === 'ios') {
        await NativeSettings.openIOS({
          option: IOSSettings.App,
        });
      }
    } catch (error) {
      console.error('[ActiveSession] Failed to open settings:', error);
    }
  };

  // Determine what to show in map area
  const showMap = !useStepsOnly && gpsInitialized && hasGpsPermission && currentPosition && !isAcquiringGPS;
  const showPlaceholder = useStepsOnly || (!showMap && !isAcquiringGPS && (gpsError || !hasGpsPermission));
  const showLoadingOverlay = isAcquiringGPS && !useStepsOnly;
  const showErrorOverlay = !isAcquiringGPS && gpsError && !useStepsOnly && !currentPosition;
  const gpsUnavailable = useStepsOnly || (gpsInitialized && (!hasGpsPermission || !!gpsError));

  return (
    <div className="h-screen flex flex-col">
      {/* Header with safe area */}
      <motion.header
        className="flex-shrink-0 flex items-center gap-4 px-4 pb-4 header-safe"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-secondary/80 transition-smooth touch-target press-scale"
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

      {/* Map Area - fills remaining space */}
      <motion.div
        className="flex-1 mx-4 rounded-xl overflow-hidden bg-secondary/50 relative min-h-0"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        {showMap ? (
          <LiveMap
            currentPosition={currentPosition}
            routePoints={routePoints}
            isTracking={isGpsTracking}
            gpsAccuracy={gpsAccuracy}
            sessionSteps={sessionSteps}
            sessionDistance={stepBasedDistance}
          />
        ) : (
          <MapPlaceholder
            message={gpsUnavailable ? "GPS unavailable - using step distance" : "Waiting for GPS..."}
            sessionSteps={sessionSteps}
            sessionDistance={stepBasedDistance}
            showStepsFallback={gpsUnavailable}
          />
        )}

        {/* GPS Acquiring Overlay */}
        <AnimatePresence>
          {showLoadingOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-overlay flex flex-col items-center justify-center bg-background/95 backdrop-blur-md"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="mb-6"
              >
                <Satellite className="h-16 w-16 text-primary" />
              </motion.div>

              <h3 className="text-lg font-bold uppercase tracking-widest text-foreground mb-2">
                Acquiring GPS Signal
              </h3>
              <p className="text-sm text-muted-foreground text-center px-8 mb-4">
                This may take up to 30 seconds. Make sure you're near a window or outdoors for best results.
              </p>

              {gpsAccuracy && (
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-medium text-primary">
                    Signal strength: {Math.round(gpsAccuracy)}m
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Searching for satellites...</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="mt-8 border-border/50 press-scale"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GPS Error Overlay */}
        <AnimatePresence>
          {showErrorOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-overlay flex flex-col items-center justify-center bg-background/95 backdrop-blur-md"
            >
              <div className="mb-6 p-4 rounded-full bg-destructive/20">
                <Satellite className="h-12 w-12 text-destructive" />
              </div>

              <h3 className="text-lg font-bold uppercase tracking-widest text-foreground mb-2">
                GPS Signal Not Available
              </h3>
              <p className="text-sm text-muted-foreground text-center px-8 mb-6">
                {gpsError || "Please check your location settings and try again"}
              </p>

              <div className="flex flex-col gap-3 w-48">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleRetryGPS}
                  className="w-full press-scale"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenSettings}
                  className="w-full border-border/50 press-scale"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Open Settings
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUseStepsOnly}
                  className="w-full text-muted-foreground press-scale"
                >
                  <Footprints className="h-4 w-4 mr-2" />
                  Use Steps Only
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Compact Stats Panel */}
      <motion.div
        className="px-4 py-3 flex-shrink-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="tactical-card relative overflow-hidden py-3">
          {/* Background pulse when running */}
          {isRunning && (
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent animate-pulse pointer-events-none" />
          )}

          {/* Duration - Compact */}
          <div className="mb-3 text-center relative z-10">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Duration
            </span>
            <motion.div
              className="text-4xl font-bold tracking-tight text-foreground tabular-nums"
              style={{ textShadow: isRunning ? '0 0 30px hsl(186 100% 50% / 0.3)' : 'none' }}
              key={duration}
              animate={isRunning ? { scale: [1, 1.01, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {formatTime(duration)}
            </motion.div>
          </div>

          {/* Main stats row - Compact */}
          <div className="grid grid-cols-4 gap-2 border-t border-border/40 pt-3 relative z-10">
            <div className="flex flex-col items-center gap-1">
              <div className={`p-1 rounded-lg ${usingGps ? 'bg-primary/15' : 'bg-muted/30'}`}>
                <MapPin className={`h-3.5 w-3.5 ${usingGps ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <span className="text-xl font-bold text-foreground tabular-nums">{sessionData.distance}</span>
              <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
                KM {usingGps ? '(GPS)' : '(est)'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="p-1 rounded-lg bg-primary/15">
                <Gauge className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground tabular-nums">{sessionData.pace}</span>
              <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">Pace /km</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="p-1 rounded-lg bg-primary/15">
                <Zap className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground tabular-nums">{sessionData.speed}</span>
              <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">km/h</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="p-1 rounded-lg bg-primary/15">
                <Footprints className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground tabular-nums">{sessionData.steps}</span>
              <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">Steps</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom Buttons with safe area */}
      <div className="px-4 safe-area-pb space-y-2 pb-3 flex-shrink-0">
        {/* Audiobook Button */}
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            variant="tactical"
            size="full"
            onClick={() => isAudioPlaying ? togglePlay() : setIsPlayerOpen(true)}
            disabled={allChaptersComplete}
            className="h-12 text-xs font-bold uppercase tracking-widest shadow-glow-sm hover:shadow-glow-md transition-all"
          >
            <Headphones className="mr-2 h-4 w-4" />
            {getButtonText()}
          </Button>
        </motion.div>

        {/* Stop Button */}
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            variant="tacticalStop"
            size="full"
            onClick={handleStop}
            className="h-12 text-xs font-bold uppercase tracking-widest shadow-[0_0_20px_hsl(0_85%_55%_/_0.3)] hover:shadow-[0_0_30px_hsl(0_85%_55%_/_0.4)] transition-all"
          >
            <Square className="mr-2 h-4 w-4 fill-current" />
            Stop / Finish
          </Button>
        </motion.div>
      </div>

      {/* Audiobook Mini Player */}
      <AudiobookPlayer
        isOpen={isPlayerOpen}
        onClose={() => setIsPlayerOpen(false)}
      />
    </div>
  );
};

export default ActiveSession;
