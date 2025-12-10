import { motion } from "framer-motion";
import { Trophy, Crown, Medal } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

const mockLeaderboard = [
  { rank: 1, name: "J. STEELE", steps: 45200, avatar: "JS" },
  { rank: 2, name: "M. FROST", steps: 42100, avatar: "MF" },
  { rank: 3, name: "K. DARK", steps: 39800, avatar: "KD" },
  { rank: 4, name: "THE HOTSTEPPER", steps: 38500, avatar: "TH", isCurrentUser: true },
  { rank: 5, name: "R. STORM", steps: 36200, avatar: "RS" },
  { rank: 6, name: "D. BLAZE", steps: 34100, avatar: "DB" },
  { rank: 7, name: "A. NOVA", steps: 31800, avatar: "AN" },
  { rank: 8, name: "T. HAWK", steps: 29500, avatar: "TH" },
  { rank: 9, name: "L. VIPER", steps: 27200, avatar: "LV" },
  { rank: 10, name: "C. WOLF", steps: 25100, avatar: "CW" },
];

const getRankStyle = (rank: number) => {
  if (rank === 1) return { bg: "bg-yellow-500/20", border: "border-yellow-500/50", text: "text-yellow-400" };
  if (rank === 2) return { bg: "bg-gray-400/20", border: "border-gray-400/50", text: "text-gray-300" };
  if (rank === 3) return { bg: "bg-amber-600/20", border: "border-amber-600/50", text: "text-amber-500" };
  return { bg: "bg-secondary", border: "border-border", text: "text-muted-foreground" };
};

const Leaderboard = () => {
  const currentUser = mockLeaderboard.find(e => e.isCurrentUser);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <motion.header 
        className="px-4 pt-6 pb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-foreground">
            Leaderboard
          </h1>
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
          Monthly Rankings • Top 50
        </p>
      </motion.header>

      {/* Top 3 Podium */}
      <motion.div 
        className="flex items-end justify-center gap-2 px-4 py-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* 2nd Place */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-2 border-gray-400/50 bg-secondary flex items-center justify-center">
              <span className="text-lg font-bold text-gray-300">{mockLeaderboard[1].avatar}</span>
            </div>
            <Medal className="absolute -bottom-1 -right-1 h-5 w-5 text-gray-300" />
          </div>
          <span className="mt-2 text-sm font-semibold text-foreground">{mockLeaderboard[1].name}</span>
          <span className="text-xs font-medium text-primary">{mockLeaderboard[1].steps.toLocaleString()}</span>
          <div className="mt-2 h-16 w-20 rounded-t-lg bg-gray-400/20 border-t border-x border-gray-400/30" />
        </div>

        {/* 1st Place */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 h-6 w-6 text-yellow-400" />
            <div className="h-20 w-20 rounded-full border-2 border-yellow-500/50 bg-secondary flex items-center justify-center">
              <span className="text-xl font-bold text-yellow-400">{mockLeaderboard[0].avatar}</span>
            </div>
          </div>
          <span className="mt-2 text-sm font-bold text-foreground">{mockLeaderboard[0].name}</span>
          <span className="text-xs font-bold text-yellow-400">{mockLeaderboard[0].steps.toLocaleString()}</span>
          <div className="mt-2 h-24 w-24 rounded-t-lg bg-yellow-500/20 border-t border-x border-yellow-500/30" />
        </div>

        {/* 3rd Place */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-2 border-amber-600/50 bg-secondary flex items-center justify-center">
              <span className="text-lg font-bold text-amber-500">{mockLeaderboard[2].avatar}</span>
            </div>
            <Medal className="absolute -bottom-1 -right-1 h-5 w-5 text-amber-500" />
          </div>
          <span className="mt-2 text-sm font-semibold text-foreground">{mockLeaderboard[2].name}</span>
          <span className="text-xs font-medium text-primary">{mockLeaderboard[2].steps.toLocaleString()}</span>
          <div className="mt-2 h-12 w-20 rounded-t-lg bg-amber-600/20 border-t border-x border-amber-600/30" />
        </div>
      </motion.div>

      {/* Full List */}
      <div className="px-4 space-y-2">
        {mockLeaderboard.slice(3).map((entry, index) => {
          const style = getRankStyle(entry.rank);
          return (
            <motion.div
              key={entry.rank}
              className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                entry.isCurrentUser 
                  ? 'bg-primary/10 border border-primary/30' 
                  : style.bg + ' border ' + style.border
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
            >
              <div className="flex items-center gap-4">
                <span className={`w-8 text-lg font-bold ${entry.isCurrentUser ? 'text-primary' : style.text}`}>
                  #{entry.rank}
                </span>
                <div className="h-10 w-10 rounded-full bg-secondary border border-border flex items-center justify-center">
                  <span className="text-sm font-semibold text-foreground">{entry.avatar}</span>
                </div>
                <span className={`text-sm font-semibold ${entry.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                  {entry.name}
                </span>
              </div>
              <span className="text-sm font-bold text-primary">
                {entry.steps.toLocaleString()}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Pinned User Rank */}
      {currentUser && (
        <motion.div 
          className="fixed bottom-20 left-0 right-0 px-4 z-40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-center justify-between rounded-lg bg-primary/20 border border-primary/40 px-4 py-3 backdrop-blur-lg">
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-primary">
                #{currentUser.rank}
              </span>
              <div className="h-10 w-10 rounded-full bg-secondary border border-primary/50 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">{currentUser.avatar}</span>
              </div>
              <div>
                <span className="text-sm font-bold text-primary">{currentUser.name}</span>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your Rank</p>
              </div>
            </div>
            <span className="text-lg font-bold text-primary">
              {currentUser.steps.toLocaleString()}
            </span>
          </div>
        </motion.div>
      )}

      <BottomNav />
    </div>
  );
};

export default Leaderboard;
