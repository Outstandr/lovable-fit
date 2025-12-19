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

  const activeIndex = navItems.findIndex(item => location.pathname === item.path);

  return (
    <nav 
      className="bottom-nav"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="bottom-nav-inner">
        <div className="bottom-nav-content relative">
          {/* Active background indicator */}
          {activeIndex >= 0 && (
            <motion.div 
              className="absolute top-1/2 -translate-y-1/2 h-10 rounded-xl bg-primary/15 border border-primary/20"
              style={{ width: `calc(100% / ${navItems.length} - 8px)` }}
              initial={false}
              animate={{ 
                left: `calc(${activeIndex * (100 / navItems.length)}% + 4px)` 
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}

          {/* Active Indicator Line - positioned at top of nav */}
          {activeIndex >= 0 && (
            <motion.div 
              className="absolute top-0 h-0.5 rounded-full bg-gradient-to-r from-primary via-cyan-glow to-primary"
              style={{ width: 32 }}
              initial={false}
              animate={{ 
                left: `calc(${(activeIndex + 0.5) * (100 / navItems.length)}% - 16px)` 
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          
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
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full touch-target relative z-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.9 }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                role="tab"
              >
                {/* Icon with animation */}
                <motion.div 
                  className={`flex items-center justify-center h-6 w-6 transition-colors duration-200 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                </motion.div>
                
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