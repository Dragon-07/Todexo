'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ListTodo, Calendar, LayoutGrid, BarChart2, Sparkles } from 'lucide-react';
import clsx from 'clsx';

export default function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { icon: Sparkles, href: '/', label: 'Hoy' },
    { icon: ListTodo, href: '/tasks', label: 'Tareas' },
    { icon: Calendar, href: '/calendar', label: 'Fechas' },
    { icon: LayoutGrid, href: '/projects', label: 'Proyectos' },
    { icon: BarChart2, href: '/stats', label: 'Avances' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-surface-container/90 backdrop-blur-2xl border-t border-surface-variant p-2.5 pb-8 flex items-center justify-around z-30 ambient-shadow">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className={clsx(
              "flex flex-col items-center gap-1.5 px-4 py-2 transition-all group",
              isActive ? "text-primary glow-primary" : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <div className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
              isActive ? "bg-surface-variant/30 text-primary" : "group-hover:bg-surface-container-high"
            )}>
               <Icon size={20} className={isActive ? "animate-pulse" : ""} />
            </div>
            <span className={clsx(
              "text-[10px] font-bold uppercase tracking-widest",
              isActive ? "text-primary" : "text-on-surface-variant"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
