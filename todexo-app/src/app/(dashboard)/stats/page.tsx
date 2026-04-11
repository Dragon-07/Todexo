'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Flame, Target, Trophy, Zap, Crown, Award } from 'lucide-react';
import clsx from 'clsx';
import FloatingQuickAdd from '@/components/FloatingQuickAdd';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export default function StatsPage() {
  const { userId, loading: userLoading } = useEffectiveUser();
  const [stats, setStats] = useState({
    todayTasks: 0,
    totalToday: 0,
    successRate: 0,
    streak: 0,
    weeklyData: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRealStats() {
      if (!userId) return;
      setLoading(true);

      const today = format(new Date(), 'yyyy-MM-dd');

      // 1. Tareas Hoy
      const { count: completedToday } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('due_date', today)
        .eq('status', 'completed');

      const { count: totalToday } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('due_date', today);

      // 2. Tasa de Éxito (Global)
      const { count: completedGlobal } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed');

      const { count: totalGlobal } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // 3. Racha (desde user_metrics)
      const { data: metrics } = await supabase
        .from('user_metrics')
        .select('streak_days')
        .eq('user_id', userId)
        .single();

      // 4. Datos semanales (simulados por ahora pero con base real)
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const weeklyData = days.map((name, i) => ({
        name,
        tasks: Math.floor(Math.random() * 5) + (i === new Date().getDay() ? (completedToday || 0) : 2)
      }));

      setStats({
        todayTasks: completedToday || 0,
        totalToday: totalToday || 0,
        successRate: totalGlobal ? Math.round(((completedGlobal || 0) / totalGlobal) * 100) : 0,
        streak: metrics?.streak_days || 0,
        weeklyData,
      });
      setLoading(false);
    }

    if (!userLoading) {
      fetchRealStats();
    }
  }, [userId, userLoading]);

  const productivityData = stats.weeklyData.length > 0 ? stats.weeklyData : [
    { name: 'Lun', tasks: 0 },
    { name: 'Mar', tasks: 0 },
    { name: 'Mié', tasks: 0 },
    { name: 'Jue', tasks: 0 },
    { name: 'Vie', tasks: 0 },
    { name: 'Sáb', tasks: 0 },
    { name: 'Dom', tasks: 0 },
  ];
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-on-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="font-bold tracking-widest text-xs uppercase animate-pulse">Analizando rendimiento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full bg-background overflow-y-auto px-6 py-8 md:p-12 pb-32 lg:pb-12 custom-scrollbar relative">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
        
        <header>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-onSurface mb-2">Estadísticas y Progreso</h1>
        </header>

        {/* Top Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="glass-panel p-5 rounded-2xl md:p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Racha Actual</h3>
              <div className="glass-icon-container p-2">
                <Flame size={16} className="text-orange-500" />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-3xl font-bold text-on-surface mb-2">{stats.streak} <span className="text-sm font-medium text-on-surface-variant">días</span></p>
              <svg width="100%" height="24" viewBox="0 0 100 24" className="overflow-visible opacity-60">
                <polyline points="0,20 20,24 40,15 60,10 80,18 100,2" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {/* Color Blob */}
            <div className="color-blob -right-6 -bottom-6 bg-orange-500/40"></div>
          </div>

          <div className="glass-panel p-5 rounded-2xl md:p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Tareas Hoy</h3>
              <div className="glass-icon-container p-2">
                <Zap size={16} className="text-amber-500" />
              </div>
            </div>
            <div className="flex items-end justify-between relative z-10">
              <p className="text-3xl font-bold text-on-surface">{stats.todayTasks}<span className="text-xl text-on-surface-variant font-medium">/{stats.totalToday}</span></p>
              <div className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/5 dark:bg-black/20">
                <svg className="w-full h-full transform -rotate-90 absolute inset-0" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" className="stroke-white/10 dark:stroke-white/5" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15" fill="none" className="stroke-primary" strokeWidth="3" strokeDasharray="94.248" strokeDashoffset={94.248 - (stats.totalToday ? (stats.todayTasks/stats.totalToday) : 0) * 94.248} />
                </svg>
                <span className="relative font-bold text-[10px] text-on-surface z-10">{stats.totalToday ? Math.round((stats.todayTasks/stats.totalToday) * 100) : 0}%</span>
              </div>
            </div>
            <div className="color-blob -right-6 -bottom-6 bg-amber-500/40"></div>
          </div>

          <div className="glass-panel p-5 rounded-2xl md:p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Semana</h3>
              <div className="glass-icon-container p-2">
                <Target size={16} className="text-indigo-500" />
              </div>
            </div>
            <div className="flex items-end justify-between h-10 gap-1 mt-2 relative z-10">
              {stats.weeklyData.map((d, i) => (
                <div key={i} className="w-full bg-primary/60 rounded-sm hover:bg-primary transition-all duration-300" style={{ height: `${(d.tasks / 10) * 100}%` }}></div>
              ))}
            </div>
            <div className="color-blob -right-6 -bottom-6 bg-indigo-500/40"></div>
          </div>

          <div className="glass-panel p-5 rounded-2xl md:p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Tasa Éxito</h3>
              <div className="glass-icon-container p-2">
                <Award size={16} className="text-emerald-500" />
              </div>
            </div>
            <div className="relative z-10 mt-auto">
              <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">{stats.successRate}%</p>
              <p className="text-[9px] font-bold text-secondary mt-1">↗ Basado en historial</p>
            </div>
            <div className="color-blob -right-6 -bottom-6 bg-emerald-500/40"></div>
          </div>

        </div>

        {/* Middle Section - Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Productivity Area Chart */}
          <div className="glass-panel p-6 rounded-2xl md:p-8">
            <h3 className="text-xs font-bold tracking-widest text-onSurfaceVariant uppercase mb-6 flex justify-between">
               Productividad Semanal <span className="text-[10px] bg-surfaceVariant px-2 py-1 rounded-md">Últimos 7 días</span>
            </h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productivityData}>
                  <defs>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#aaaab3' }} dy={10} />
                  <Tooltip 
                     contentStyle={{ 
                        backgroundColor: 'var(--surface-container-high)', 
                        border: '1px solid var(--surface-variant)', 
                        borderRadius: '12px', 
                        fontSize: '12px',
                        color: 'var(--on-surface)'
                     }}
                     itemStyle={{ color: 'var(--on-surface)' }}
                  />
                  <Area type="monotone" dataKey="tasks" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" style={{ filter: 'drop-shadow(0px 4px 12px rgba(99, 102, 241, 0.4))' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Area Distribution */}
          <div className="glass-panel p-6 rounded-2xl md:p-8 flex flex-col">
            <h3 className="text-xs font-bold tracking-widest text-onSurfaceVariant uppercase mb-6">Distribución por Área</h3>
            
            <div className="space-y-5 flex-1">
               <ProgressBar label="Trabajo" percent={70} color="#6366F1" />
               <ProgressBar label="Personal" percent={55} color="#8B5CF6" />
               <ProgressBar label="Salud" percent={90} color="#14B8A6" glow />
               <ProgressBar label="Aprendizaje" percent={30} color="#F59E0B" />
               <ProgressBar label="Finanzas" percent={15} color="#EC4899" />
            </div>

            <div className="mt-6 bg-surfaceVariant/50 p-4 rounded-xl flex items-start gap-3">
               <div className="bg-tertiary/20 text-tertiary p-1.5 rounded-lg"><Target size={16} /></div>
               <div>
                  <h4 className="text-xs font-bold text-onSurface mb-0.5">Insight Semanal</h4>
                  <p className="text-[10px] text-onSurfaceVariant leading-relaxed">Tu enfoque en "Salud" ha mejorado un 15% respecto al mes pasado. ¡Sigue así!</p>
               </div>
            </div>
          </div>

        </div>

        {/* Achievements Section */}
        <div className="glass-panel p-6 rounded-2xl md:p-8">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold tracking-widest text-onSurfaceVariant uppercase">Historial de Logros</h3>
              <button className="text-[10px] font-bold text-primary hover:text-onSurface transition-colors">Ver todos</button>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <AchievementCard title="Primera Semana" icon={<Trophy size={20} />} unlocked glowColor="glow-primary" />
              <AchievementCard title="Velocista" icon={<Zap size={20} />} unlocked glowColor="glow-tertiary" />
              <AchievementCard title="Tirador de élite" icon={<Target size={20} />} />
              <AchievementCard title="Imparable" icon={<Flame size={20} />} />
              <AchievementCard title="Maestro" icon={<Crown size={20} />} />
           </div>
        </div>

      </div>
      <FloatingQuickAdd />
    </div>
  );
}

function ProgressBar({ label, percent, color, glow = false }: { label: string, percent: number, color: string, glow?: boolean }) {
   return (
      <div>
         <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-onSurface">{label}</span>
            <span className="text-xs font-bold" style={{ color }}>{percent}%</span>
         </div>
         <div className="h-1.5 w-full bg-surfaceContainerHighest rounded-full overflow-hidden">
            <div 
               className={clsx("h-full rounded-full transition-all duration-1000", glow ? "shadow-[0_0_8px_currentColor]" : "")} 
               style={{ width: `${percent}%`, backgroundColor: color, color }}
            ></div>
         </div>
      </div>
   )
}

function AchievementCard({ title, icon, unlocked = false, glowColor = "" }: { title: string, icon: React.ReactNode, unlocked?: boolean, glowColor?: string }) {
   return (
      <div className={clsx(
         "p-4 rounded-2xl flex flex-col items-center text-center gap-3 transition-all duration-300",
         unlocked 
            ? `glass-panel shadow-lg hover:-translate-y-1 ${glowColor}` 
            : "glass shadow-inner opacity-40 grayscale border-white/5"
      )}>
         <div className={clsx(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            unlocked ? "glass-icon-container text-on-surface" : "bg-white/5 text-on-surface-variant"
         )}>
            {icon}
         </div>
         <div>
            <h4 className="text-xs font-bold text-on-surface mb-0.5">{title}</h4>
            <span className={clsx("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase", unlocked ? "bg-primary/20 text-primary" : "text-on-surface-variant")}>
               {unlocked ? "Completado" : "Bloqueado"}
            </span>
         </div>
      </div>
   )
}
