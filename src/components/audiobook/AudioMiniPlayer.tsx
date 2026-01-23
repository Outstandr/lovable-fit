import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Headphones } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAudiobookContext } from "@/contexts/AudiobookContext";
import { haptics } from "@/utils/haptics";

const AudioMiniPlayer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isPlaying,
    currentChapter,
    currentTime,
    duration,
    togglePlay,
    isMiniPlayerVisible,
    wasRecentlyPlaying,
  } = useAudiobookContext();

  // Don't show on audiobook page
  const isOnAudiobookPage = location.pathname === '/audiobook';
  
  // Show if playing, or was recently playing (keeps mini player visible when paused)
  const shouldShow = !isOnAudiobookPage && isMiniPlayerVisible && (isPlaying || wasRecentlyPlaying) && currentChapter;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleTap = () => {
    haptics.light();
    navigate('/audiobook');
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.medium();
    togglePlay();
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed z-40"
          style={{
            bottom: 'calc(var(--bottom-nav-height, 56px) + max(env(safe-area-inset-bottom, 0px), 16px))',
            left: '8px',
            right: '8px',
          }}
        >
          <div
            onClick={handleTap}
            className="relative bg-secondary/95 backdrop-blur-lg border border-primary/20 rounded-xl overflow-hidden cursor-pointer shadow-lg"
            style={{ boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)' }}
          >
            {/* Progress line at top */}
            <div className="h-0.5 bg-secondary">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-cyan-glow"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>

            <div className="flex items-center gap-3 p-3">
              {/* Album art / icon */}
              <div className="relative h-10 w-10 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                <Headphones className="h-5 w-5 text-primary" />
                {isPlaying && (
                  <motion.div
                    className="absolute inset-0 rounded-lg border border-primary/50"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>

              {/* Chapter info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {currentChapter?.title || "Audiobook"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentChapter?.subtitle || "The Manual"}
                </p>
              </div>

              {/* Play/Pause button */}
              <motion.button
                onClick={handlePlayPause}
                className="h-10 w-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground flex-shrink-0"
                whileTap={{ scale: 0.9 }}
                style={{ boxShadow: '0 2px 10px hsl(186, 100%, 50%, 0.3)' }}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AudioMiniPlayer;
