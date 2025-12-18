import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DayData {
  day: string;
  steps: number;
  isToday: boolean;
}

export const WeeklyChart = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DayData[]>([]);

  useEffect(() => {
    const fetchWeeklyData = async () => {
      if (!user) return;

      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const today = new Date();
      const weekData: DayData[] = [];

      // Get last 7 days including today
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        weekData.push({
          day: days[date.getDay()],
          steps: 0,
          isToday: i === 6,
        });
      }

      // Fetch actual data
      const { data: stepsData } = await supabase
        .from('daily_steps')
        .select('date, steps')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0]);

      if (stepsData) {
        stepsData.forEach(record => {
          const recordDate = new Date(record.date + 'T00:00:00');
          const startDateTime = new Date(startDate.toISOString().split('T')[0] + 'T00:00:00');
          const diffTime = recordDate.getTime() - startDateTime.getTime();
          const dayIndex = Math.round(diffTime / (1000 * 60 * 60 * 24));
          if (dayIndex >= 0 && dayIndex < 7) {
            weekData[dayIndex].steps = record.steps;
          }
        });
      }

      setData(weekData);
    };

    fetchWeeklyData();
    
    // Refresh every minute for real-time updates
    const interval = setInterval(fetchWeeklyData, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2">
          <p className="text-xs text-muted-foreground">{payload[0].payload.day}</p>
          <p className="text-lg font-bold text-foreground">{payload[0].value.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground uppercase">steps</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="tactical-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground mb-4">
        This Week
      </h3>
      <div className="h-[160px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="stepsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(186, 100%, 50%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(186, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false}
              tick={{ 
                fill: 'hsl(215, 30%, 65%)', 
                fontSize: 10, 
                fontWeight: 500 
              }}
              dy={10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="steps"
              stroke="hsl(186, 100%, 50%)"
              strokeWidth={2}
              fill="url(#stepsGradient)"
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    key={payload.day}
                    cx={cx}
                    cy={cy}
                    r={payload.isToday ? 6 : 4}
                    fill="hsl(186, 100%, 50%)"
                    stroke={payload.isToday ? "hsl(225, 20%, 93%)" : "none"}
                    strokeWidth={2}
                  />
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
