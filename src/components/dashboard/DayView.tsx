import { motion } from "framer-motion";
import { ProgressRing } from "@/components/ProgressRing";
import { StatsRow } from "./StatsRow";
import { TrendChart } from "./TrendChart";
import { SkeletonCard, SkeletonCircle, SkeletonText } from "@/components/ui/SkeletonCard";

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

export const DayView = ({
  steps, goal, calories, distance, activeMinutes, streak, weeklyTrend, isLoading
}: DayViewProps) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center py-4">
          <SkeletonCircle size="h-[260px] w-[260px]" className="rounded-full border-[14px] border-muted" />
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

  return (
    <div className="space-y-6">
      {/* Progress Ring */}
      <motion.div
        className="flex justify-center py-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <ProgressRing
          current={steps}
          target={goal}
          size={260}
          strokeWidth={14}
          label="Today"
        />
      </motion.div>

      {/* Stats Row */}
      <StatsRow
        streak={streak}
        calories={calories}
        distance={distance}
        activeTime={activeMinutes}
        timeUnit="min"
      />

      {/* Weekly Trend */}
      <TrendChart data={weeklyTrend} goalValue={goal} />
    </div>
  );
};
