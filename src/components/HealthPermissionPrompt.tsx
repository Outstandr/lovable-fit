import { motion } from 'framer-motion';
import { Activity, Smartphone, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HealthPermissionPromptProps {
  platform: 'ios' | 'android' | 'web';
  hasPermission: boolean;
  onRequestPermission: () => Promise<boolean>;
  isLoading?: boolean;
}

export function HealthPermissionPrompt({
  platform,
  hasPermission,
  onRequestPermission,
  isLoading = false
}: HealthPermissionPromptProps) {
  if (hasPermission) {
    return null;
  }

  if (platform === 'web') {
    return (
      <motion.div
        className="tactical-card text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Smartphone className="h-10 w-10 text-primary mx-auto mb-3" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-2">
          Native App Required
        </h3>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Step tracking requires the native mobile app. Install Lionel X on your phone to track steps.
        </p>
        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-accent" />
            <span>iOS: Apple Health</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-accent" />
            <span>Android: Health Connect</span>
          </div>
        </div>
      </motion.div>
    );
  }

  const platformLabel = platform === 'ios' ? 'Apple Health' : 'Health Connect';

  return (
    <motion.div
      className="tactical-card text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Activity className="h-10 w-10 text-primary mx-auto mb-3" />
      <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-2">
        {platformLabel} Access Required
      </h3>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        Lionel X needs access to {platformLabel} to track your daily steps, distance, and calories.
      </p>
      <Button
        variant="tactical"
        size="sm"
        onClick={onRequestPermission}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Requesting...' : `Grant ${platformLabel} Access`}
      </Button>
    </motion.div>
  );
}
