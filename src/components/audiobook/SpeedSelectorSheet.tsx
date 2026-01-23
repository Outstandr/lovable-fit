import { motion } from "framer-motion";
import { Gauge, X, Check } from "lucide-react";
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

interface SpeedSelectorSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const SPEED_OPTIONS = [
  { value: 0.5, label: "0.5x", description: "Slower" },
  { value: 0.75, label: "0.75x", description: "Relaxed" },
  { value: 1, label: "1x", description: "Normal" },
  { value: 1.25, label: "1.25x", description: "Faster" },
  { value: 1.5, label: "1.5x", description: "Quick" },
  { value: 1.75, label: "1.75x", description: "Rapid" },
  { value: 2, label: "2x", description: "Double" },
];

const SpeedSelectorSheet = ({ isOpen, onClose }: SpeedSelectorSheetProps) => {
  const { playbackSpeed, setPlaybackSpeed } = useAudiobookContext();

  const handleSelect = (speed: number) => {
    haptics.light();
    setPlaybackSpeed(speed);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="bg-secondary border-t border-border/50 rounded-t-2xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Gauge className="h-5 w-5 text-primary" />
              </div>
              <SheetTitle className="text-left text-lg font-bold text-foreground">
                Playback Speed
              </SheetTitle>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="space-y-2 pb-6">
          {SPEED_OPTIONS.map((option, index) => {
            const isActive = playbackSpeed === option.value;
            
            return (
              <motion.button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                  isActive
                    ? 'bg-primary/20 border-primary/50'
                    : 'bg-secondary/50 border-border/50 hover:bg-secondary hover:border-border'
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-4">
                  <span className={`text-lg font-bold tabular-nums ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {option.label}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {option.description}
                  </span>
                </div>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-6 w-6 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SpeedSelectorSheet;
