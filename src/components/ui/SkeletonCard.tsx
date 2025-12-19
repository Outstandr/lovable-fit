import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  variant?: "default" | "stat" | "list" | "avatar";
}

export const SkeletonCard = ({ className, variant = "default" }: SkeletonCardProps) => {
  if (variant === "stat") {
    return (
      <div className={cn("tactical-card animate-pulse", className)}>
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 rounded-full skeleton-shimmer" />
          <div className="h-8 w-16 rounded skeleton-shimmer" />
          <div className="h-3 w-12 rounded skeleton-shimmer" />
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("tactical-card animate-pulse", className)}>
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full skeleton-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded skeleton-shimmer" />
            <div className="h-3 w-1/2 rounded skeleton-shimmer" />
          </div>
          <div className="h-4 w-4 rounded skeleton-shimmer" />
        </div>
      </div>
    );
  }

  if (variant === "avatar") {
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        <div className="h-24 w-24 rounded-full skeleton-shimmer" />
        <div className="h-5 w-24 rounded skeleton-shimmer" />
        <div className="h-3 w-32 rounded skeleton-shimmer" />
      </div>
    );
  }

  return (
    <div className={cn("tactical-card animate-pulse", className)}>
      <div className="space-y-3">
        <div className="h-4 w-3/4 rounded skeleton-shimmer" />
        <div className="h-4 w-1/2 rounded skeleton-shimmer" />
        <div className="h-8 w-full rounded skeleton-shimmer" />
      </div>
    </div>
  );
};

export const SkeletonText = ({ className, width = "w-24" }: { className?: string; width?: string }) => (
  <div className={cn("h-4 rounded skeleton-shimmer", width, className)} />
);

export const SkeletonCircle = ({ className, size = "h-10 w-10" }: { className?: string; size?: string }) => (
  <div className={cn("rounded-full skeleton-shimmer", size, className)} />
);