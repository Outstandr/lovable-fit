import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { StatsRow } from "./StatsRow";
import { MonthCalendar } from "./MonthCalendar";
import { TrendChart } from "./TrendChart";

interface MonthViewProps {
  year: number;
  month: number;
  totalSteps: number;
  avgSteps: number;
  prevMonthAvg: number;
  goal: number;
  daysHitGoal: number;
  calendarData: { date: number; steps: number; hitGoal: boolean; isToday: boolean; isFuture: boolean }[];
  calories: number;
  distance: number;
  activeMinutes: number;
  streak: number;
  yearlyTrend: { label: string; value: number }[];
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const MonthView = ({ 
  year, month, totalSteps, avgSteps, prevMonthAvg, goal, daysHitGoal,
  calendarData, calories, distance, activeMinutes, streak, yearlyTrend 
}: MonthViewProps) => {
  const trendUp = avgSteps >= prevMonthAvg;
  const monthName = monthNames[month];

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <motion.div 
        className="px-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <span className="font-medium">{daysHitGoal} days</span>
          <span>•</span>
          <span className="font-medium">{monthName} {year}</span>
          <ChevronDown className="h-4 w-4" />
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

      {/* Month Calendar */}
      <motion.div 
        className="tactical-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <MonthCalendar 
          year={year} 
          month={month} 
          data={calendarData} 
          goal={goal}
        />
      </motion.div>

      {/* Stats Row */}
      <StatsRow 
        streak={streak}
        calories={calories}
        distance={distance}
        activeTime={activeMinutes}
        timeUnit="h"
      />

      {/* Yearly Trend */}
      <TrendChart data={yearlyTrend} showGoalLine={false} />
    </div>
  );
};
