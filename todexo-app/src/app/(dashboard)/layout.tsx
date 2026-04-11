import Sidebar from '@/components/navigation/Sidebar';
import MobileNav from '@/components/navigation/MobileNav';
import ThemeToggle from '@/components/ThemeToggle';
import DigitalClock from '@/components/DigitalClock';
import NotificationService from '@/components/NotificationService';
import DashboardClientWrapper from '@/components/navigation/DashboardClientWrapper';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardClientWrapper>
      <div className="flex min-h-screen w-full relative">
        <NotificationService />
        <Sidebar className="hidden md:flex flex-col w-[250px] shrink-0" />
        <main className="flex-1 overflow-visible relative pb-16 md:pb-0 h-screen overflow-y-auto">
          {/* Top Right Actions: Clock & Theme Toggle */}
          <div className="fixed top-6 right-6 z-50 flex flex-col items-end gap-2">
            <ThemeToggle />
            <DigitalClock className="hidden sm:flex" />
          </div>
          
          {children}
        </main>
        <MobileNav />
      </div>
    </DashboardClientWrapper>
  );
}
