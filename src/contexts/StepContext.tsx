import React, { createContext, useContext, ReactNode } from 'react';
import { usePedometer, PedometerState } from '@/hooks/usePedometer';

interface StepContextType extends PedometerState {
  requestPermission: () => Promise<boolean>;
  startTracking: () => Promise<boolean>;
  stopTracking: () => void;
  syncToDatabase: () => Promise<void>;
}

const StepContext = createContext<StepContextType | null>(null);

export function StepProvider({ children }: { children: ReactNode }) {
  const stepData = usePedometer();
  return (
    <StepContext.Provider value={stepData}>
      {children}
    </StepContext.Provider>
  );
}

export function useSteps() {
  const context = useContext(StepContext);
  if (!context) {
    throw new Error('useSteps must be used within StepProvider');
  }
  return context;
}
