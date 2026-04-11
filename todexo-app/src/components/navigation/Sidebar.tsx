'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Calendar, 
  Users, 
  User as UserIcon,
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
import NextTaskButton from './NextTaskButton';
import TodayTasksSummary from './TodayTasksSummary';
import { useUserRole } from '@/hooks/useUserRole';
import { useImpersonation } from '@/context/ImpersonationContext';

export default function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isImpersonating, targetUser } = useImpersonation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const { role, fullName } = useUserRole();

  const allLinks = [
    { icon: Sparkles, href: '/', label: 'Hoy', color: 'text-primary' },
    { icon: ListTodo, href: '/tasks', label: 'Mis Tareas', color: 'text-primary' },
    { icon: Calendar, href: '/calendar', label: 'Calendario', color: 'text-secondary' },
    { icon: Users, href: '/users', label: 'Usuarios', color: 'text-tertiary', adminOnly: true },
    { icon: BarChart2, href: '/stats', label: 'Estadísticas', color: 'text-secondary' },
  ];

  const mainLinks = allLinks.filter(link =>
    !link.adminOnly || role === 'owner' || role === 'admin'
  );

  // Nombre a mostrar: si está supervisando, el del usuario supervisado
  const displayName = isImpersonating ? targetUser?.full_name : fullName;
  const displayLabel = isImpersonating ? 'Supervisando' : 'Usuario';

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
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-4 px-2 tracking-widest">pendientes</h3>
          <NextTaskButton />
          <TodayTasksSummary />

        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-6 border-t border-surface-variant/50 space-y-2">
        {/* User Info Section */}
        <div className={clsx(
          "flex items-center gap-3 px-3 py-3 mb-2 rounded-2xl border",
          isImpersonating 
            ? "bg-indigo-500/10 border-indigo-500/20" 
            : "bg-surface-variant/20 border-white/5"
        )}>
          <div className={clsx(
            "w-8 h-8 rounded-lg flex items-center justify-center text-white scale-90",
            isImpersonating
              ? "bg-gradient-to-br from-indigo-500 to-violet-600"
              : "bg-gradient-to-br from-primary/80 to-secondary/80"
          )}>
             <UserIcon size={16} />
          </div>
          <div className="flex-1 min-w-0">
             <p className={clsx(
               "text-[10px] font-bold uppercase tracking-widest leading-none mb-1",
               isImpersonating ? "text-indigo-400" : "text-on-surface-variant"
             )}>{displayLabel}</p>
             <p className="text-xs font-bold text-on-surface truncate">{displayName || 'Cargando...'}</p>
          </div>
        </div>

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
