import { motion } from "framer-motion";

interface DayActivity {
  date: number;
  steps: number;
  hitGoal: boolean;
  isToday: boolean;
  isFuture: boolean;
}

interface MonthCalendarProps {
  year: number;
  month: number;
  data: DayActivity[];
  goal: number;
}

export const MonthCalendar = ({ year, month, data, goal }: MonthCalendarProps) => {
  const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];
  
  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Create calendar grid
  const calendarDays: (DayActivity | null)[] = [];
  
  // Add empty cells for days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  
  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayData = data.find(d => d.date === day);
    calendarDays.push(dayData || { date: day, steps: 0, hitGoal: false, isToday: false, isFuture: true });
  }

  const getActivityLevel = (steps: number): number => {
    if (steps === 0) return 0;
    if (steps < goal * 0.25) return 1;
    if (steps < goal * 0.5) return 2;
    if (steps < goal * 0.75) return 3;
    if (steps < goal) return 4;
    return 5; // Goal hit
  };

  return (
    <div className="px-2">
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map((day, index) => (
          <span 
            key={index}
            className="text-[10px] font-medium text-muted-foreground text-center"
          >
            {day}
          </span>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          if (!day) {
            return <div key={index} className="aspect-square" />;
          }
          
          const level = getActivityLevel(day.steps);
          
          return (
            <motion.div
              key={index}
              className={`aspect-square rounded-full flex items-center justify-center text-xs font-medium relative ${
                day.isToday 
                  ? "ring-2 ring-foreground" 
                  : ""
              } ${
                day.isFuture || day.steps === 0
                  ? "bg-secondary text-muted-foreground"
                  : level >= 5
                    ? "bg-primary text-primary-foreground"
                    : level >= 3
                      ? "bg-primary/70 text-primary-foreground"
                      : level >= 1
                        ? "bg-primary/40 text-foreground"
                        : "bg-secondary text-muted-foreground"
              }`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.01 }}
            >
              {day.date}
              {/* Activity indicator dot */}
              {day.steps > 0 && !day.isFuture && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
