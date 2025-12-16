import { motion } from 'framer-motion';
import { MapPin, MapPinOff, Footprints } from 'lucide-react';

interface MapPlaceholderProps {
  message?: string;
  sessionSteps?: number;
  sessionDistance?: number;
  showStepsFallback?: boolean;
}

const MapPlaceholder = ({ 
  message = 'Waiting for GPS signal...', 
  sessionSteps = 0,
  sessionDistance = 0,
  showStepsFallback = false
}: MapPlaceholderProps) => {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-secondary flex items-center justify-center">
      {/* Grid overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Center content */}
      <div className="flex flex-col items-center gap-4 z-10">
        {showStepsFallback ? (
          <>
            <MapPinOff className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center max-w-[200px]">
              {message}
            </p>
            <div className="mt-2 flex items-center gap-2 bg-secondary/80 rounded-lg px-4 py-2 border border-border/50">
              <Footprints className="h-5 w-5 text-primary" />
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{sessionSteps}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Steps (fallback)</p>
              </div>
              <div className="h-8 w-px bg-border/50 mx-2" />
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{sessionDistance.toFixed(2)}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">KM est.</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <MapPin className="h-12 w-12 text-primary" />
            </motion.div>
            <p className="text-sm text-muted-foreground">{message}</p>
          </>
        )}
      </div>

      {/* Status badge */}
      <div className="absolute top-4 left-4 rounded-lg bg-background/80 backdrop-blur-sm px-3 py-1.5 border border-border/50">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {showStepsFallback ? 'GPS Unavailable' : 'Initializing GPS'}
        </span>
      </div>
    </div>
  );
};

export default MapPlaceholder;
