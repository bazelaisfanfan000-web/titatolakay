"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

interface SessionTimeoutContextType {
  isSessionActive: boolean;
  resetSession: () => void;
  clearSession: () => void;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined);

export function SessionTimeoutProvider({ children }: { children: ReactNode }) {
  const sessionTimeout = useSessionTimeout();

  return (
    <SessionTimeoutContext.Provider value={sessionTimeout}>
      {children}
    </SessionTimeoutContext.Provider>
  );
}

export function useSessionTimeoutContext() {
  const context = useContext(SessionTimeoutContext);
  if (context === undefined) {
    throw new Error('useSessionTimeoutContext must be used within a SessionTimeoutProvider');
  }
  return context;
}
