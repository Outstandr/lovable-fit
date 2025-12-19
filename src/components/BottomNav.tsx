import { Home, Trophy, Headphones, FileText, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { haptics } from '@/utils/haptics';

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Trophy, label: "Board", path: "/leaderboard" },
  { icon: Headphones, label: "Audio", path: "/audiobook" },
  { icon: FileText, label: "Protocol", path: "/protocol" },
  { icon: User, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav 
      className="bottom-nav"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="bottom-nav-inner">
        <div className="bottom-nav-content">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <motion.button
                key={item.path}
                onClick={() => {
                  haptics.light();
                  navigate(item.path);
                }}
                className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative touch-target"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                role="tab"
              >
                {/* Active Indicator */}
                {isActive && (
                  <motion.div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary"
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                
                {/* Icon - Perfectly Centered */}
                <div className={`flex items-center justify-center h-6 w-6 transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                
                {/* Label */}
                <span className={`text-[10px] font-semibold uppercase tracking-wider transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
