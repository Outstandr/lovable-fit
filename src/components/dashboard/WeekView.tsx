import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { StatsRow } from "./StatsRow";
import { WeekBarChart } from "./WeekBarChart";
import { TrendChart } from "./TrendChart";
import { SkeletonCard, SkeletonText } from "@/components/ui/SkeletonCard";

interface WeekViewProps {
  totalSteps: number;
  avgSteps: number;
  prevWeekAvg: number;
  goal: number;
  weekData: { day: string; steps: number; isToday: boolean; hitGoal: boolean }[];
  calories: number;
  distance: number;
  activeMinutes: number;
  streak: number;
  monthlyTrend: { label: string; value: number }[];
  isLoading?: boolean;
}

export const WeekView = ({
  totalSteps, avgSteps, prevWeekAvg, goal, weekData,
  calories, distance, activeMinutes, streak, monthlyTrend, isLoading
}: WeekViewProps) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="px-4 space-y-2">
          <SkeletonText width="w-20" className="h-4" />
          <div className="flex justify-between items-center">
            <SkeletonText width="w-32" className="h-10" />
            <SkeletonText width="w-24" className="h-8 rounded-full" />
          </div>
        </div>
        <SkeletonCard className="h-[200px]" />
        <SkeletonCard className="h-[80px]" />
        <SkeletonCard className="h-[150px]" />
      </div>
    );
  }

  const trendUp = avgSteps >= prevWeekAvg;
  const trendPercent = prevWeekAvg > 0
    ? Math.abs(((avgSteps - prevWeekAvg) / prevWeekAvg) * 100).toFixed(0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <motion.div
        className="px-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <span className="font-medium">This Week</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-4xl font-bold text-foreground tabular-nums">
            {totalSteps.toLocaleString()}
          </span>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border/50">
            <span className="text-sm font-medium text-muted-foreground">AVG</span>
            <span className="text-sm font-bold text-foreground tabular-nums">
              {avgSteps.toLocaleString()}
            </span>
            <div className={`flex items-center gap-0.5 ${trendUp ? "text-accent" : "text-orange-400"}`}>
              {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Week Bar Chart */}
      <motion.div
        className="tactical-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <WeekBarChart data={weekData} goal={goal} />
      </motion.div>

      {/* Stats Row */}
      <StatsRow
        streak={streak}
        calories={calories}
        distance={distance}
        activeTime={activeMinutes}
        timeUnit="h"
      />

      {/* Monthly Trend */}
      <TrendChart data={monthlyTrend} showGoalLine={false} />
    </div>
  );
};
