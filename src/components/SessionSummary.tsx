import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  MapPin, 
  Clock, 
  Gauge, 
  Footprints, 
  Camera, 
  Share2, 
  Check,
  Loader2,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureMapAsImage, saveToGallery, shareRoute, SessionStats } from '@/utils/routeCapture';
import { haptics } from '@/utils/haptics';
import { format } from 'date-fns';
import LiveMap from './LiveMap';
import MapPlaceholder from './MapPlaceholder';

// Define LocationPoint locally to avoid circular imports
interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

interface SessionSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData: {
    distance: string;
    duration: string;
    pace: string;
    steps: number;
    speed: string;
  };
  routePoints: LocationPoint[];
  currentPosition: { latitude: number; longitude: number } | null;
  sessionDate: Date;
}

const SessionSummary = ({
  isOpen,
  onClose,
  sessionData,
  routePoints,
  currentPosition,
  sessionDate
}: SessionSummaryProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [savedImage, setSavedImage] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [hasShared, setHasShared] = useState(false);

  const hasRoute = routePoints.length > 1;

  // Pre-capture map image when component opens
  useEffect(() => {
    if (isOpen && hasRoute && mapRef.current && !savedImage) {
      const captureTimeout = setTimeout(async () => {
        const image = await captureMapAsImage(mapRef.current!);
        if (image) {
          setSavedImage(image);
        }
      }, 1000); // Wait for map to fully render

      return () => clearTimeout(captureTimeout);
    }
  }, [isOpen, hasRoute, savedImage]);

  const handleSaveToPhotos = async () => {
    haptics.medium();
    setIsSaving(true);

    try {
      let imageToSave = savedImage;
      
      // If we don't have a cached image, capture now
      if (!imageToSave && mapRef.current) {
        imageToSave = await captureMapAsImage(mapRef.current);
      }

      if (imageToSave) {
        const success = await saveToGallery(imageToSave);
        if (success) {
          setHasSaved(true);
          haptics.success();
        }
      } else {
        // No map image, create a stats-only image (for steps-only mode)
        // For now, just show a toast
        const { toast } = await import('sonner');
        toast.info('No route to save - session used step tracking only');
      }
    } catch (error) {
      console.error('[SessionSummary] Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    haptics.medium();
    setIsSharing(true);

    try {
      let imageToShare = savedImage;
      
      if (!imageToShare && mapRef.current) {
        imageToShare = await captureMapAsImage(mapRef.current);
      }

      const stats: SessionStats = {
        distance: sessionData.distance,
        duration: sessionData.duration,
        pace: sessionData.pace,
        steps: sessionData.steps,
        date: sessionDate
      };

      if (imageToShare) {
        const success = await shareRoute(imageToShare, stats);
        if (success) {
          setHasShared(true);
        }
      } else {
        // Share without image
        const success = await shareRoute('', stats);
        if (success) {
          setHasShared(true);
        }
      }
    } catch (error) {
      console.error('[SessionSummary] Share error:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDone = () => {
    haptics.light();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-modal bg-background"
      >
        <div className="min-h-screen-safe flex flex-col">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center py-6 safe-area-pt"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/20 mb-4"
            >
              <Trophy className="h-8 w-8 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-bold uppercase tracking-widest text-foreground">
              Session Complete
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Great work! 🔥</p>
          </motion.div>

          {/* Map Preview */}
          <motion.div
            ref={mapRef}
            data-capture="map"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="mx-4 rounded-xl overflow-hidden bg-secondary/50 relative aspect-video max-h-[250px]"
          >
            {hasRoute && currentPosition ? (
              <LiveMap
                currentPosition={currentPosition}
                routePoints={routePoints}
                isTracking={false}
                gpsAccuracy={null}
              />
            ) : (
              <MapPlaceholder
                message="Steps-only session"
                sessionSteps={sessionData.steps}
                sessionDistance={parseFloat(sessionData.distance)}
                showStepsFallback={true}
              />
            )}
            
            {/* Overlay gradient for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent pointer-events-none" />
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="px-4 py-6"
          >
            <div className="tactical-card">
              <div className="grid grid-cols-2 gap-4">
                {/* Duration */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Duration
                    </span>
                    <p className="text-xl font-bold text-foreground tabular-nums">
                      {sessionData.duration}
                    </p>
                  </div>
                </div>

                {/* Distance */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Distance
                    </span>
                    <p className="text-xl font-bold text-foreground tabular-nums">
                      {sessionData.distance} km
                    </p>
                  </div>
                </div>

                {/* Pace */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <Gauge className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Pace
                    </span>
                    <p className="text-xl font-bold text-foreground tabular-nums">
                      {sessionData.pace}/km
                    </p>
                  </div>
                </div>

                {/* Steps */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <Footprints className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Steps
                    </span>
                    <p className="text-xl font-bold text-foreground tabular-nums">
                      {sessionData.steps.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Date/Time */}
              <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  {format(sessionDate, 'MMM d, yyyy')} at {format(sessionDate, 'h:mm a')}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="px-4 mt-auto"
          >
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Save to Photos */}
              <Button
                variant="tactical"
                onClick={handleSaveToPhotos}
                disabled={isSaving || !hasRoute}
                className="h-14 press-scale"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : hasSaved ? (
                  <Check className="h-5 w-5 mr-2 text-green-400" />
                ) : (
                  <Camera className="h-5 w-5 mr-2" />
                )}
                <span className="text-sm font-bold uppercase tracking-wider">
                  {hasSaved ? 'Saved!' : 'Save'}
                </span>
              </Button>

              {/* Share */}
              <Button
                variant="tactical"
                onClick={handleShare}
                disabled={isSharing}
                className="h-14 press-scale"
              >
                {isSharing ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : hasShared ? (
                  <Check className="h-5 w-5 mr-2 text-green-400" />
                ) : (
                  <Share2 className="h-5 w-5 mr-2" />
                )}
                <span className="text-sm font-bold uppercase tracking-wider">
                  {hasShared ? 'Shared!' : 'Share'}
                </span>
              </Button>
            </div>

            {/* Done Button */}
            <Button
              variant="default"
              size="full"
              onClick={handleDone}
              className="h-14 text-sm font-bold uppercase tracking-widest press-scale mb-4 safe-area-pb"
            >
              <Check className="h-5 w-5 mr-2" />
              Done - Go Home
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SessionSummary;
