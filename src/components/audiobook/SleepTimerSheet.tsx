import { motion } from "framer-motion";
import { Moon, X, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { useAudiobookContext, SleepTimerOption } from "@/contexts/AudiobookContext";
import { haptics } from "@/utils/haptics";
import { useEffect, useState } from "react";

interface SleepTimerSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIMER_OPTIONS: { value: SleepTimerOption; label: string; icon?: React.ReactNode }[] = [
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 'end-of-chapter', label: "End of chapter", icon: <BookOpen className="h-4 w-4" /> },
];

const SleepTimerSheet = ({ isOpen, onClose }: SleepTimerSheetProps) => {
  const { sleepTimer, sleepTimerEndsAt, setSleepTimer, cancelSleepTimer } = useAudiobookContext();
  const [countdown, setCountdown] = useState<string | null>(null);

  // Update countdown display
  useEffect(() => {
    if (!sleepTimerEndsAt) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const remaining = sleepTimerEndsAt.getTime() - now.getTime();
      
      if (remaining <= 0) {
        setCountdown(null);
        return;
      }

      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEndsAt]);

  const handleSelect = (option: SleepTimerOption) => {
    haptics.medium();
    setSleepTimer(option);
    onClose();
  };

  const handleCancel = () => {
    haptics.light();
    cancelSleepTimer();
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="bg-secondary border-t border-border/50 rounded-t-2xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Moon className="h-5 w-5 text-primary" />
              </div>
              <SheetTitle className="text-left text-lg font-bold text-foreground">
                Sleep Timer
              </SheetTitle>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          {/* Active timer display */}
          {sleepTimer && (
            <motion.div
              className="p-4 rounded-xl bg-primary/10 border border-primary/30"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary animate-pulse" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Timer active</p>
                    <p className="text-xs text-muted-foreground">
                      {sleepTimer === 'end-of-chapter' 
                        ? 'Until end of chapter'
                        : countdown 
                          ? `${countdown} remaining`
                          : `${sleepTimer} minutes`
                      }
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {/* Timer options grid */}
          <div className="grid grid-cols-2 gap-2">
            {TIMER_OPTIONS.map((option, index) => {
              const isActive = sleepTimer === option.value;
              
              return (
                <motion.button
                  key={option.value?.toString() || 'eoc'}
                  onClick={() => handleSelect(option.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-secondary/50 border-border/50 text-foreground hover:bg-secondary hover:border-border'
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2">
                    {option.icon || <Moon className="h-4 w-4 opacity-50" />}
                    <span className="font-medium">{option.label}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Audio will fade out when timer ends
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SleepTimerSheet;
