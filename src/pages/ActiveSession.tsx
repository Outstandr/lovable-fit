import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Gauge, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const ActiveSession = () => {
  const navigate = useNavigate();
  const [duration, setDuration] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  
  // Mock session data
  const sessionData = {
    distance: 1.23,
    pace: "5:45",
    steps: 1560,
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStop = () => {
    setIsRunning(false);
    // TODO: Save session and navigate to summary
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <motion.header 
        className="flex items-center gap-4 px-4 pt-6 pb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button 
          onClick={() => navigate('/')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold uppercase tracking-widest text-primary">
            Active Mode
          </h1>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Session in progress
          </p>
        </div>
      </motion.header>

      {/* Map Area (Placeholder) */}
      <motion.div 
        className="flex-1 mx-4 rounded-xl overflow-hidden bg-secondary/50 relative"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Dark map placeholder with grid */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-secondary">
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
        </div>

        {/* Route line placeholder */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(186, 100%, 50%)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(186, 100%, 50%)" />
            </linearGradient>
            <filter id="routeGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <motion.path
            d="M 60 350 Q 100 300 150 280 T 250 220 T 300 180 T 320 150"
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            filter="url(#routeGlow)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, ease: "easeOut" }}
          />
          {/* Current position dot */}
          <motion.circle
            cx="320"
            cy="150"
            r="8"
            fill="hsl(186, 100%, 50%)"
            filter="url(#routeGlow)"
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </svg>

        {/* Map label */}
        <div className="absolute top-4 left-4 rounded-lg bg-background/80 backdrop-blur-sm px-3 py-1.5 border border-border/50">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            GPS Tracking Active
          </span>
        </div>
      </motion.div>

      {/* Stats Panel */}
      <motion.div 
        className="px-4 py-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="tactical-card">
          {/* Duration - Large */}
          <div className="mb-4 text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Duration
            </span>
            <div className="text-5xl font-bold tracking-tight text-foreground">
              {formatTime(duration)}
            </div>
          </div>

          {/* Other stats */}
          <div className="grid grid-cols-3 gap-4 border-t border-border/50 pt-4">
            <div className="flex flex-col items-center gap-1">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-xl font-bold text-foreground">{sessionData.distance} KM</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Distance</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Gauge className="h-4 w-4 text-primary" />
              <span className="text-xl font-bold text-foreground">{sessionData.pace}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pace /km</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xl font-bold text-foreground">{sessionData.steps}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Steps</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stop Button */}
      <div className="px-4 pb-8">
        <Button 
          variant="tacticalStop" 
          size="full"
          onClick={handleStop}
        >
          <Square className="mr-2 h-5 w-5 fill-current" />
          Stop / Finish
        </Button>
      </div>
    </div>
  );
};

export default ActiveSession;
