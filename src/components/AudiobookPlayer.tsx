import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, X, Headphones, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { useAudiobook } from "@/hooks/useAudiobook";

interface AudiobookPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

const AudiobookPlayer = ({ isOpen, onClose }: AudiobookPlayerProps) => {
  const {
    isPlaying,
    currentChapter,
    currentTime,
    duration,
    isLoading,
    togglePlay,
    skipForward,
    skipBackward,
    seekTo,
    formatTime,
  } = useAudiobook();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (value: number[]) => {
    if (duration > 0) {
      const newTime = (value[0] / 100) * duration;
      seekTo(newTime);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-secondary border-t border-border/50">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Headphones className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DrawerTitle className="text-left text-base font-bold text-foreground">
                  {currentChapter?.title || "Audiobook"}
                </DrawerTitle>
                <p className="text-xs text-muted-foreground">
                  {currentChapter?.subtitle || "Select a chapter to begin"}
                </p>
              </div>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Slider
              value={[progress]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={skipBackward}
              className="h-12 w-12 rounded-full"
            >
              <SkipBack className="h-5 w-5" />
              <span className="sr-only">Skip back 15 seconds</span>
            </Button>

            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="default"
                size="icon"
                onClick={togglePlay}
                disabled={isLoading}
                className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30"
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7 fill-current" />
                ) : (
                  <Play className="h-7 w-7 fill-current ml-1" />
                )}
                <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
              </Button>
            </motion.div>

            <Button
              variant="ghost"
              size="icon"
              onClick={skipForward}
              className="h-12 w-12 rounded-full"
            >
              <SkipForward className="h-5 w-5" />
              <span className="sr-only">Skip forward 15 seconds</span>
            </Button>
          </div>

          {/* Audio indicator */}
          {isPlaying && (
            <motion.div 
              className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Volume2 className="h-3 w-3 text-primary animate-pulse" />
              <span>Audio playing in background</span>
            </motion.div>
          )}

          {/* Close hint */}
          <p className="text-center text-xs text-muted-foreground">
            Close to continue tracking • Audio keeps playing
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AudiobookPlayer;
