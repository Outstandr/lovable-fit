import { Activity, Smartphone, AlertCircle } from "lucide-react";
import type { DataSource } from '@/services/healthConnectService';

interface DataSourceBadgeProps {
  dataSource: DataSource;
  compact?: boolean;
}

export function DataSourceBadge({ dataSource, compact = false }: DataSourceBadgeProps) {
  if (dataSource === 'unavailable') {
    if (compact) return null;
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/30">
        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Not Tracking</span>
      </div>
    );
  }
  
  if (dataSource === 'healthconnect') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30">
        <Activity className="h-3.5 w-3.5 text-primary" />
        {!compact && <span className="text-xs font-semibold text-primary">Health Connect</span>}
      </div>
    );
  }
  
  if (dataSource === 'pedometer') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30">
        <Smartphone className="h-3.5 w-3.5 text-accent" />
        {!compact && <span className="text-xs font-semibold text-accent">Phone Sensor</span>}
      </div>
    );
  }
  
  return null;
}

// Named export for backward compatibility
export { DataSourceBadge as default };
