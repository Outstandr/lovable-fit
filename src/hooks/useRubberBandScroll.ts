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

  const rubberBand = useCallback((distance: number): number => {
    const sign = distance < 0 ? -1 : 1;
    const absDistance = Math.abs(distance);
    // Rubber band formula: diminishing returns as you pull further
    return sign * maxStretch * (1 - Math.exp(-absDistance * resistance / maxStretch));
  }, [maxStretch, resistance]);

  const resetTransform = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      contentRef.current.style.transform = 'translateY(0)';
    }
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
      
      // Only apply rubber band when pulling beyond bounds
      if ((isAtTop.current && deltaY > 0) || (isAtBottom.current && deltaY < 0)) {
        const stretch = rubberBand(deltaY);
        content.style.transform = `translateY(${stretch}px)`;
      } else {
        // Reset if scrolling in normal direction
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

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [rubberBand, resetTransform]);

  return { containerRef, contentRef };
};
