import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";

type DashboardTab = "day" | "week" | "month";

interface AppTourContextValue {
  isTourOpen: boolean;
  openTour: () => void;
  closeTour: () => void;
  registerDashboardTabSetter: (setter: ((tab: DashboardTab) => void) | null) => void;
  onTourComplete: () => void;
  getDashboardTabSetter: () => ((tab: DashboardTab) => void) | null;
}

const AppTourContext = createContext<AppTourContextValue | null>(null);

const fireConfetti = () => {
  // Fire confetti from both sides
  const defaults = {
    spread: 60,
    ticks: 100,
    gravity: 0.8,
    decay: 0.94,
    startVelocity: 30,
    colors: ['#10b981', '#22c55e', '#4ade80', '#86efac', '#fbbf24', '#f59e0b'],
  };

  // Left side burst
  confetti({
    ...defaults,
    particleCount: 50,
    origin: { x: 0.2, y: 0.6 },
    angle: 60,
  });

  // Right side burst
  confetti({
    ...defaults,
    particleCount: 50,
    origin: { x: 0.8, y: 0.6 },
    angle: 120,
  });

  // Center celebration after a short delay
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 80,
      origin: { x: 0.5, y: 0.7 },
      spread: 100,
    });
  }, 150);
};

export const AppTourProvider = ({ children }: { children: React.ReactNode }) => {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const dashboardTabSetterRef = useRef<((tab: DashboardTab) => void) | null>(null);

  const registerDashboardTabSetter = useCallback(
    (setter: ((tab: DashboardTab) => void) | null) => {
      dashboardTabSetterRef.current = setter;
    },
    []
  );

  const getDashboardTabSetter = useCallback(
    () => dashboardTabSetterRef.current,
    []
  );

  const openTour = useCallback(() => setIsTourOpen(true), []);
  const closeTour = useCallback(() => setIsTourOpen(false), []);

  const onTourComplete = useCallback(() => {
    const alreadyCompleted = localStorage.getItem("app_tour_completed") === "true";
    localStorage.setItem("app_tour_completed", "true");
    setIsTourOpen(false);
    dashboardTabSetterRef.current?.("day");
    
    // Fire confetti only on first-time completion
    if (!alreadyCompleted) {
      setTimeout(() => fireConfetti(), 300);
    }
  }, []);

  const value = useMemo<AppTourContextValue>(
    () => ({
      isTourOpen,
      openTour,
      closeTour,
      registerDashboardTabSetter,
      onTourComplete,
      getDashboardTabSetter,
    }),
    [isTourOpen, openTour, closeTour, registerDashboardTabSetter, onTourComplete, getDashboardTabSetter]
  );

  return <AppTourContext.Provider value={value}>{children}</AppTourContext.Provider>;
};

export const useAppTour = () => {
  const ctx = useContext(AppTourContext);
  if (!ctx) throw new Error("useAppTour must be used within AppTourProvider");
  return ctx;
};
