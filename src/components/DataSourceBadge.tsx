import { Activity, Smartphone, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DataSourceBadgeProps {
  dataSource: 'healthconnect' | 'pedometer' | 'unavailable';
  compact?: boolean;
}

export const DataSourceBadge = ({ dataSource, compact = false }: DataSourceBadgeProps) => {
  if (dataSource === 'unavailable') {
    return null;
  }

  const isHealthConnect = dataSource === 'healthconnect';

  const badge = (
    <div className={`
      inline-flex items-center gap-1.5 
      ${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'} 
      rounded-full 
      ${isHealthConnect ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}
      text-[10px] font-medium uppercase tracking-wider
      transition-colors
    `}>
      {isHealthConnect ? (
        <>
          <Activity className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          {!compact && <span>Health Connect</span>}
        </>
      ) : (
        <>
          <Smartphone className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          {!compact && <span>Phone Sensor</span>}
        </>
      )}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px]">
        <p className="text-xs">
          {isHealthConnect
            ? "Using Health Connect - syncs with Google Fit, Samsung Health, and wearables"
            : "Using phone's built-in step sensor"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
