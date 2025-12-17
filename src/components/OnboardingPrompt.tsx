import { motion, AnimatePresence } from "framer-motion";
import { User, ArrowRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface OnboardingPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip: () => void;
}

export const OnboardingPrompt = ({ isOpen, onClose, onSkip }: OnboardingPromptProps) => {
  const navigate = useNavigate();

  const handleSetupNow = () => {
    onClose();
    navigate('/health-profile');
  };

  const handleRemindLater = () => {
    onSkip();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleRemindLater}
          />

          {/* Bottom Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 p-4"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-md mx-auto relative overflow-hidden">
              {/* Subtle gradient accent */}
              <div 
                className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60"
              />

              {/* Close button */}
              <button
                onClick={handleRemindLater}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Icon */}
              <motion.div
                className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <User className="h-8 w-8 text-primary" />
              </motion.div>

              {/* Content */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Complete Your Profile
                </h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Add your health details to personalize calorie tracking and get more accurate fitness insights.
                </p>
              </motion.div>

              {/* Actions */}
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button
                  variant="tactical"
                  size="full"
                  onClick={handleSetupNow}
                  className="h-12 font-semibold"
                >
                  Set Up Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <button
                  onClick={handleRemindLater}
                  className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Remind Me Later
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
