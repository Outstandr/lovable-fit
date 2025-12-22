import { motion } from "framer-motion";
import { 
  Play, Pause, SkipBack, SkipForward, 
  Check, Headphones, Volume2, Bookmark, Trash2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { useAudiobook, Bookmark as BookmarkType } from "@/hooks/useAudiobook";
import { haptics } from '@/utils/haptics';
import { Progress } from "@/components/ui/progress";
import { RubberBandScroll } from "@/components/ui/RubberBandScroll";

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
    play,
    pause,
    togglePlay,
    skipForward,
    skipBackward,
    seekTo,
    loadChapter,
    formatTime,
    cyclePlaybackSpeed,
    addBookmark,
    removeBookmark,
    seekToBookmark,
    getBookmarksForChapter,
  } = useAudiobook();

  const handleSeek = (value: number[]) => {
    if (value[0] !== undefined) {
      seekTo(value[0]);
    }
  };

  const getChapterProgress = (chapterId: number) => {
    if (currentChapter?.id === chapterId && duration > 0) {
      return (currentTime / duration) * 100;
    }
    // Check localStorage for saved progress
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

  return (
    <div className="h-screen flex flex-col page-with-bottom-nav relative bg-background">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at top center, hsl(186, 100%, 50%, 0.05), transparent 60%)'
      }} />

      {/* Header */}
      <motion.header 
        className="flex items-center gap-2 px-4 pb-4 relative z-10 header-safe flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Headphones className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-bold text-foreground">Audiobook</h1>
      </motion.header>

      <RubberBandScroll className="flex-1 overflow-y-auto" contentClassName="px-4 pb-24">
        {/* Now Playing Card */}
        <motion.div
          className="tactical-card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Album Art Placeholder */}
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
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-foreground">
              {currentChapter?.title || "Reset Body & Diet"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {currentChapter?.subtitle || "Start listening to begin"}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="relative">
              <Progress 
                value={duration > 0 ? (currentTime / duration) * 100 : 0} 
                className="h-2 cursor-pointer"
                onClick={(e) => {
                  if (duration > 0) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percent = x / rect.width;
                    seekTo(percent * duration);
                  }
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground tabular-nums">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => {
                haptics.light();
                skipBackward();
              }}
              className="h-12 w-12 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-smooth touch-target"
            >
              <SkipBack className="h-6 w-6" />
            </button>

            <button
              onClick={() => {
                haptics.medium();
                togglePlay();
              }}
              disabled={isLoading}
              className="h-16 w-16 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth touch-target shadow-lg"
              style={{ boxShadow: '0 4px 20px hsl(186, 100%, 50%, 0.4)' }}
            >
              {isLoading ? (
                <div className="h-6 w-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-7 w-7" />
              ) : (
                <Play className="h-7 w-7 ml-1" />
              )}
            </button>

            <button
              onClick={() => {
                haptics.light();
                skipForward();
              }}
              className="h-12 w-12 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-smooth touch-target"
            >
              <SkipForward className="h-6 w-6" />
            </button>
          </div>

          {/* Speed & Bookmark Controls */}
          <div className="flex justify-center items-center gap-4 mt-4">
            <button
              onClick={() => {
                haptics.light();
                cyclePlaybackSpeed();
              }}
              className="px-4 py-2 rounded-full bg-secondary/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth"
            >
              {playbackSpeed}x Speed
            </button>
            
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
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground mb-3">
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
      </RubberBandScroll>

      <BottomNav />
    </div>
  );
};

export default Audiobook;
