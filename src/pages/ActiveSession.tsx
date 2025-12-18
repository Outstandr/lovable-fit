import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Gauge, Square, Zap, Footprints, Satellite, RefreshCw, Settings, X, Loader2, Headphones, Trophy, Camera, Share2, Check, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePedometer } from "@/hooks/usePedometer";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LiveMap from "@/components/LiveMap";
import MapPlaceholder from "@/components/MapPlaceholder";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import { Capacitor } from "@capacitor/core";
import AudiobookPlayer from "@/components/AudiobookPlayer";
import { useAudiobook } from "@/hooks/useAudiobook";
import { haptics } from "@/utils/haptics";
import { format } from "date-fns";

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
  const [showSummary, setShowSummary] = useState(false);
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Start GPS tracking when component mounts
  useEffect(() => {
    const initGps = async () => {
      await startTracking();
      setGpsInitialized(true);
    };
    initGps();
    return () => stopTracking();
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
    setSessionEndTime(new Date());
    
    if (!user) {
      toast.error("Not logged in");
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
        toast.error("Failed to save session");
      }
    } catch (error) {
      console.error('[ActiveSession] Error:', error);
    }

    // Show summary screen instead of navigating home
    setShowSummary(true);
  };

  const handleSummaryClose = () => {
    setShowSummary(false);
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

  const handleOpenSettings = () => {
    if (Capacitor.isNativePlatform()) {
      toast.info("Please open your device Settings > Location to enable GPS");
    }
  };

  // Handle save button click - native support via dynamic imports
  const handleSaveScreenshot = async () => {
    setIsSaving(true);
    haptics.medium();
    try {
      const mapElement = document.getElementById('session-summary-map');
      if (!mapElement) {
        toast.error("Could not capture route");
        return;
      }
      
      // Dynamic import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        backgroundColor: '#0A1128',
        scale: 2,
      });
      const imageBase64 = canvas.toDataURL('image/png');
      const fileName = `hotstepper-route-${Date.now()}.png`;

      if (Capacitor.isNativePlatform()) {
        try {
          // Step 1: Save base64 to temp file first
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          const base64Data = imageBase64.replace(/^data:image\/png;base64,/, '');
          
          const tempFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });
          
          // Step 2: Get or create Hotstepper album
          const { Media } = await import('@capacitor-community/media');
          let albumIdentifier: string | undefined;
          
          try {
            const { albums } = await Media.getAlbums();
            console.log('[Save] Available albums:', albums);
            const hotstepperAlbum = albums.find(a => a.name === 'Hotstepper');
            
            if (hotstepperAlbum) {
              albumIdentifier = hotstepperAlbum.identifier;
              console.log('[Save] Found existing Hotstepper album:', albumIdentifier);
            } else {
              // Create the album if it doesn't exist
              console.log('[Save] Creating Hotstepper album...');
              await Media.createAlbum({ name: 'Hotstepper' });
              
              // Fetch albums again to get the identifier
              const { albums: updatedAlbums } = await Media.getAlbums();
              const newAlbum = updatedAlbums.find(a => a.name === 'Hotstepper');
              albumIdentifier = newAlbum?.identifier;
              console.log('[Save] Created Hotstepper album:', albumIdentifier);
            }
          } catch (albumErr) {
            console.log('[Save] Album handling failed, saving to default:', albumErr);
          }
          
          // Step 3: Save to gallery using proper album identifier
          await Media.savePhoto({
            path: tempFile.uri,
            albumIdentifier: albumIdentifier,
          });
          
          // Step 4: Clean up temp file
          try {
            await Filesystem.deleteFile({
              path: fileName,
              directory: Directory.Cache,
            });
          } catch (cleanupErr) {
            // Ignore cleanup errors
          }
          
          toast.success("Route saved to Gallery! 📸");
        } catch (err) {
          console.error('[Save] Gallery save failed:', err);
          toast.error("Could not save to gallery");
        }
      } else {
        // Web fallback - download
        const link = document.createElement('a');
        link.href = imageBase64;
        link.download = fileName;
        link.click();
        toast.success("Route downloaded! 📸");
      }
    } catch (err) {
      console.error('[Save] Error:', err);
      toast.error("Failed to save screenshot");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle share button click - captures screenshot of summary and shares as image
  const handleShareSession = async () => {
    setIsSharing(true);
    haptics.light();
    try {
      // Capture the entire summary content
      const summaryElement = document.getElementById('session-summary-content');
      if (!summaryElement) {
        toast.error("Could not capture session");
        setIsSharing(false);
        return;
      }
      
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(summaryElement, {
        useCORS: true,
        backgroundColor: '#0A1128',
        scale: 2,
      });
      
      // Add HOTSTEPPER watermark to the canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const watermarkText = 'HOTSTEPPER';
        const fontSize = Math.round(canvas.width * 0.04); // 4% of width
        ctx.font = `bold ${fontSize}px Rajdhani, sans-serif`;
        ctx.letterSpacing = '0.2em';
        
        // Position at bottom right with padding
        const padding = Math.round(canvas.width * 0.03);
        const textMetrics = ctx.measureText(watermarkText);
        const x = canvas.width - textMetrics.width - padding;
        const y = canvas.height - padding;
        
        // Add subtle shadow for visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Draw text with cyan primary color
        ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
        ctx.fillText(watermarkText, x, y);
      }
      
      const imageBase64 = canvas.toDataURL('image/png');
      const fileName = `hotstepper-session-${Date.now()}.png`;

      if (Capacitor.isNativePlatform()) {
        // Save to temp file and share the image
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const base64Data = imageBase64.replace(/^data:image\/png;base64,/, '');
        
        const tempFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });
        
        const { Share } = await import('@capacitor/share');
        await Share.share({
          title: 'My Hotstepper Session',
          url: tempFile.uri,
          dialogTitle: 'Share your session',
        });
        
        // Cleanup temp file after share
        try {
          await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache });
        } catch (e) {
          // Ignore cleanup errors
        }
      } else {
        // Web fallback - download
        const link = document.createElement('a');
        link.href = imageBase64;
        link.download = fileName;
        link.click();
        toast.success('Session screenshot downloaded!');
      }
    } catch (err) {
      console.error('[Share] Error:', err);
      toast.error("Failed to share session");
    } finally {
      setIsSharing(false);
    }
  };

  // Determine what to show in map area
  const showMap = !useStepsOnly && gpsInitialized && hasGpsPermission && currentPosition && !isAcquiringGPS;
  const showPlaceholder = useStepsOnly || (!showMap && !isAcquiringGPS && (gpsError || !hasGpsPermission));
  const showLoadingOverlay = isAcquiringGPS && !useStepsOnly;
  const showErrorOverlay = !isAcquiringGPS && gpsError && !useStepsOnly && !currentPosition;
  const gpsUnavailable = useStepsOnly || (gpsInitialized && (!hasGpsPermission || !!gpsError));

  return (
    <div className="min-h-screen-safe flex flex-col">
      {/* Header with safe area */}
      <motion.header 
        className="flex items-center gap-4 px-4 pb-4 header-safe"
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

      {/* Map Area */}
      <motion.div 
        className="flex-1 mx-4 rounded-xl overflow-hidden bg-secondary/50 relative min-h-[300px]"
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
            <div className="text-5xl font-bold tracking-tight text-foreground tabular-nums">
              {formatTime(duration)}
            </div>
          </div>

          {/* Main stats row */}
          <div className="grid grid-cols-4 gap-2 border-t border-border/50 pt-4">
            <div className="flex flex-col items-center gap-1">
              <MapPin className={`h-5 w-5 ${usingGps ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-2xl font-bold text-foreground tabular-nums">{sessionData.distance}</span>
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                KM {usingGps ? '(GPS)' : '(est)'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Gauge className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground tabular-nums">{sessionData.pace}</span>
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Pace /km</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground tabular-nums">{sessionData.speed}</span>
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">km/h</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Footprints className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground tabular-nums">{sessionData.steps}</span>
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Steps</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom Buttons with safe area */}
      <div className="px-4 safe-area-pb space-y-3 pb-4">
        {/* Audiobook Button */}
        <Button 
          variant="tactical"
          size="full"
          onClick={() => isAudioPlaying ? togglePlay() : setIsPlayerOpen(true)}
          disabled={allChaptersComplete}
          className="h-14 text-sm font-bold uppercase tracking-widest press-scale"
        >
          <Headphones className="mr-2 h-5 w-5" />
          {getButtonText()}
        </Button>

        {/* Stop Button */}
        <Button 
          variant="tacticalStop" 
          size="full"
          onClick={handleStop}
          className="h-14 text-sm font-bold uppercase tracking-widest press-scale"
        >
          <Square className="mr-2 h-5 w-5 fill-current" />
          Stop / Finish
        </Button>
      </div>

      {/* Audiobook Mini Player */}
      <AudiobookPlayer 
        isOpen={isPlayerOpen}
        onClose={() => setIsPlayerOpen(false)}
      />

      {/* Session Summary Screen - Inline Implementation */}
      {showSummary && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-modal bg-background flex flex-col">
          {/* Fixed Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center py-4 safe-area-pt flex-shrink-0">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 200 }} className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/20 mb-3">
              <Trophy className="h-7 w-7 text-primary" />
            </motion.div>
            <h1 className="text-xl font-bold uppercase tracking-widest text-foreground">Session Complete</h1>
            <p className="text-sm text-muted-foreground mt-1">Great work! 🔥</p>
          </motion.div>

          {/* Scrollable Content Area */}
          <div id="session-summary-content" className="flex-1 overflow-y-auto px-4 bg-background">
            <motion.div id="session-summary-map" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="rounded-xl overflow-hidden bg-secondary/50 relative aspect-video max-h-[200px]">
              {currentPosition ? (
                <LiveMap 
                  currentPosition={currentPosition} 
                  routePoints={routePoints.length > 1 ? routePoints : [{ latitude: currentPosition.latitude, longitude: currentPosition.longitude, timestamp: Date.now(), accuracy: gpsAccuracy || undefined }]} 
                  isTracking={false} 
                  gpsAccuracy={null} 
                />
              ) : (
                <MapPlaceholder message="Steps-only session" sessionSteps={sessionSteps} sessionDistance={parseFloat(sessionData.distance)} showStepsFallback />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent pointer-events-none" />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="py-4">
              <div className="tactical-card">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20"><Clock className="h-4 w-4 text-primary" /></div>
                    <div><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Duration</span><p className="text-lg font-bold text-foreground tabular-nums">{formatTime(duration)}</p></div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20"><MapPin className="h-4 w-4 text-primary" /></div>
                    <div><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Distance</span><p className="text-lg font-bold text-foreground tabular-nums">{sessionData.distance} km</p></div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20"><Gauge className="h-4 w-4 text-primary" /></div>
                    <div><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pace</span><p className="text-lg font-bold text-foreground tabular-nums">{sessionData.pace}/km</p></div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20"><Footprints className="h-4 w-4 text-primary" /></div>
                    <div><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Steps</span><p className="text-lg font-bold text-foreground tabular-nums">{sessionSteps.toLocaleString()}</p></div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" /><span className="text-xs">{format(sessionEndTime || new Date(), 'MMM d, yyyy')} at {format(sessionEndTime || new Date(), 'h:mm a')}</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Fixed Bottom Buttons */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="px-4 safe-area-pb pb-4 flex-shrink-0 bg-background">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Button 
                variant="tactical" 
                disabled={isSaving} 
                className="h-12 press-scale" 
                onClick={handleSaveScreenshot}
              >
                {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Camera className="h-5 w-5 mr-2" />}
                <span className="text-sm font-bold uppercase tracking-wider">{isSaving ? 'Saving...' : 'Save'}</span>
              </Button>
              <Button 
                variant="tactical" 
                disabled={isSharing} 
                className="h-12 press-scale" 
                onClick={handleShareSession}
              >
                {isSharing ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Share2 className="h-5 w-5 mr-2" />}
                <span className="text-sm font-bold uppercase tracking-wider">{isSharing ? 'Sharing...' : 'Share'}</span>
              </Button>
            </div>
            <Button variant="default" size="full" onClick={handleSummaryClose} className="h-12 text-sm font-bold uppercase tracking-widest press-scale">
              <Check className="h-5 w-5 mr-2" />Done - Go Home
            </Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ActiveSession;
