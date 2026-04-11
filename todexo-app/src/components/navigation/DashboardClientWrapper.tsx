'use client';

import { ImpersonationProvider } from '@/context/ImpersonationContext';
import ImpersonationBanner from '@/components/navigation/ImpersonationBanner';

export default function DashboardClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ImpersonationProvider>
      <ImpersonationBanner />
      {children}
    </ImpersonationProvider>
  );
}
