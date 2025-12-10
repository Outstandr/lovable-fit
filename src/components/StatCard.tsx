import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  highlight?: boolean;
  delay?: number;
}

export const StatCard = ({ icon: Icon, label, value, highlight = false, delay = 0 }: StatCardProps) => {
  return (
    <motion.div 
      className="tactical-card flex flex-col items-center justify-center gap-1 py-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Icon className={`h-5 w-5 ${highlight ? 'text-accent' : 'text-primary'}`} />
      <span className={`text-2xl font-bold tracking-tight ${highlight ? 'text-accent' : 'text-foreground'}`}>
        {value}
      </span>
      <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </motion.div>
  );
};
