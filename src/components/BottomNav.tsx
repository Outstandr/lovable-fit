import { Home, Trophy, CheckSquare, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: Trophy, label: "Leaderboard", path: "/leaderboard" },
  { icon: CheckSquare, label: "Protocol", path: "/protocol" },
  { icon: User, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-area-pb">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-all duration-200",
                isActive 
                  ? "text-primary border-t-2 border-primary -mt-[2px]" 
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
