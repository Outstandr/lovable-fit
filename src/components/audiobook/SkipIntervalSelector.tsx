import { motion } from "framer-motion";
import { X, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { useAudiobookContext } from "@/contexts/AudiobookContext";
import { haptics } from "@/utils/haptics";

interface SkipIntervalSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const INTERVAL_OPTIONS = [10, 15, 30] as const;

const SkipIntervalSelector = ({ isOpen, onClose }: SkipIntervalSelectorProps) => {
  const { skipBackInterval, skipForwardInterval, setSkipIntervals } = useAudiobookContext();

  const handleBackChange = (value: number) => {
    haptics.light();
    setSkipIntervals(value, skipForwardInterval);
  };

  const handleForwardChange = (value: number) => {
    haptics.light();
    setSkipIntervals(skipBackInterval, value);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="bg-secondary border-t border-border/50 rounded-t-2xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-left text-lg font-bold text-foreground">
              Skip Intervals
            </SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Skip Back */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <SkipBack className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Skip Back</span>
            </div>
            <div className="flex gap-2">
              {INTERVAL_OPTIONS.map((value) => {
                const isActive = skipBackInterval === value;
                return (
                  <motion.button
                    key={`back-${value}`}
                    onClick={() => handleBackChange(value)}
                    className={`flex-1 py-3 rounded-xl border font-medium transition-all ${
                      isActive
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'bg-secondary/50 border-border/50 text-muted-foreground hover:text-foreground'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    {value}s
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Skip Forward */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <SkipForward className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Skip Forward</span>
            </div>
            <div className="flex gap-2">
              {INTERVAL_OPTIONS.map((value) => {
                const isActive = skipForwardInterval === value;
                return (
                  <motion.button
                    key={`forward-${value}`}
                    onClick={() => handleForwardChange(value)}
                    className={`flex-1 py-3 rounded-xl border font-medium transition-all ${
                      isActive
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'bg-secondary/50 border-border/50 text-muted-foreground hover:text-foreground'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    {value}s
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SkipIntervalSelector;
