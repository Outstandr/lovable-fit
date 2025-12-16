import { motion } from "framer-motion";

interface ProgressRingProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
}

export const ProgressRing = ({ 
  current, 
  target, 
  size = 280, 
  strokeWidth = 16 
}: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(current / target, 1);
  const offset = circumference - progress * circumference;
  const isComplete = current >= target;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background ring */}
      <svg className="absolute" width={size} height={size}>
        <circle
          className="fill-none stroke-secondary"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
      </svg>

      {/* Progress ring */}
      <svg 
        className="absolute -rotate-90" 
        width={size} 
        height={size}
      >
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isComplete ? "hsl(105, 100%, 54%)" : "hsl(186, 100%, 60%)"} />
            <stop offset="100%" stopColor={isComplete ? "hsl(105, 100%, 45%)" : "hsl(186, 100%, 45%)"} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <motion.circle
          className="fill-none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="url(#progressGradient)"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          filter="url(#glow)"
        />
      </svg>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <motion.span 
          className={`text-7xl font-bold tracking-tight tabular-nums ${isComplete ? 'text-accent' : 'text-foreground'}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {current.toLocaleString()}
        </motion.span>
        {isComplete ? (
          <motion.span 
            className="text-base font-semibold uppercase tracking-widest text-accent mt-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            Target Hit!
          </motion.span>
        ) : (
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground mt-1">
            Goal {target.toLocaleString()}
          </span>
        )}
      </div>

      {/* Outer glow effect when complete */}
      {isComplete && (
        <motion.div 
          className="absolute inset-0 rounded-full animate-success-glow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        />
      )}
    </div>
  );
};
