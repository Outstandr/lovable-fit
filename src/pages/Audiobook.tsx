import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Play, Pause, SkipBack, SkipForward, 
  Check, Headphones, Volume2, Bookmark, Trash2,
  Moon, Gauge, Settings2
} from "lucide-react";

import { BottomNav } from "@/components/BottomNav";
import { useAudiobookContext } from "@/contexts/AudiobookContext";
import { haptics } from '@/utils/haptics';
import { Progress } from "@/components/ui/progress";
import { RubberBandScroll } from "@/components/ui/RubberBandScroll";
import AudioProgressBar from "@/components/audiobook/AudioProgressBar";
import SleepTimerSheet from "@/components/audiobook/SleepTimerSheet";
import SpeedSelectorSheet from "@/components/audiobook/SpeedSelectorSheet";
import SkipIntervalSelector from "@/components/audiobook/SkipIntervalSelector";

const Audiobook = () => {
  const {
    isPlaying,
    currentChapter,
    currentTime,
    duration,
    isLoading,
    playbackSpeed,
    bookmarks,
    chapters,
    sleepTimer,
    skipBackInterval,
    skipForwardInterval,
    togglePlay,
    skipForward,
    skipBackward,
    loadChapter,
    formatTime,
    addBookmark,
    removeBookmark,
    seekToBookmark,
    getBookmarksForChapter,
    getRemainingTime,
    getOverallProgress,
  } = useAudiobookContext();

  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [showSpeedSelector, setShowSpeedSelector] = useState(false);
  const [showSkipSettings, setShowSkipSettings] = useState(false);

  const getChapterProgress = (chapterId: number) => {
    if (currentChapter?.id === chapterId && duration > 0) {
      return (currentTime / duration) * 100;
    }
    const saved = localStorage.getItem('audiobook_progress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const savedTime = parsed[chapterId.toString()];
        const chapter = chapters.find(c => c.id === chapterId);
        if (savedTime && chapter) {
          return (savedTime / chapter.duration) * 100;
        }
      } catch (e) {}
    }
    return 0;
  };

  const isChapterComplete = (chapterId: number) => {
    return getChapterProgress(chapterId) >= 90;
  };

  const remainingTime = getRemainingTime();
  const overallProgress = getOverallProgress();

  return (
    <div className="h-screen flex flex-col page-with-bottom-nav relative bg-background">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at top center, hsl(186, 100%, 50%, 0.05), transparent 60%)'
      }} />

      {/* Header */}
      <motion.header 
        className="px-4 pb-4 header-safe flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-gradient-cyan animate-glow-pulse">
          Audiobook
        </h1>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
          The Manual • {chapters.length} Chapters • {Math.round(overallProgress)}% complete
        </p>
      </motion.header>

      <RubberBandScroll className="flex-1 overflow-y-auto">
        <div className="px-4">
          {/* Now Playing Card */}
          <motion.div
            className="tactical-card mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Album Art */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="h-40 w-40 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                  <Headphones className="h-16 w-16 text-primary" />
                </div>
                {isPlaying && (
                  <motion.div 
                    className="absolute inset-0 rounded-2xl border-2 border-primary"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
            </div>

            {/* Chapter Info */}
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold text-foreground">
                {currentChapter?.title || "Reset Body & Diet"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {currentChapter?.subtitle || "Start listening to begin"}
              </p>
            </div>

            {/* Chapter Progress Info */}
            <div className="flex justify-center gap-4 mb-4 text-xs text-muted-foreground">
              {currentChapter && (
                <span>Chapter {currentChapter.id} of {chapters.length}</span>
              )}
              {remainingTime !== null && remainingTime > 0 && (
                <span className="tabular-nums">{formatTime(remainingTime)} remaining</span>
              )}
            </div>

            {/* Enhanced Progress Bar */}
            <div className="mb-2">
              <AudioProgressBar showBookmarks={true} />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4">
              {/* Skip Back with interval label */}
              <button
                onClick={() => {
                  haptics.light();
                  skipBackward();
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowSkipSettings(true);
                }}
                className="relative h-14 w-14 rounded-full flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-smooth touch-target"
              >
                <SkipBack className="h-6 w-6" />
                <span className="text-[10px] font-medium mt-0.5">{skipBackInterval}s</span>
              </button>

              {/* Play/Pause */}
              <button
                onClick={() => {
                  haptics.medium();
                  togglePlay();
                }}
                disabled={isLoading}
                className="h-18 w-18 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth touch-target shadow-lg"
                style={{ 
                  boxShadow: '0 4px 20px hsl(186, 100%, 50%, 0.4)',
                  height: '72px',
                  width: '72px'
                }}
              >
                {isLoading ? (
                  <div className="h-7 w-7 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8 ml-1" />
                )}
              </button>

              {/* Skip Forward with interval label */}
              <button
                onClick={() => {
                  haptics.light();
                  skipForward();
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowSkipSettings(true);
                }}
                className="relative h-14 w-14 rounded-full flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-smooth touch-target"
              >
                <SkipForward className="h-6 w-6" />
                <span className="text-[10px] font-medium mt-0.5">{skipForwardInterval}s</span>
              </button>
            </div>

            {/* Secondary Controls Row */}
            <div className="flex justify-center items-center gap-3 mt-4">
              {/* Sleep Timer */}
              <button
                onClick={() => {
                  haptics.light();
                  setShowSleepTimer(true);
                }}
                className={`relative h-10 w-10 rounded-full flex items-center justify-center transition-smooth ${
                  sleepTimer 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                }`}
                title="Sleep timer"
              >
                <Moon className="h-5 w-5" />
                {sleepTimer && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-pulse" />
                )}
              </button>

              {/* Speed Control */}
              <button
                onClick={() => {
                  haptics.light();
                  setShowSpeedSelector(true);
                }}
                className="px-4 py-2 rounded-full bg-secondary/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth flex items-center gap-2"
              >
                <Gauge className="h-4 w-4" />
                {playbackSpeed}x
              </button>
              
              {/* Bookmark */}
              <button
                onClick={() => {
                  haptics.medium();
                  addBookmark();
                }}
                disabled={!currentChapter}
                className="h-10 w-10 rounded-full flex items-center justify-center bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                title="Add bookmark at current position"
              >
                <Bookmark className="h-5 w-5" />
              </button>

              {/* Skip Settings */}
              <button
                onClick={() => {
                  haptics.light();
                  setShowSkipSettings(true);
                }}
                className="h-10 w-10 rounded-full flex items-center justify-center bg-secondary/50 text-muted-foreground hover:text-foreground transition-smooth"
                title="Skip interval settings"
              >
                <Settings2 className="h-5 w-5" />
              </button>
            </div>

            {/* Current Chapter Bookmarks */}
            {currentChapter && getBookmarksForChapter(currentChapter.id).length > 0 && (
              <motion.div 
                className="mt-4 pt-4 border-t border-border/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Bookmarks
                </h4>
                <div className="space-y-1">
                  {getBookmarksForChapter(currentChapter.id).map((bookmark) => (
                    <div 
                      key={bookmark.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-smooth"
                    >
                      <button
                        onClick={() => {
                          haptics.light();
                          seekToBookmark(bookmark);
                        }}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        <Bookmark className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium tabular-nums">
                          {formatTime(Number(bookmark.timestamp_seconds))}
                        </span>
                        {bookmark.label && (
                          <span className="text-xs text-muted-foreground truncate">
                            {bookmark.label}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          haptics.light();
                          removeBookmark(bookmark.id);
                        }}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-smooth"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Chapter List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Chapters
            </h3>
            <div className="space-y-2">
              {chapters.map((chapter, index) => {
                const progress = getChapterProgress(chapter.id);
                const isComplete = isChapterComplete(chapter.id);
                const isCurrentChapter = currentChapter?.id === chapter.id;
                
                return (
                  <motion.button
                    key={chapter.id}
                    onClick={() => {
                      haptics.light();
                      loadChapter(chapter.id, true);
                    }}
                    className={`w-full tactical-card flex items-center gap-3 text-left transition-all ${
                      isCurrentChapter ? 'border-primary/50 bg-primary/5' : ''
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Status Icon */}
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isComplete 
                        ? 'bg-green-500/20 text-green-400' 
                        : isCurrentChapter && isPlaying
                          ? 'bg-primary/20 text-primary'
                          : 'bg-secondary text-muted-foreground'
                    }`}>
                      {isComplete ? (
                        <Check className="h-5 w-5" />
                      ) : isCurrentChapter && isPlaying ? (
                        <Volume2 className="h-5 w-5" />
                      ) : (
                        <Play className="h-4 w-4 ml-0.5" />
                      )}
                    </div>

                    {/* Chapter Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${isCurrentChapter ? 'text-primary' : 'text-foreground'}`}>
                        {chapter.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {chapter.subtitle}
                      </p>
                      {progress > 0 && progress < 90 && (
                        <div className="mt-1.5">
                          <Progress value={progress} className="h-1" />
                        </div>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                      {Math.floor(chapter.duration / 60)}:{(chapter.duration % 60).toString().padStart(2, '0')}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </RubberBandScroll>

      <BottomNav />

      {/* Sheets */}
      <SleepTimerSheet isOpen={showSleepTimer} onClose={() => setShowSleepTimer(false)} />
      <SpeedSelectorSheet isOpen={showSpeedSelector} onClose={() => setShowSpeedSelector(false)} />
      <SkipIntervalSelector isOpen={showSkipSettings} onClose={() => setShowSkipSettings(false)} />
    </div>
  );
};

export default Audiobook;
