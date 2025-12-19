import { motion, Transition } from "framer-motion";
import { ReactNode, forwardRef } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -8,
  },
};

const pageTransition: Transition = {
  type: "tween",
  ease: [0.4, 0, 0.2, 1],
  duration: 0.2,
};

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  ({ children, className = "" }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className={className}
      >
        {children}
      </motion.div>
    );
  }
);

PageTransition.displayName = "PageTransition";
