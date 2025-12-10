import { motion } from "framer-motion";
import { Trophy, ChevronRight } from "lucide-react";

interface LeaderEntry {
  rank: number;
  name: string;
  steps: number;
  isCurrentUser?: boolean;
}

interface LeaderboardPreviewProps {
  entries: LeaderEntry[];
  onViewAll?: () => void;
}

export const LeaderboardPreview = ({ entries, onViewAll }: LeaderboardPreviewProps) => {
  const getRankStyle = (rank: number) => {
    if (rank === 1) return "text-yellow-400 border-yellow-400/50";
    if (rank === 2) return "text-gray-300 border-gray-300/50";
    if (rank === 3) return "text-amber-600 border-amber-600/50";
    return "text-muted-foreground border-border";
  };

  return (
    <motion.div 
      className="tactical-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-foreground">
            Leaderboard
          </h3>
        </div>
        <button 
          onClick={onViewAll}
          className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
        >
          View All
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-2">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.rank}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
              entry.isCurrentUser 
                ? 'bg-primary/10 border border-primary/30' 
                : 'bg-secondary/50'
            }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1, duration: 0.3 }}
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${getRankStyle(entry.rank)}`}>
                {entry.rank}
              </span>
              <span className={`text-sm font-semibold ${entry.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                {entry.name}
              </span>
            </div>
            <span className="text-sm font-bold text-primary">
              {entry.steps.toLocaleString()}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
