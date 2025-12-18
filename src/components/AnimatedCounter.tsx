import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  className?: string;
  duration?: number;
  formatOptions?: Intl.NumberFormatOptions;
}

export function AnimatedCounter({ 
  value, 
  className = '', 
  duration = 0.5,
  formatOptions = {}
}: AnimatedCounterProps) {
  const spring = useSpring(0, { 
    stiffness: 100, 
    damping: 30, 
    restDelta: 0.001 
  });
  
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    // Only animate if the value has changed
    if (value !== previousValue.current) {
      spring.set(value);
      previousValue.current = value;
    }
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      setDisplayValue(Math.round(latest));
    });
    
    // Set initial value immediately
    setDisplayValue(value);
    spring.jump(value);
    
    return unsubscribe;
  }, [spring]);

  const formattedValue = displayValue.toLocaleString(undefined, formatOptions);

  return (
    <motion.span 
      className={className}
      key={displayValue}
    >
      {formattedValue}
    </motion.span>
  );
}

// Simpler version for small increments
export function SmoothCounter({ 
  value, 
  className = '' 
}: { 
  value: number; 
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const targetRef = useRef(value);
  const frameRef = useRef<number>();

  useEffect(() => {
    targetRef.current = value;
    
    const animate = () => {
      setDisplayValue(current => {
        const diff = targetRef.current - current;
        
        // If very close, just set to target
        if (Math.abs(diff) < 1) {
          return targetRef.current;
        }
        
        // Smooth interpolation - move 15% of the way each frame
        const step = Math.ceil(diff * 0.15);
        return current + (diff > 0 ? Math.max(1, step) : Math.min(-1, step));
      });
      
      frameRef.current = requestAnimationFrame(animate);
    };
    
    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value]);

  return (
    <span className={className}>
      {displayValue.toLocaleString()}
    </span>
  );
}
