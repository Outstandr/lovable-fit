import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { haptics } from "@/utils/haptics";

interface StandardHeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    backTo?: string;
    rightAction?: ReactNode;
    className?: string;
}

export const StandardHeader = ({
    title,
    subtitle,
    showBack = false,
    backTo,
    rightAction,
    className = ""
}: StandardHeaderProps) => {
    const navigate = useNavigate();

    const handleBack = () => {
        haptics.light();
        if (backTo) {
            navigate(backTo);
        } else {
            if (window.history.length > 2) {
                navigate(-1);
            } else {
                navigate('/', { replace: true });
            }
        }
    };

    return (
        <motion.header
            className={`top-header ${className}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="top-header-inner">
                <div className="flex items-center justify-between w-full">
                    {/* Left Side - Back Button or Spacer */}
                    <div className="w-10 h-10 flex items-center justify-center">
                        {showBack && (
                            <button
                                onClick={handleBack}
                                className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-smooth"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                        )}
                    </div>

                    {/* Center - Title */}
                    <div className="flex flex-col items-center justify-center flex-1">
                        {/* Enhanced Title with Gradient and Glow */}
                        <div className="relative">
                            <h1 className="text-xl font-bold tracking-[0.2em] uppercase relative z-10 text-gradient-cyan animate-glow-pulse whitespace-nowrap">
                                {title}
                            </h1>
                            {/* Glow effect layer */}
                            <div className="absolute inset-0 text-xl font-bold tracking-[0.2em] uppercase blur-sm opacity-50 text-primary animate-pulse-ring pointer-events-none whitespace-nowrap">
                                {title}
                            </div>
                            {/* Accent line under title */}
                            <motion.div 
                                className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mt-1 rounded-full"
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: "100%", opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.6 }}
                            />
                        </div>
                        
                        {subtitle && (
                            <motion.span 
                                className="text-xs font-medium text-muted-foreground mt-1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                {subtitle}
                            </motion.span>
                        )}
                    </div>

                    {/* Right Side - Action Button or Spacer */}
                    <motion.div 
                        className="w-10 h-10 flex items-center justify-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        {rightAction}
                    </motion.div>
                </div>
            </div>
        </motion.header>
    );
};
