import { motion } from "framer-motion";

interface DayData {
  day: string;
  steps: number;
  isToday: boolean;
  hitGoal: boolean;
}

interface WeekBarChartProps {
  data: DayData[];
  goal: number;
}

export const WeekBarChart = ({ data, goal }: WeekBarChartProps) => {
  const maxSteps = Math.max(...data.map(d => d.steps), goal);
  
  return (
    <div className="px-2">
      {/* Day labels */}
      <div className="flex justify-between mb-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <span 
            key={index}
            className={`text-xs font-medium w-10 text-center ${
              data[index]?.isToday ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {day}
          </span>
        ))}
      </div>
      
      {/* Bar chart */}
      <div className="flex justify-between items-end h-[140px] gap-1">
        {data.map((item, index) => {
          const height = maxSteps > 0 ? (item.steps / maxSteps) * 100 : 0;
          const goalLinePosition = (goal / maxSteps) * 100;
          
          return (
            <div key={index} className="flex flex-col items-center flex-1 h-full relative">
              {/* Goal dashed line indicator */}
              <div 
                className="absolute w-full border-t border-dashed border-muted-foreground/30"
                style={{ bottom: `${goalLinePosition}%` }}
              />
              
              {/* Step count label */}
              {item.steps > 0 && (
                <motion.span 
                  className="text-[10px] font-semibold text-muted-foreground mb-1 tabular-nums"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                >
                  {item.steps >= 1000 ? `${(item.steps / 1000).toFixed(1)}k` : item.steps}
                </motion.span>
              )}
              
              {/* Bar */}
              <div className="flex-1 w-full flex items-end justify-center">
                <motion.div
                  className={`w-8 rounded-t-xl ${
                    item.isToday 
                      ? "bg-primary ring-2 ring-primary/30" 
                      : item.steps > 0 
                        ? "bg-primary/80" 
                        : "bg-secondary"
                  }`}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, 5)}%` }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  {/* Goal hit star */}
                  {item.hitGoal && (
                    <div className="flex justify-center -mt-1">
                      <span className="text-xs">⭐</span>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
