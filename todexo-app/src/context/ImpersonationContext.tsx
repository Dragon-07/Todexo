'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface ImpersonatedUser {
  id: string;
  full_name: string;
}

interface ImpersonationContextType {
  targetUser: ImpersonatedUser | null;
  startImpersonation: (user: ImpersonatedUser) => void;
  stopImpersonation: () => void;
  isImpersonating: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [targetUser, setTargetUser] = useState<ImpersonatedUser | null>(null);

  // Persistence to handle page refreshes
  useEffect(() => {
    const saved = localStorage.getItem('impersonation_target');
    if (saved) {
      try {
        setTargetUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('impersonation_target');
      }
    }
  }, []);

  const startImpersonation = (user: ImpersonatedUser) => {
    setTargetUser(user);
    localStorage.setItem('impersonation_target', JSON.stringify(user));
  };

  const stopImpersonation = () => {
    setTargetUser(null);
    localStorage.removeItem('impersonation_target');
  };

  const isImpersonating = !!targetUser;

  return (
    <ImpersonationContext.Provider value={{ targetUser, startImpersonation, stopImpersonation, isImpersonating }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
