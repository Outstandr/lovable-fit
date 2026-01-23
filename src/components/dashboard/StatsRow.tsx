import { motion } from "framer-motion";
import { Flame, MapPin, Clock } from "lucide-react";

interface StatsRowProps {
  streak: number;
  calories: number;
  distance: number;
  activeTime: number; // in minutes for day, hours for week/month
  timeUnit?: "min" | "h";
}

export const StatsRow = ({ streak, calories, distance, activeTime, timeUnit = "min" }: StatsRowProps) => {
  const stats = [
    { 
      icon: <span className="text-lg">🔥</span>, 
      value: streak, 
      label: "Streak",
      color: "text-orange-400"
    },
    { 
      icon: null, 
      value: calories.toLocaleString(), 
      label: "kcal",
      color: "text-foreground"
    },
    { 
      icon: null, 
      value: distance.toFixed(1), 
      label: "km",
      color: "text-foreground"
    },
    { 
      icon: null, 
      value: timeUnit === "h" 
        ? `${Math.floor(activeTime / 60)}:${String(activeTime % 60).padStart(2, '0')}`
        : activeTime, 
      label: timeUnit,
      color: "text-foreground"
    },
  ];

  return (
    <motion.div 
      className="flex justify-between items-center gap-2 px-2 overflow-x-auto scrollbar-hide app-tour-stats-row"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {stats.map((stat, index) => (
        <div 
          key={stat.label}
          className="flex flex-col items-center min-w-[60px] px-2 py-2 rounded-xl bg-card/50"
        >
          <div className="flex items-center gap-1">
            {stat.icon}
            <span className={`text-lg font-bold tabular-nums ${stat.color}`}>
              {stat.value}
            </span>
          </div>
          <span className="text-[10px] font-medium text-primary uppercase tracking-wider">
            {stat.label}
          </span>
        </div>
      ))}
    </motion.div>
  );
};
