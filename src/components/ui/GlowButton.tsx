import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { haptics } from "@/utils/haptics";

interface GlowButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "accent" | "destructive";
  size?: "default" | "lg" | "xl";
  icon?: LucideIcon;
  className?: string;
  loading?: boolean;
  fullWidth?: boolean;
}

export const GlowButton = ({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "default",
  icon: Icon,
  className,
  loading = false,
  fullWidth = false,
}: GlowButtonProps) => {
  const variants = {
    primary: {
      bg: "bg-gradient-to-r from-primary to-cyan-dark",
      text: "text-primary-foreground",
      glow: "shadow-glow-md hover:shadow-glow-lg",
      hoverBg: "hover:from-primary/90 hover:to-cyan-dark/90",
    },
    accent: {
      bg: "bg-gradient-to-r from-accent to-green-glow",
      text: "text-accent-foreground",
      glow: "shadow-glow-accent hover:shadow-[0_0_30px_hsl(105_100%_54%_/_0.5)]",
      hoverBg: "hover:from-accent/90 hover:to-green-glow/90",
    },
    destructive: {
      bg: "bg-gradient-to-r from-destructive to-red-600",
      text: "text-destructive-foreground",
      glow: "shadow-[0_0_20px_hsl(0_85%_55%_/_0.4)] hover:shadow-[0_0_30px_hsl(0_85%_55%_/_0.5)]",
      hoverBg: "hover:from-destructive/90 hover:to-red-600/90",
    },
  };

  const sizes = {
    default: "h-12 px-6 text-sm",
    lg: "h-14 px-8 text-base",
    xl: "h-16 px-10 text-lg",
  };

  const v = variants[variant];
  const s = sizes[size];

  const handleClick = () => {
    if (!disabled && !loading) {
      haptics.medium();
      onClick?.();
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled || loading}
      className={cn(
        "relative rounded-xl font-bold uppercase tracking-widest",
        "flex items-center justify-center gap-2",
        "transition-all duration-300",
        v.bg,
        v.text,
        v.glow,
        v.hoverBg,
        s,
        fullWidth && "w-full",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 rounded-xl overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-gradient-to-t from-transparent via-white/10 to-white/20" />
      </div>

      {/* Content */}
      <span className="relative flex items-center gap-2">
        {loading ? (
          <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : Icon ? (
          <Icon className="h-5 w-5" />
        ) : null}
        {children}
      </span>
    </motion.button>
  );
};