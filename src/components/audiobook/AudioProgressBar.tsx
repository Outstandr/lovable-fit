import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAudiobookContext, Bookmark } from "@/contexts/AudiobookContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AudioProgressBarProps {
  className?: string;
  showBookmarks?: boolean;
}

const AudioProgressBar = ({ className = "", showBookmarks = true }: AudioProgressBarProps) => {
  const {
    currentTime,
    duration,
    currentChapter,
    bookmarks,
    seekTo,
    formatTime,
  } = useAudiobookContext();

  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [showTimeTooltip, setShowTimeTooltip] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayProgress = isDragging ? (dragTime / duration) * 100 : progress;
  const displayTime = isDragging ? dragTime : currentTime;

  const chapterBookmarks = currentChapter
    ? bookmarks.filter(b => b.chapter_id === currentChapter.id)
    : [];

  const getTimeFromPosition = useCallback((clientX: number): number => {
    if (!trackRef.current || duration <= 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    return percent * duration;
  }, [duration]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (duration <= 0) return;
    
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    const time = getTimeFromPosition(e.clientX);
    setDragTime(time);
    setIsDragging(true);
    setShowTimeTooltip(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const time = getTimeFromPosition(e.clientX);
    setDragTime(time);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    const time = getTimeFromPosition(e.clientX);
    seekTo(time);
    setIsDragging(false);
    setShowTimeTooltip(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging || duration <= 0) return;
    const time = getTimeFromPosition(e.clientX);
    seekTo(time);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Track container with touch area */}
      <div
        ref={trackRef}
        className="relative h-8 flex items-center cursor-pointer touch-none select-none"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Background track */}
        <div className="absolute left-0 right-0 h-1.5 bg-secondary rounded-full overflow-hidden">
          {/* Progress fill */}
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-cyan-glow"
            style={{ width: `${displayProgress}%` }}
            transition={isDragging ? { duration: 0 } : { duration: 0.1 }}
          />
        </div>

        {/* Bookmark markers */}
        {showBookmarks && chapterBookmarks.map((bookmark) => {
          const position = duration > 0 ? (bookmark.timestamp_seconds / duration) * 100 : 0;
          return (
            <Tooltip key={bookmark.id}>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-3 w-3 -ml-1.5 cursor-pointer z-10"
                  style={{ left: `${position}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    seekTo(bookmark.timestamp_seconds);
                  }}
                >
                  <div className="h-full w-full rounded-full bg-primary border-2 border-background shadow-sm" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-medium">{formatTime(bookmark.timestamp_seconds)}</p>
                {bookmark.label && <p className="text-muted-foreground">{bookmark.label}</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Thumb */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 -ml-2.5 h-5 w-5 rounded-full bg-primary border-2 border-background shadow-lg pointer-events-none"
          style={{ left: `${displayProgress}%` }}
          animate={isDragging ? { scale: 1.3 } : { scale: 1 }}
          transition={{ duration: 0.1 }}
        />

        {/* Time tooltip while dragging */}
        {showTimeTooltip && (
          <motion.div
            className="absolute -top-8 -ml-6 px-2 py-1 bg-secondary border border-border rounded-md text-xs font-medium tabular-nums"
            style={{ left: `${displayProgress}%` }}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {formatTime(displayTime)}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AudioProgressBar;
