import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  highlight?: boolean;
  delay?: number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  highlight = false, 
  delay = 0,
  trend,
  trendValue
}: StatCardProps) => {
  return (
    <motion.div 
      className="tactical-card flex flex-col items-center justify-center gap-2 py-5 relative overflow-hidden group"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      whileHover={{ scale: 1.02 }}
    >
      {/* Background glow on highlight */}
      {highlight && (
        <div className="absolute inset-0 bg-gradient-to-t from-accent/10 to-transparent pointer-events-none" />
      )}
      
      {/* Icon with subtle animation */}
      <motion.div
        className={`p-2 rounded-lg ${highlight ? 'bg-accent/15' : 'bg-primary/10'}`}
        whileHover={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.3 }}
      >
        <Icon className={`h-5 w-5 ${highlight ? 'text-accent' : 'text-primary'}`} />
      </motion.div>
      
      {/* Value with number animation effect */}
      <motion.span 
        className={`text-2xl font-bold tracking-tight tabular-nums ${highlight ? 'text-accent' : 'text-foreground'}`}
        key={value}
        initial={{ opacity: 0.5, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {value}
      </motion.span>
      
      {/* Label */}
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>

      {/* Trend indicator */}
      {trend && trendValue && (
        <div className={`flex items-center gap-1 text-[10px] font-medium ${
          trend === 'up' ? 'text-accent' : 
          trend === 'down' ? 'text-destructive' : 
          'text-muted-foreground'
        }`}>
          {trend === 'up' && '↑'}
          {trend === 'down' && '↓'}
          <span>{trendValue}</span>
        </div>
      )}
    </motion.div>
  );
};