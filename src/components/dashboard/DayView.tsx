import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ProgressRing } from "@/components/ProgressRing";
import { StatsRow } from "./StatsRow";
import { TrendChart } from "./TrendChart";
import { SkeletonCard, SkeletonCircle, SkeletonText } from "@/components/ui/SkeletonCard";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getLocalDateString } from "@/lib/utils";

interface DayViewProps {
  steps: number;
  goal: number;
  calories: number;
  distance: number;
  activeMinutes: number;
  streak: number;
  weeklyTrend: { label: string; value: number }[];
  isLoading?: boolean;
}

interface DayData {
  date: Date;
  steps: number;
  calories: number;
  distance: number;
  activeMinutes: number;
  label: string;
  dateLabel: string;
}

const formatDayLabel = (date: Date, isToday: boolean): string => {
  if (isToday) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

const formatDateLabel = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const DayView = ({
  steps, goal, calories, distance, activeMinutes, streak, weeklyTrend, isLoading
}: DayViewProps) => {
  const { user } = useAuth();
  const [dayOffset, setDayOffset] = useState(0); // 0 = today, -1 = yesterday, etc.
  const [dayCache, setDayCache] = useState<Record<string, DayData>>({});
  const [direction, setDirection] = useState(0); // -1 = swipe right (prev), 1 = swipe left (next)
  const [isLoadingDay, setIsLoadingDay] = useState(false);

  const getDateForOffset = useCallback((offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  }, []);

  // Fetch data for a specific day
  const fetchDayData = useCallback(async (offset: number): Promise<DayData> => {
    const date = getDateForOffset(offset);
    const dateStr = getLocalDateString(date);
    const isToday = offset === 0;

    // For today, use live data
    if (isToday) {
      return {
        date,
        steps,
        calories,
        distance,
        activeMinutes,
        label: "Today",
        dateLabel: formatDateLabel(date),
      };
    }

    // Check cache
    if (dayCache[dateStr]) {
      return dayCache[dateStr];
    }

    // Fetch from database
    if (!user) {
      return { date, steps: 0, calories: 0, distance: 0, activeMinutes: 0, label: formatDayLabel(date, false), dateLabel: formatDateLabel(date) };
    }

    try {
      const { data } = await supabase
        .from('daily_steps')
        .select('steps, calories, distance_km, active_minutes')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .single();

      const dayData: DayData = {
        date,
        steps: data?.steps || 0,
        calories: data?.calories || 0,
        distance: data?.distance_km || 0,
        activeMinutes: data?.active_minutes || Math.floor((data?.steps || 0) / 120),
        label: formatDayLabel(date, false),
        dateLabel: formatDateLabel(date),
      };

      setDayCache(prev => ({ ...prev, [dateStr]: dayData }));
      return dayData;
    } catch {
      return { date, steps: 0, calories: 0, distance: 0, activeMinutes: 0, label: formatDayLabel(date, false), dateLabel: formatDateLabel(date) };
    }
  }, [user, steps, calories, distance, activeMinutes, dayCache, getDateForOffset]);

  // Current day data
  const [currentDay, setCurrentDay] = useState<DayData>({
    date: new Date(),
    steps,
    calories,
    distance,
    activeMinutes,
    label: "Today",
    dateLabel: formatDateLabel(new Date()),
  });

  // Update today's data reactively
  useEffect(() => {
    if (dayOffset === 0) {
      setCurrentDay(prev => ({
        ...prev,
        steps,
        calories,
        distance,
        activeMinutes,
      }));
    }
  }, [steps, calories, distance, activeMinutes, dayOffset]);

  // Fetch day data when offset changes
  useEffect(() => {
    const loadDay = async () => {
      if (dayOffset === 0) {
        setCurrentDay({
          date: new Date(),
          steps,
          calories,
          distance,
          activeMinutes,
          label: "Today",
          dateLabel: formatDateLabel(new Date()),
        });
        return;
      }

      setIsLoadingDay(true);
      const data = await fetchDayData(dayOffset);
      setCurrentDay(data);
      setIsLoadingDay(false);
    };
    loadDay();
  }, [dayOffset]);

  const handleSwipe = (_: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      // Swipe left → go to next day (if not already today)
      if (dayOffset < 0) {
        setDirection(1);
        setDayOffset(prev => prev + 1);
      }
    } else if (info.offset.x > threshold) {
      // Swipe right → go to previous day (max 30 days back)
      if (dayOffset > -30) {
        setDirection(-1);
        setDayOffset(prev => prev - 1);
      }
    }
  };

  const goToPrevDay = () => {
    if (dayOffset > -30) {
      setDirection(-1);
      setDayOffset(prev => prev - 1);
    }
  };

  const goToNextDay = () => {
    if (dayOffset < 0) {
      setDirection(1);
      setDayOffset(prev => prev + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="tactical-card p-6">
          <div className="flex justify-center py-4">
            <SkeletonCircle size="h-[220px] w-[220px]" className="rounded-full border-[14px] border-muted" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <SkeletonCircle size="h-8 w-8" />
              <SkeletonText width="w-12" className="h-6" />
              <SkeletonText width="w-8" className="h-3" />
            </div>
          ))}
        </div>
        <SkeletonCard className="h-[200px]" />
      </div>
    );
  }

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 200 : -200,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -200 : 200,
      opacity: 0,
    }),
  };

  return (
    <div className="space-y-6">
      {/* Progress Ring Card */}
      <motion.div
        className="tactical-card relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Day navigation header */}
        <div className="flex items-center justify-between px-2 pt-2 pb-1">
          <button
            onClick={goToPrevDay}
            className="p-2 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={dayOffset}
                custom={direction}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {currentDay.label}
                </span>
                {dayOffset !== 0 && (
                  <p className="text-[10px] text-muted-foreground">{currentDay.dateLabel}</p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            onClick={goToNextDay}
            disabled={dayOffset >= 0}
            className={`p-2 rounded-full transition-colors ${
              dayOffset >= 0
                ? 'text-muted-foreground/30 cursor-default'
                : 'hover:bg-secondary/50 text-muted-foreground'
            }`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Swipeable ring area */}
        <motion.div
          className="flex justify-center py-2 app-tour-progress-ring cursor-grab active:cursor-grabbing touch-pan-y"
          onPanEnd={handleSwipe}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={dayOffset}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {isLoadingDay ? (
                <div className="flex items-center justify-center" style={{ width: 220, height: 220 }}>
                  <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <ProgressRing
                  current={currentDay.steps}
                  target={goal}
                  size={220}
                  strokeWidth={12}
                  showGoalText={true}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5 pb-3">
          {dayOffset < -2 && <span className="text-[8px] text-muted-foreground/50">•••</span>}
          {[...Array(Math.min(Math.abs(dayOffset) + 1, 5))].map((_, i) => {
            const idx = dayOffset + (Math.min(Math.abs(dayOffset) + 1, 5) - 1 - i);
            return (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  idx === dayOffset
                    ? 'w-6 h-1.5 bg-primary'
                    : 'w-1.5 h-1.5 bg-muted-foreground/30'
                }`}
              />
            );
          })}
        </div>
      </motion.div>

      {/* Stats Row */}
      <StatsRow
        streak={dayOffset === 0 ? streak : 0}
        calories={currentDay.calories}
        distance={currentDay.distance}
        activeTime={currentDay.activeMinutes}
        timeUnit="min"
      />

      {/* Weekly Trend */}
      <TrendChart data={weeklyTrend} goalValue={goal} />
    </div>
  );
};
