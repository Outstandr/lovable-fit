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
  const isDragging = useRef(false);
  const pullDirection = useRef<'top' | 'bottom' | null>(null);
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
    pullDirection.current = null;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Just store the start position, don't activate rubber band yet
      startY.current = e.touches[0].clientY;
      isDragging.current = false;
      pullDirection.current = null;
      content.style.transition = 'none';
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY.current;
      
      // Check current scroll position
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      // If not already dragging, check if we should start rubber band
      if (!isDragging.current) {
        // Only activate when pulling PAST an edge with sufficient threshold
        if (atTop && deltaY > 8) {
          isDragging.current = true;
          pullDirection.current = 'top';
          startY.current = currentY; // Reset start to current position
        } else if (atBottom && deltaY < -8) {
          isDragging.current = true;
          pullDirection.current = 'bottom';
          startY.current = currentY; // Reset start to current position
        }
        return;
      }

      // We're in rubber band mode
      const pullDelta = currentY - startY.current;
      
      // Check if user is still pulling in valid direction
      if (pullDirection.current === 'top' && pullDelta > 0) {
        const stretch = rubberBand(pullDelta);
        content.style.transform = `translateY(${stretch}px)`;
      } else if (pullDirection.current === 'bottom' && pullDelta < 0) {
        const stretch = rubberBand(pullDelta);
        content.style.transform = `translateY(${stretch}px)`;
      } else {
        // User reversed direction or scrolled away from edge
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

    // Desktop wheel support - only at edges
    const handleWheel = (e: WheelEvent) => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      
      // Only apply rubber band when scrolling past edges
      if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
        content.style.transition = 'none';
        wheelAccumulator.current += e.deltaY * -0.5;
        wheelAccumulator.current = Math.max(-200, Math.min(200, wheelAccumulator.current));
        
        const stretch = rubberBand(wheelAccumulator.current);
        content.style.transform = `translateY(${stretch}px)`;
        
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
