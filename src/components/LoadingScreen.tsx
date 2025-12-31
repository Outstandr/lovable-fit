import { motion } from "framer-motion";
import { Footprints, Satellite, Loader2, Zap } from "lucide-react";

interface LoadingScreenProps {
    variant?: 'default' | 'gps' | 'protocol';
    message?: string;
}

export const LoadingScreen = ({ variant = 'default', message }: LoadingScreenProps) => {
    const messages = {
        default: message || "Warming up...",
        gps: message || "Acquiring GPS Signal...",
        protocol: message || "Initializing Protocol..."
    };

    const displayMessage = messages[variant];

    if (variant === 'gps') {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-background">
                {/* Orbiting satellites animation */}
                <div className="relative w-32 h-32 mb-8">
                    {/* Center dot */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary" />

                    {/* Orbiting satellites */}
                    {[0, 120, 240].map((rotation, i) => (
                        <motion.div
                            key={i}
                            className="absolute top-1/2 left-1/2"
                            style={{
                                transformOrigin: "0 0",
                            }}
                            animate={{
                                rotate: [rotation, rotation + 360],
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "linear",
                                delay: i * 0.3,
                            }}
                        >
                            <div className="w-16 h-16 -translate-x-1/2 -translate-y-1/2">
                                <Satellite className="h-6 w-6 text-primary" />
                            </div>
                        </motion.div>
                    ))}

                    {/* Signal waves */}
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={`wave-${i}`}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-primary/30 rounded-full"
                            initial={{ width: 0, height: 0, opacity: 0.8 }}
                            animate={{
                                width: [0, 128],
                                height: [0, 128],
                                opacity: [0.8, 0],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.6,
                                ease: "easeOut",
                            }}
                        />
                    ))}
                </div>

                <motion.h2
                    className="text-xl font-bold uppercase tracking-widest text-foreground mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {displayMessage}
                </motion.h2>

                <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Searching for satellites...</span>
                </div>
            </div>
        );
    }

    if (variant === 'protocol') {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-background">
                {/* Circular progress ring */}
                <div className="relative w-32 h-32 mb-8">
                    <svg className="w-full h-full -rotate-90">
                        <defs>
                            <linearGradient id="loadingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="hsl(186, 100%, 65%)" />
                                <stop offset="100%" stopColor="hsl(186, 100%, 40%)" />
                            </linearGradient>
                        </defs>
                        <motion.circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            stroke="url(#loadingGradient)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray="351.86"
                            initial={{ strokeDashoffset: 351.86 }}
                            animate={{ strokeDashoffset: [351.86, 0, 351.86] }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    </svg>

                    {/* Center icon */}
                    <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0.7, 1, 0.7],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    >
                        <Zap className="h-12 w-12 text-primary" />
                    </motion.div>
                </div>

                <motion.h2
                    className="text-xl font-bold uppercase tracking-widest text-foreground mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {displayMessage}
                </motion.h2>

                <motion.p
                    className="text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    Please wait...
                </motion.p>
            </div>
        );
    }

    // Default: Walking footsteps
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-background">
            {/* Animated footsteps */}
            <div className="relative w-48 h-32 mb-8">
                {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute"
                        style={{
                            left: `${i * 20}%`,
                            top: i % 2 === 0 ? '40%' : '60%',
                        }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: [0, 1, 1, 0],
                            scale: [0, 1, 1, 0],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.3,
                            ease: "easeInOut",
                        }}
                    >
                        <Footprints className="h-8 w-8 text-primary" style={{ transform: i % 2 === 0 ? 'rotate(-15deg)' : 'rotate(15deg)' }} />
                    </motion.div>
                ))}
            </div>

            <motion.h2
                className="text-xl font-bold uppercase tracking-widest text-foreground mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                {displayMessage}
            </motion.h2>

            <motion.p
                className="text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
                Lacing up...
            </motion.p>
        </div>
    );
};
