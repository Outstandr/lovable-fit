import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';

interface MapPlaceholderProps {
  message?: string;
}

const MapPlaceholder = ({ message = 'Waiting for GPS signal...' }: MapPlaceholderProps) => {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-secondary flex items-center justify-center">
      {/* Grid overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(220, 40%, 25%) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(220, 40%, 25%) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Center content */}
      <div className="flex flex-col items-center gap-4 z-10">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <MapPin className="h-12 w-12 text-primary" />
        </motion.div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      {/* Status badge */}
      <div className="absolute top-4 left-4 rounded-lg bg-background/80 backdrop-blur-sm px-3 py-1.5 border border-border/50">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Initializing GPS
        </span>
      </div>
    </div>
  );
};

export default MapPlaceholder;
