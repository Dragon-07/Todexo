'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Calendar, 
  LayoutGrid, 
  BarChart2, 
  Focus, 
  Settings,
  ListTodo,
  Moon,
  Inbox,
  Sparkles,
  LogOut,
  Sun
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Initial check for theme
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const mainLinks = [
    { icon: Sparkles, href: '/', label: 'Hoy', color: 'text-primary' },
    { icon: ListTodo, href: '/tasks', label: 'Mis Tareas', color: 'text-primary' },
    { icon: Calendar, href: '/calendar', label: 'Calendario', color: 'text-secondary' },
    { icon: LayoutGrid, href: '/projects', label: 'Proyectos', color: 'text-tertiary' },
    { icon: BarChart2, href: '/stats', label: 'Estadísticas', color: 'text-secondary' },
  ];

  const projects = [
    { label: 'General', color: 'bg-primary' },
    { label: 'Trabajo', color: 'bg-tertiary' },
    { label: 'Personal', color: 'bg-secondary' },
  ];

  return (
    <aside className={clsx("flex flex-col glass-panel border-r border-white/20 dark:border-white/10 p-6 h-full", className)}>
      {/* Brand */}
      <div className="flex items-center justify-between mb-10 px-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg glow-primary">
            <span className="text-white font-bold text-lg">TX</span>
          </div>
          <span className="text-xl font-bold text-on-surface tracking-tight">Todexo</span>
        </div>
        
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-surface-variant/30 text-on-surface-variant hover:text-primary transition-all active:scale-90"
          title={theme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Nav Section */}
      <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-4 px-2">Navegación</h3>
          <nav className="space-y-1">
            {mainLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                    isActive 
                      ? "bg-surface-variant text-on-surface font-bold shadow-sm" 
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  )}
                >
                  <Icon size={18} className={clsx(isActive ? link.color : "group-hover:text-on-surface transition-colors")} />
                  <span className="text-sm">{link.label}</span>
                  {isActive && <div className="ml-auto w-1 h-1 rounded-full bg-primary glow-primary"></div>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-4 px-2">Proyectos</h3>
          <nav className="space-y-1">
            {projects.map((project) => (
              <button key={project.label} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all group">
                <div className={clsx("w-2 h-2 rounded-full", project.color, "opacity-60 group-hover:opacity-100 transition-opacity")} />
                <span className="text-sm">{project.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-6 border-t border-surface-variant/50 space-y-2">
        <Link 
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
        >
          <Settings size={18} />
          <span className="text-sm">Configuración</span>
        </Link>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-on-surface-variant hover:text-error hover:bg-error/10 transition-all"
        >
          <LogOut size={18} />
          <span className="text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
