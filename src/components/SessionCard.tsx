import { motion } from 'framer-motion';
import { MapPin, Clock, Footprints } from 'lucide-react';
import { format } from 'date-fns';

interface SessionCardProps {
  session: any;
  onClick?: () => void;
}

const SessionCard = ({ session, onClick }: SessionCardProps) => {
  const duration = Math.round(session.duration_seconds / 60);
  const pace = session.distance_km > 0 
    ? (session.duration_seconds / 60 / session.distance_km).toFixed(2)
    : '0.00';

  return (
    <motion.button
      onClick={onClick}
      className="w-full tactical-card text-left hover:border-primary/50 transition-all"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            {session.session_type === 'walking' ? 'Walking' : 'Running'} Session
          </h3>
          <p className="text-xs text-muted-foreground">
            {format(new Date(session.created_at), 'MMM d, yyyy • h:mm a')}
          </p>
        </div>
        <MapPin className="h-5 w-5 text-primary" />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Distance</p>
          <p className="text-lg font-bold text-primary">{session.distance_km.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">km</p>
        </div>
        
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Duration</p>
          <p className="text-lg font-bold text-foreground">{duration}</p>
          <p className="text-[10px] text-muted-foreground">min</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pace</p>
          <p className="text-lg font-bold text-foreground">{pace}</p>
          <p className="text-[10px] text-muted-foreground">min/km</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Steps</p>
          <p className="text-lg font-bold text-accent">{session.steps || 0}</p>
          <p className="text-[10px] text-muted-foreground">total</p>
        </div>
      </div>
    </motion.button>
  );
};

export default SessionCard;
