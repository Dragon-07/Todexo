import Sidebar from '@/components/navigation/Sidebar';
import MobileNav from '@/components/navigation/MobileNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar className="hidden md:flex flex-col w-[250px] shrink-0" />
      <main className="flex-1 overflow-visible relative pb-16 md:pb-0 h-screen overflow-y-auto">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
