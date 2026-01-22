import React from 'react';
import { useRubberBandScroll } from '@/hooks/useRubberBandScroll';
import { cn } from '@/lib/utils';

interface RubberBandScrollProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  maxStretch?: number;
  resistance?: number;
}

export const RubberBandScroll: React.FC<RubberBandScrollProps> = ({
  children,
  className,
  contentClassName,
  maxStretch = 80,
  resistance = 0.4,
}) => {
  const { containerRef, contentRef } = useRubberBandScroll({ maxStretch, resistance });

  return (
    <div
      ref={containerRef}
      className={cn('scroll-rubber-band flex-1 overflow-y-scroll', className)}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div
        ref={contentRef}
        className={cn('scroll-rubber-band-content', contentClassName)}
      >
        {children}
      </div>
    </div>
  );
};
