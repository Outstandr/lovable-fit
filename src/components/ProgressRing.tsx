import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

interface ProgressRingProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showGoalText?: boolean;
}

// Animated number display with smooth transitions
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(0, { stiffness: 80, damping: 25 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      setDisplay(Math.round(latest));
    });
    return unsubscribe;
  }, [spring]);

  return (
    <motion.span className={className}>
      {display.toLocaleString()}
    </motion.span>
  );
}

export const ProgressRing = ({ 
  current, 
  target, 
  size = 280, 
  strokeWidth = 16,
  label,
  showGoalText = true
}: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(current / target, 1);
  const offset = circumference - progress * circumference;
  const isComplete = current >= target;

  // Smooth progress animation
  const progressSpring = useSpring(0, { stiffness: 60, damping: 20 });
  const [animatedOffset, setAnimatedOffset] = useState(circumference);

  useEffect(() => {
    progressSpring.set(progress);
  }, [progress, progressSpring]);

  useEffect(() => {
    const unsubscribe = progressSpring.on('change', (latest) => {
      setAnimatedOffset(circumference - latest * circumference);
    });
    return unsubscribe;
  }, [progressSpring, circumference]);

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

      {/* Progress ring with smooth animation */}
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
        <circle
          className="fill-none transition-all duration-300"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="url(#progressGradient)"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          filter="url(#glow)"
        />
      </svg>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        {/* Optional label */}
        {label && (
          <motion.span 
            className="text-sm font-semibold text-primary mb-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {label}
          </motion.span>
        )}
        
        <AnimatedNumber 
          value={current}
          className={`text-5xl font-bold tracking-tight tabular-nums ${isComplete ? 'text-accent' : 'text-foreground'}`}
        />
        
        {isComplete ? (
          <motion.span 
            className="text-sm font-semibold uppercase tracking-widest text-accent mt-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Target Hit!
          </motion.span>
        ) : showGoalText && (
          <span className="text-xs font-medium text-muted-foreground mt-1">
            of {target.toLocaleString()} steps
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
