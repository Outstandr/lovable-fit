import { Smartphone, AlertCircle } from "lucide-react";

export type DataSource = 'pedometer' | 'unavailable';

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
  
  // Default: pedometer active
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30">
      <Smartphone className="h-3.5 w-3.5 text-primary" />
      {!compact && <span className="text-xs font-semibold text-primary">Active</span>}
    </div>
  );
}

export { DataSourceBadge as default };
