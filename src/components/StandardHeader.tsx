import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { haptics } from "@/utils/haptics";

interface StandardHeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    backTo?: string; // Optional: Force redirect to a specific path
    rightAction?: ReactNode;
    className?: string; // Optional: Additional classes
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
            // Check if there's history, otherwise fallback to home
            if (window.history.length > 2) {
                navigate(-1);
            } else {
                navigate('/', { replace: true });
            }
        }
    };

    return (
        <motion.header
            className={`relative z-50 flex items-center justify-between px-4 py-4 bg-background/80 backdrop-blur-md border-b border-white/5 header-safe ${className}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="flex items-center gap-3 flex-1">
                {showBack && (
                    <button
                        onClick={handleBack}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-smooth -ml-2"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                )}

                <div className="flex flex-col">
                    <h1 className="text-lg font-bold tracking-tight text-foreground uppercase">
                        {title}
                    </h1>
                    {subtitle && (
                        <span className="text-xs font-medium text-muted-foreground">
                            {subtitle}
                        </span>
                    )}
                </div>
            </div>

            {rightAction && (
                <div className="flex items-center justify-end pl-2">
                    {rightAction}
                </div>
            )}
        </motion.header>
    );
};
