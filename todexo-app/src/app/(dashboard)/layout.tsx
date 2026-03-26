import Sidebar from '@/components/navigation/Sidebar';
import MobileNav from '@/components/navigation/MobileNav';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationService from '@/components/NotificationService';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full relative">
      <NotificationService />
      <Sidebar className="hidden md:flex flex-col w-[250px] shrink-0" />
      <main className="flex-1 overflow-visible relative pb-16 md:pb-0 h-screen overflow-y-auto">
        {/* Theme Toggle - Fixed in top right */}
        <div className="fixed top-6 right-6 z-50">
          <ThemeToggle />
        </div>
        
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
