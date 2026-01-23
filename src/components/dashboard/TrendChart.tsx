import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface TrendChartProps {
  data: { label: string; value: number }[];
  showGoalLine?: boolean;
  goalValue?: number;
}

export const TrendChart = ({ data, showGoalLine = true, goalValue = 10000 }: TrendChartProps) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2">
          <p className="text-xs text-muted-foreground">{payload[0].payload.label}</p>
          <p className="text-lg font-bold text-foreground">{payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="tactical-card app-tour-trend-chart"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className="h-[120px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(186, 100%, 50%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(186, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="label" 
              axisLine={false}
              tickLine={false}
              tick={{ 
                fill: 'hsl(215, 30%, 65%)', 
                fontSize: 9, 
                fontWeight: 500 
              }}
              dy={5}
              interval="preserveStartEnd"
            />
            <Tooltip content={<CustomTooltip />} />
            {showGoalLine && (
              <ReferenceLine 
                y={goalValue} 
                stroke="hsl(215, 30%, 45%)" 
                strokeDasharray="3 3" 
                strokeWidth={1}
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(186, 100%, 50%)"
              strokeWidth={2}
              fill="url(#trendGradient)"
              dot={(props: any) => {
                const { cx, cy, index } = props;
                const isLast = index === data.length - 1;
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={isLast ? 5 : 3}
                    fill="hsl(186, 100%, 50%)"
                    stroke={isLast ? "hsl(var(--background))" : "none"}
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
