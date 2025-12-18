import { motion } from "framer-motion";
import { ProgressRing } from "@/components/ProgressRing";
import { StatsRow } from "./StatsRow";
import { TrendChart } from "./TrendChart";

interface DayViewProps {
  steps: number;
  goal: number;
  calories: number;
  distance: number;
  activeMinutes: number;
  streak: number;
  weeklyTrend: { label: string; value: number }[];
}

export const DayView = ({ 
  steps, goal, calories, distance, activeMinutes, streak, weeklyTrend 
}: DayViewProps) => {
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
