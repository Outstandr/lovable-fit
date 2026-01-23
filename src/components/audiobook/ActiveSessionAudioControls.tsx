import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAudiobookContext } from "@/contexts/AudiobookContext";
import { haptics } from "@/utils/haptics";

const ActiveSessionAudioControls = () => {
  const navigate = useNavigate();
  const {
    isPlaying,
    currentChapter,
    currentTime,
    duration,
    togglePlay,
    skipForward,
    skipBackward,
    formatTime,
  } = useAudiobookContext();

  // Get skip intervals from localStorage (same source as context)
  const skipBack = parseInt(localStorage.getItem('audiobook_skip_back') || '15', 10);
  const skipForwardInterval = parseInt(localStorage.getItem('audiobook_skip_forward') || '30', 10);

  // Don't render if no chapter is loaded
  if (!currentChapter) {
    return null;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.medium();
    togglePlay();
  };

  const handleSkipBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.light();
    skipBackward();
  };

  const handleSkipForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.light();
    skipForward();
  };

  const handleNavigateToAudiobook = () => {
    haptics.light();
    navigate('/audiobook');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="tactical-card p-3 cursor-pointer"
      onClick={handleNavigateToAudiobook}
    >
      {/* Progress bar - thin line at top */}
      <div className="h-1 bg-secondary rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-cyan-glow"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Chapter info row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0 mr-3">
          <p className="text-xs font-semibold text-foreground truncate">
            {currentChapter.title}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {currentChapter.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="text-[10px] font-medium tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-center gap-6">
        {/* Skip Back */}
        <motion.button
          onClick={handleSkipBack}
          className="relative h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          whileTap={{ scale: 0.9 }}
        >
          <SkipBack className="h-5 w-5" />
          <span className="absolute -bottom-1 text-[8px] font-bold text-muted-foreground">
            {skipBack}
          </span>
        </motion.button>

        {/* Play/Pause */}
        <motion.button
          onClick={handlePlayPause}
          className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-glow-sm"
          whileTap={{ scale: 0.9 }}
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-0.5" />
          )}
        </motion.button>

        {/* Skip Forward */}
        <motion.button
          onClick={handleSkipForward}
          className="relative h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          whileTap={{ scale: 0.9 }}
        >
          <SkipForward className="h-5 w-5" />
          <span className="absolute -bottom-1 text-[8px] font-bold text-muted-foreground">
            {skipForwardInterval}
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ActiveSessionAudioControls;
