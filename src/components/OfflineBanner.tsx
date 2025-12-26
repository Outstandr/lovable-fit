import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, CloudOff } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";

interface OfflineBannerProps {
  className?: string;
  variant?: "bar" | "badge";
}

export const OfflineBanner = ({ className = "", variant = "bar" }: OfflineBannerProps) => {
  const { isOnline } = useOfflineSync();

  if (isOnline) return null;

  if (variant === "badge") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 ${className}`}
        >
          <WifiOff className="h-3 w-3 text-amber-400" />
          <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wider">
            Offline
          </span>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`flex items-center justify-center gap-2 py-2 px-4 bg-amber-500/10 border-b border-amber-500/20 ${className}`}
      >
        <CloudOff className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-medium text-amber-400">
          You're offline • Showing cached data
        </span>
      </motion.div>
    </AnimatePresence>
  );
};
