import { useRef, useEffect, useCallback } from 'react';

interface UseRubberBandScrollOptions {
  maxStretch?: number;
  resistance?: number;
}

export const useRubberBandScroll = (options: UseRubberBandScrollOptions = {}) => {
  const { maxStretch = 80, resistance = 0.4 } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isAtTop = useRef(false);
  const isAtBottom = useRef(false);
  const isDragging = useRef(false);
  const wheelAccumulator = useRef(0);
  const wheelTimeout = useRef<NodeJS.Timeout | null>(null);

  const rubberBand = useCallback((distance: number): number => {
    const sign = distance < 0 ? -1 : 1;
    const absDistance = Math.abs(distance);
    return sign * maxStretch * (1 - Math.exp(-absDistance * resistance / maxStretch));
  }, [maxStretch, resistance]);

  const resetTransform = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      contentRef.current.style.transform = 'translateY(0)';
    }
    wheelAccumulator.current = 0;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const handleTouchStart = (e: TouchEvent) => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      isAtTop.current = scrollTop <= 0;
      isAtBottom.current = scrollTop + clientHeight >= scrollHeight - 1;
      
      if (isAtTop.current || isAtBottom.current) {
        startY.current = e.touches[0].clientY;
        currentY.current = startY.current;
        isDragging.current = true;
        content.style.transition = 'none';
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      
      currentY.current = e.touches[0].clientY;
      const deltaY = currentY.current - startY.current;
      
      if ((isAtTop.current && deltaY > 0) || (isAtBottom.current && deltaY < 0)) {
        const stretch = rubberBand(deltaY);
        content.style.transform = `translateY(${stretch}px)`;
      } else {
        isDragging.current = false;
        resetTransform();
      }
    };

    const handleTouchEnd = () => {
      if (isDragging.current) {
        isDragging.current = false;
        resetTransform();
      }
    };

    // Desktop wheel support
    const handleWheel = (e: WheelEvent) => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      
      // Scrolling up at top, or scrolling down at bottom
      if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
        content.style.transition = 'none';
        wheelAccumulator.current += e.deltaY * -0.5;
        
        // Clamp the accumulator
        wheelAccumulator.current = Math.max(-200, Math.min(200, wheelAccumulator.current));
        
        const stretch = rubberBand(wheelAccumulator.current);
        content.style.transform = `translateY(${stretch}px)`;
        
        // Reset after scrolling stops
        if (wheelTimeout.current) clearTimeout(wheelTimeout.current);
        wheelTimeout.current = setTimeout(() => {
          resetTransform();
        }, 150);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
      if (wheelTimeout.current) clearTimeout(wheelTimeout.current);
    };
  }, [rubberBand, resetTransform]);

  return { containerRef, contentRef };
};
