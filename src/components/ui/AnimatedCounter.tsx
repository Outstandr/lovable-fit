import { useEffect, useState, useRef } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  formatValue?: (value: number) => string;
}

export const AnimatedCounter = ({ 
  value, 
  duration = 1, 
  className = "",
  formatValue = (v) => v.toLocaleString()
}: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);
  
  const spring = useSpring(prevValue.current, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  });
  
  const display = useTransform(spring, (current) => formatValue(Math.round(current)));

  useEffect(() => {
    spring.set(value);
    prevValue.current = value;
  }, [value, spring]);

  useEffect(() => {
    return display.on("change", (latest) => {
      setDisplayValue(parseInt(latest.replace(/,/g, '')) || 0);
    });
  }, [display]);

  return (
    <motion.span 
      className={`tabular-nums ${className}`}
      key={value}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ duration: 0.3 }}
    >
      {formatValue(displayValue)}
    </motion.span>
  );
};

// Simple version without spring animation for faster updates
export const SimpleCounter = ({ 
  value, 
  className = "",
  formatValue = (v: number) => v.toLocaleString()
}: AnimatedCounterProps) => {
  return (
    <motion.span 
      className={`tabular-nums ${className}`}
      key={value}
      initial={{ opacity: 0.8, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {formatValue(value)}
    </motion.span>
  );
};