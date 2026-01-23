import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

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
    localStorage.setItem("app_tour_completed", "true");
    setIsTourOpen(false);
    dashboardTabSetterRef.current?.("day");
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
