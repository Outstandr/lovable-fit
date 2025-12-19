import { motion } from "framer-motion";

interface ProgressRingProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showGoalText?: boolean;
}

export const ProgressRing = ({ 
  current, 
  target, 
  size = 280, 
  strokeWidth = 14,
  label,
  showGoalText = true
}: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(current / target, 1);
  const offset = circumference - progress * circumference;
  const isComplete = current >= target;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer glow ring when complete */}
      {isComplete && (
        <motion.div 
          className="absolute inset-[-8px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(105 100% 54% / 0.15) 0%, transparent 70%)',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        />
      )}

      {/* Background ring */}
      <svg className="absolute" width={size} height={size}>
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(220, 45%, 25%)" />
            <stop offset="100%" stopColor="hsl(220, 50%, 20%)" />
          </linearGradient>
        </defs>
        <circle
          className="fill-none"
          stroke="url(#bgGradient)"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          opacity={0.6}
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
            <stop offset="0%" stopColor={isComplete ? "hsl(105, 100%, 60%)" : "hsl(186, 100%, 65%)"} />
            <stop offset="50%" stopColor={isComplete ? "hsl(105, 100%, 50%)" : "hsl(186, 100%, 50%)"} />
            <stop offset="100%" stopColor={isComplete ? "hsl(105, 100%, 45%)" : "hsl(186, 100%, 40%)"} />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
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
          filter={isComplete ? "url(#strongGlow)" : "url(#glow)"}
        />
      </svg>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        {/* Optional label */}
        {label && (
          <motion.span 
            className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {label}
          </motion.span>
        )}
        
        {/* Main value */}
        <motion.span 
          className={`text-5xl font-bold tracking-tight tabular-nums ${isComplete ? 'text-gradient-accent' : 'text-foreground'}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
          key={current}
        >
          {current.toLocaleString()}
        </motion.span>
        
        {isComplete ? (
          <motion.div 
            className="flex items-center gap-1.5 mt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <motion.div
              className="h-2 w-2 rounded-full bg-accent"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-sm font-bold uppercase tracking-widest text-accent">
              Target Hit!
            </span>
          </motion.div>
        ) : showGoalText && (
          <motion.span 
            className="text-xs font-medium text-muted-foreground mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            of {target.toLocaleString()} steps
          </motion.span>
        )}

        {/* Progress percentage */}
        {!isComplete && (
          <motion.div
            className="mt-3 px-3 py-1 rounded-full bg-secondary/80 border border-border/50"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className="text-xs font-semibold text-primary tabular-nums">
              {Math.round(progress * 100)}%
            </span>
          </motion.div>
        )}
      </div>

      {/* Success particles */}
      {isComplete && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-accent"
              initial={{ 
                opacity: 0, 
                scale: 0,
                x: 0,
                y: 0
              }}
              animate={{ 
                opacity: [0, 1, 0], 
                scale: [0, 1, 0],
                x: Math.cos((i * 60) * Math.PI / 180) * 60,
                y: Math.sin((i * 60) * Math.PI / 180) * 60,
              }}
              transition={{ 
                delay: 0.8 + i * 0.1, 
                duration: 1,
                ease: "easeOut"
              }}
            />
          ))}
        </>
      )}
    </div>
  );
};