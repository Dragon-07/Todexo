'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Flame, Target, Trophy, Zap, Crown, Award, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import FloatingQuickAdd from '@/components/FloatingQuickAdd';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { supabase } from '@/lib/supabase';
import { format, subDays, parseISO, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

export default function StatsPage() {
  const { userId, loading: userLoading } = useEffectiveUser();
  const [stats, setStats] = useState({
    todayTasks: 0,
    totalToday: 0,
    successRate: 0,
    streak: 0,
    totalCompleted: 0,
    weeklyData: [] as any[],
    priorityData: { high: 0, medium: 0, low: 0, none: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRealStats() {
      if (!userId) return;
      setLoading(true);

      const todayObj = new Date();
      const todayStr = format(todayObj, 'yyyy-MM-dd');

      // 1. Tareas Hoy
      const { count: completedToday } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('due_date', todayStr)
        .eq('status', 'completed');

      const { count: totalToday } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('due_date', todayStr);

      // 2. Tasa de Éxito (Global) y Total Completadas
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

      // 4. Datos semanales (REAL: Últimos 7 días)
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(todayObj, 6 - i);
        return format(d, 'yyyy-MM-dd');
      });

      const { data: weeklyTasks } = await supabase
        .from('tasks')
        .select('due_date, status')
        .eq('user_id', userId)
        .in('due_date', last7Days);

      const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const weeklyData = last7Days.map(dateStr => {
         const dateObj = parseISO(dateStr);
         const dayName = daysOfWeek[dateObj.getDay()];
         const dayTasks = weeklyTasks?.filter(t => t.due_date === dateStr && t.status === 'completed') || [];
         return {
            name: dayName,
            tasks: dayTasks.length
         }
      });

      // 5. Distribución por Prioridad (Tareas Pendientes)
      const { data: pendingTasks } = await supabase
        .from('tasks')
        .select('priority')
        .eq('user_id', userId)
        .eq('status', 'pending');

      let high = 0, medium = 0, low = 0, none = 0;
      pendingTasks?.forEach(t => {
         // Ajuste para prioridades que son IDs o textos (1, 2, 3 o 'high', 'medium', 'low')
         if (t.priority == 3 || t.priority === 'high' || t.priority === '3') high++;
         else if (t.priority == 2 || t.priority === 'medium' || t.priority === '2') medium++;
         else if (t.priority == 1 || t.priority === 'low' || t.priority === '1') low++;
         else none++;
      });

      setStats({
        todayTasks: completedToday || 0,
        totalToday: totalToday || 0,
        successRate: totalGlobal ? Math.round(((completedGlobal || 0) / totalGlobal) * 100) : 0,
        streak: metrics?.streak_days || 0,
        totalCompleted: completedGlobal || 0,
        weeklyData,
        priorityData: { high, medium, low, none },
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

  // Datos para el gráfico de barras de prioridad
  const priorityChartData = [
    { name: 'Alta', value: stats.priorityData.high, color: '#EF4444' }, // red-500
    { name: 'Media', value: stats.priorityData.medium, color: '#F97316' }, // orange-500
    { name: 'Baja', value: stats.priorityData.low, color: '#3B82F6' }, // blue-500
    { name: 'Sin Asignar', value: stats.priorityData.none, color: '#8b8b99' }, // gray
  ];
  // Find max value to correctly render the percentages, avoid 0 denominator
  const maxPriorityTasks = Math.max(...priorityChartData.map(d => d.value), 1);

  return (
    <div className="flex w-full h-full bg-background overflow-y-auto px-6 py-8 md:p-12 pb-32 lg:pb-12 custom-scrollbar relative">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
        
        <header>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-onSurface mb-2">Estadísticas y Progreso</h1>
          <p className="text-sm text-onSurfaceVariant/80">Basado en tu uso real de Todexo</p>
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

          <div className="glass-panel p-5 rounded-2xl md:p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Total Completadas</h3>
              <div className="glass-icon-container p-2">
                <CheckCircle2 size={16} className="text-indigo-500" />
              </div>
            </div>
            <div className="relative z-10 mt-auto">
              <p className="text-3xl font-bold text-on-surface">{stats.totalCompleted}</p>
              <p className="text-[10px] font-medium text-on-surface-variant mt-1">Tareas en total</p>
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
              <p className="text-[9px] font-bold text-secondary mt-1">↗ De todas tus tareas</p>
            </div>
            <div className="color-blob -right-6 -bottom-6 bg-emerald-500/40"></div>
          </div>

        </div>

        {/* Middle Section - Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Productivity Area Chart */}
          <div className="glass-panel p-6 rounded-2xl md:p-8">
            <h3 className="text-xs font-bold tracking-widest text-onSurfaceVariant uppercase mb-6 flex justify-between">
               Productividad <span className="text-[10px] bg-surfaceVariant px-2 py-1 rounded-md text-onSurface">Últimos 7 días</span>
            </h3>
            <div className="h-[200px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#aaaab3' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#aaaab3' }} allowDecimals={false} />
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
                  <Area type="monotone" dataKey="tasks" name="Completadas" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" style={{ filter: 'drop-shadow(0px 4px 12px rgba(99, 102, 241, 0.4))' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-6 bg-surfaceVariant/30 p-4 rounded-xl flex items-start gap-3 border border-white/5">
               <div className="bg-primary/20 text-primary p-2 rounded-lg flex-shrink-0"><TrendingUp size={16} /></div>
               <div>
                  <h4 className="text-xs font-bold text-onSurface mb-1">Ritmo de Trabajo</h4>
                  <p className="text-[11px] text-onSurfaceVariant/80 leading-relaxed">
                    Has completado un total de {stats.weeklyData.reduce((acc, curr) => acc + curr.tasks, 0)} tareas en los últimos 7 días.
                  </p>
               </div>
            </div>
          </div>

          {/* Priority Distribution Bar Chart */}
          <div className="glass-panel p-6 rounded-2xl md:p-8 flex flex-col">
            <h3 className="text-xs font-bold tracking-widest text-onSurfaceVariant uppercase mb-6 flex justify-between">
              Carga Pendiente <span className="text-[10px] bg-surfaceVariant px-2 py-1 rounded-md text-onSurface">Por Prioridad</span>
            </h3>
            
            <div className="space-y-5 flex-1 mt-2">
              {priorityChartData.map((item, idx) => {
                const percent = Math.round((item.value / maxPriorityTasks) * 100);
                return (
                  <ProgressBar 
                    key={idx} 
                    label={item.name} 
                    value={item.value} 
                    percent={percent} 
                    color={item.color} 
                    glow={item.name === 'Alta' && item.value > 0} 
                  />
                );
              })}
            </div>

            <div className="mt-6 bg-surfaceVariant/30 p-4 rounded-xl flex items-start gap-3 border border-white/5">
               <div className="bg-orange-500/20 text-orange-400 p-2 rounded-lg flex-shrink-0"><AlertCircle size={16} /></div>
               <div>
                  <h4 className="text-xs font-bold text-onSurface mb-1">Atención Requerida</h4>
                  <p className="text-[11px] text-onSurfaceVariant/80 leading-relaxed">
                    Tienes {stats.priorityData.high} tareas de Alta prioridad esperando ser completadas.
                  </p>
               </div>
            </div>
          </div>

        </div>

      </div>
      <FloatingQuickAdd />
    </div>
  );
}

function ProgressBar({ label, value, percent, color, glow = false }: { label: string, value: number, percent: number, color: string, glow?: boolean }) {
   return (
      <div>
         <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
              <span className="text-xs font-medium text-onSurface">{label}</span>
            </div>
            <span className="text-xs font-bold text-onSurfaceVariant">{value} tareas</span>
         </div>
         <div className="h-2 w-full bg-surfaceContainerHighest rounded-full overflow-hidden">
            <div 
               className={clsx("h-full rounded-full transition-all duration-1000", glow ? "shadow-[0_0_8px_currentColor]" : "")} 
               style={{ width: `${percent}%`, backgroundColor: color }}
            ></div>
         </div>
      </div>
   )
}
