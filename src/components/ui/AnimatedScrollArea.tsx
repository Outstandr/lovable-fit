import { ReactNode, useRef, useState, useEffect, useCallback } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedScrollAreaProps {
  children: ReactNode;
  className?: string;
  showFadeIndicators?: boolean;
  fadeColor?: string;
}

export const AnimatedScrollArea = ({
  children,
  className = '',
  showFadeIndicators = true,
  fadeColor = 'hsl(var(--background))',
}: AnimatedScrollAreaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  
  const { scrollY } = useScroll({ container: containerRef });
  
  // Smooth spring for scroll-linked effects
  const smoothScrollY = useSpring(scrollY, {
    stiffness: 100,
    damping: 30,
    mass: 0.5,
  });
  
  // Fade opacity based on scroll position
  const topFadeOpacity = useTransform(smoothScrollY, [0, 40], [0, 1]);
  const bottomFadeOpacity = useTransform(
    smoothScrollY,
    (value) => {
      if (!containerRef.current) return 1;
      const { scrollHeight, clientHeight } = containerRef.current;
      const maxScroll = scrollHeight - clientHeight;
      return value >= maxScroll - 40 ? 0 : 1;
    }
  );
  
  // Check scroll position to show/hide fade indicators
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setCanScrollUp(scrollTop > 10);
    setCanScrollDown(scrollTop < scrollHeight - clientHeight - 10);
  }, []);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Observe for content changes
    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(container);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [handleScroll]);
  
  return (
    <div className={cn('relative h-full', className)}>
      {/* Top fade indicator */}
      {showFadeIndicators && (
        <motion.div
          className="absolute top-0 left-0 right-0 h-8 pointer-events-none z-10"
          style={{
            opacity: topFadeOpacity,
            background: `linear-gradient(to bottom, ${fadeColor}, transparent)`,
          }}
        />
      )}
      
      {/* Scrollable content */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scroll-smooth-native"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {children}
      </div>
      
      {/* Bottom fade indicator */}
      {showFadeIndicators && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none z-10"
          style={{
            opacity: bottomFadeOpacity,
            background: `linear-gradient(to top, ${fadeColor}, transparent)`,
          }}
        />
      )}
    </div>
  );
};

// Staggered list animation wrapper
interface StaggeredListProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export const StaggeredList = ({
  children,
  className = '',
  staggerDelay = 0.05,
}: StaggeredListProps) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

// Individual stagger item
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export const StaggerItem = ({ children, className = '' }: StaggerItemProps) => {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: 'spring',
            stiffness: 300,
            damping: 24,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};
