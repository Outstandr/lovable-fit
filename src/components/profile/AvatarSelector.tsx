import { motion } from 'framer-motion';
import { Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AVATARS = [
  { id: 'avatar_1', url: '/avatars/memoji-1.png', label: 'Athlete' },
  { id: 'avatar_2', url: '/avatars/memoji-2.png', label: 'Runner' },
  { id: 'avatar_3', url: '/avatars/memoji-3.png', label: 'Yogi' },
  { id: 'avatar_4', url: '/avatars/memoji-4.png', label: 'Lifter' },
  { id: 'avatar_5', url: '/avatars/memoji-5.png', label: 'Cyclist' },
  { id: 'avatar_6', url: '/avatars/memoji-6.png', label: 'Swimmer' },
  { id: 'avatar_7', url: '/avatars/memoji-7.png', label: 'Boxer' },
  { id: 'avatar_8', url: '/avatars/memoji-8.png', label: 'Skater' },
  { id: 'avatar_9', url: '/avatars/memoji-9.png', label: 'Surfer' },
  { id: 'avatar_10', url: '/avatars/memoji-10.png', label: 'Hiker' },
  { id: 'avatar_11', url: '/avatars/memoji-11.png', label: 'Dancer' },
  { id: 'avatar_12', url: '/avatars/memoji-12.png', label: 'Fighter' },
  { id: 'avatar_13', url: '/avatars/memoji-13.png', label: 'Sprinter' },
  { id: 'avatar_14', url: '/avatars/memoji-14.png', label: 'Climber' },
  { id: 'avatar_15', url: '/avatars/memoji-15.png', label: 'Triathlete' },
  { id: 'avatar_16', url: '/avatars/memoji-16.png', label: 'Cyclist Pro' },
  { id: 'avatar_17', url: '/avatars/memoji-17.png', label: 'Gymnast' },
  { id: 'avatar_18', url: '/avatars/memoji-18.png', label: 'Tennis' },
  { id: 'avatar_19', url: '/avatars/memoji-19.png', label: 'Baller' },
  { id: 'avatar_20', url: '/avatars/memoji-20.png', label: 'Golfer' },
];

interface AvatarSelectorProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

export const AvatarSelector = ({ selectedId, onSelect, className }: AvatarSelectorProps) => {
  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>
      {AVATARS.map((avatar, index) => {
        const isSelected = selectedId === avatar.id;

        return (
          <motion.button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 group bg-muted/30",
              isSelected 
                ? "border-primary shadow-[0_0_15px_rgba(59,130,246,0.5)] ring-2 ring-primary/20 ring-offset-2 ring-offset-background" 
                : "border-transparent hover:border-primary/50"
            )}
          >
            {/* Fallback Icon if image fails/missing */}
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
              <User className="w-8 h-8" />
            </div>

            {/* Asset Image */}
            <img 
              src={avatar.url} 
              alt={avatar.label}
              className={cn(
                "absolute inset-0 w-full h-full object-cover z-10 transition-transform duration-500",
                isSelected ? "scale-110" : "group-hover:scale-110"
              )}
              onError={(e) => {
                // Hide broken images to fallback to the User icon
                (e.target as HTMLImageElement).style.opacity = '0';
              }}
            />

            {/* Selection Checkmark */}
            {isSelected && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 z-20 bg-primary text-primary-foreground rounded-full p-1 shadow-md"
              >
                <Check className="w-3 h-3" strokeWidth={3} />
              </motion.div>
            )}

            {/* Gradient Overlay */}
            <div className={cn(
              "absolute inset-0 z-10 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 transition-opacity duration-300",
              isSelected ? "opacity-100" : "group-hover:opacity-100"
            )} />
            
            <span className={cn(
              "absolute bottom-2 left-0 right-0 text-center text-[10px] font-bold z-20 transition-all duration-300 translate-y-4 opacity-0 uppercase tracking-widest",
              isSelected ? "translate-y-0 opacity-100 text-primary" : "group-hover:translate-y-0 group-hover:opacity-100"
            )}>
              {avatar.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};
