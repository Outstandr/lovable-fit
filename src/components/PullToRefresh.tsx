import { useState, useRef, useCallback, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate, useSpring } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { haptics } from '@/utils/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

// Enhanced spring config for smoother animations
const springConfig = { stiffness: 300, damping: 30, mass: 0.8 };

export const PullToRefresh = ({ onRefresh, children, className = '' }: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  
  const pullDistance = useMotionValue(0);
  const pullProgress = useTransform(pullDistance, [0, PULL_THRESHOLD], [0, 1]);
  const indicatorOpacity = useTransform(pullDistance, [0, 40], [0, 1]);
  const indicatorScale = useTransform(pullDistance, [0, PULL_THRESHOLD], [0.5, 1]);
  const indicatorRotation = useTransform(pullDistance, [0, PULL_THRESHOLD], [0, 180]);
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [isRefreshing]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) {
      pullDistance.set(0);
      return;
    }
    
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0) {
      // Apply rubber band effect
      const resistance = 0.5;
      const pull = Math.min(diff * resistance, MAX_PULL);
      pullDistance.set(pull);
      
      // Haptic feedback when crossing threshold
      if (pull >= PULL_THRESHOLD && pullDistance.get() < PULL_THRESHOLD) {
        haptics.light();
      }
    }
  }, [isPulling, isRefreshing, pullDistance]);
  
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    setIsPulling(false);
    
    const pull = pullDistance.get();
    
    if (pull >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      haptics.medium();
      
      // Animate to loading position
      animate(pullDistance, 60, { type: 'spring', stiffness: 400, damping: 30 });
      
      try {
        await onRefresh();
      } finally {
        // Animate back to start
        animate(pullDistance, 0, { 
          type: 'spring', 
          stiffness: 400, 
          damping: 30,
          onComplete: () => setIsRefreshing(false)
        });
      }
    } else {
      // Snap back
      animate(pullDistance, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }, [isPulling, isRefreshing, onRefresh, pullDistance]);
  
  // Smooth spring for content translation
  const smoothY = useSpring(pullDistance, springConfig);
  
  return (
    <div className={`relative flex flex-col ${className}`}>
      {/* Pull indicator */}
      <motion.div 
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-50"
        style={{ 
          top: 0,
          height: pullDistance,
          opacity: indicatorOpacity
        }}
      >
        <motion.div 
          className="flex items-center justify-center"
          style={{ scale: indicatorScale }}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-card/90 backdrop-blur-md border border-border/50 shadow-lg">
            <motion.div
              style={{ rotate: isRefreshing ? undefined : indicatorRotation }}
              animate={isRefreshing ? { rotate: 360 } : undefined}
              transition={isRefreshing ? { 
                repeat: Infinity, 
                duration: 0.8, 
                ease: 'linear' 
              } : undefined}
            >
              <RefreshCw className="h-5 w-5 text-primary" />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Content - let children handle their own scrolling */}
      <motion.div
        ref={containerRef}
        className="flex-1 flex flex-col"
        style={{ 
          y: smoothY,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </motion.div>
    </div>
  );
};
