import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface MedicalDisclaimerProps {
  variant?: "full" | "compact";
}

export const MedicalDisclaimer = ({ variant = "compact" }: MedicalDisclaimerProps) => {
  if (variant === "full") {
    return (
      <motion.div 
        className="p-4 rounded-lg bg-warning/10 border border-warning/30"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Medical Disclaimer</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This app is for informational and fitness tracking purposes only. It is not intended 
              to be a substitute for professional medical advice, diagnosis, or treatment. The step 
              counting, distance, and calorie data provided are estimates and may not be 100% accurate.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Always consult a qualified healthcare professional</strong> before starting any 
              exercise program, especially if you have pre-existing medical conditions. If you experience 
              pain or discomfort during activity, stop immediately and seek medical attention.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
      <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground">
        For informational purposes only. Consult a healthcare professional before starting any exercise program.
      </p>
    </div>
  );
};
