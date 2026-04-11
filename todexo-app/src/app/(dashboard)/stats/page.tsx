'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, LineChart, Line, CartesianGrid, LabelList } from 'recharts';
import { Flame, Target, Trophy, Zap, Crown, Award, CheckCircle2, TrendingUp, AlertCircle, Clock, AlertTriangle, Activity, Calendar } from 'lucide-react';
import clsx from 'clsx';
import FloatingQuickAdd from '@/components/FloatingQuickAdd';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { supabase } from '@/lib/supabase';
import { format, subDays, parseISO, isSameDay, differenceInHours, differenceInMinutes, startOfDay, endOfDay } from 'date-fns';
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
    procrastination: { onTime: 0, delayed: 0 },
    delayAge: { light: 0, medium: 0, critical: 0 },
    punctuality: { onTime: 0, late: 0 },
    efficiencyTrend: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRealStats() {
      if (!userId) return;
      setLoading(true);

      const todayObj = new Date();
      const todayStr = format(todayObj, 'yyyy-MM-dd');

      // Tareas Hoy
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

      const { count: completedGlobal } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed');

      const { count: totalGlobal } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { data: metrics } = await supabase
        .from('user_metrics')
        .select('streak_days')
        .eq('user_id', userId)
        .single();

      // Semanal (ultimos 7 dias)
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(todayObj, 6 - i);
        return format(d, 'yyyy-MM-dd');
      });

      const { data: allTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (!allTasks) return;

      const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      
      const weeklyData = last7Days.map(dateStr => {
         const dateObj = parseISO(dateStr);
         const dayName = daysOfWeek[dateObj.getDay()];
         const dayTasks = allTasks.filter(t => t.due_date === dateStr && t.status === 'completed');
         return {
            name: dayName,
            tasks: dayTasks.length
         }
      });

      // Priority
      let high = 0, medium = 0, low = 0, none = 0;
      allTasks.filter(t => t.status === 'pending').forEach(t => {
         if (t.priority == 3 || t.priority === 'high' || t.priority === '3') high++;
         else if (t.priority == 2 || t.priority === 'medium' || t.priority === '2') medium++;
         else if (t.priority == 1 || t.priority === 'low' || t.priority === '1') low++;
         else none++;
      });

      // Nuevas Métricas: Retraso y Puntualidad
      let procOnTime = 0, procDelayed = 0;
      let delayLight = 0, delayMedium = 0, delayCritical = 0;
      let puncOnTime = 0, puncLate = 0;

      allTasks.forEach(t => {
        let taskDueTime = t.due_time ? t.due_time : '23:59:59';
        let dueTimestamp = t.due_date ? new Date(`${t.due_date}T${taskDueTime}`) : null;

        if (t.status === 'pending') {
           if (dueTimestamp && dueTimestamp < todayObj) {
              procDelayed++;
           } else {
              procOnTime++;
           }
        } 
        
        if (t.status === 'completed' && t.completed_at && dueTimestamp) {
           const completedAt = new Date(t.completed_at);
           if (completedAt > dueTimestamp) {
              puncLate++;
              const hrsDelayed = Math.abs(differenceInHours(completedAt, dueTimestamp));
              if (hrsDelayed < 2) delayLight++;
              else if (hrsDelayed < 6) delayMedium++;
              else delayCritical++;
           } else {
              puncOnTime++;
           }
        }
      });

      // Trend de eficiencia
      const efficiencyTrend = last7Days.map(dateStr => {
        const dateObj = parseISO(dateStr);
        const dayName = daysOfWeek[dateObj.getDay()];
        
        const dayTasks = allTasks.filter(t => t.status === 'completed' && t.completed_at && format(new Date(t.completed_at), 'yyyy-MM-dd') === dateStr);
        
        let avgMinutes = 0;
        if (dayTasks.length > 0) {
           const totalMins = dayTasks.reduce((acc, t) => {
              const diff = differenceInMinutes(new Date(t.completed_at!), new Date(t.created_at));
              return acc + (diff > 0 ? diff : 0);
           }, 0);
           avgMinutes = totalMins / dayTasks.length;
        }

        return {
           name: dayName,
           hours: Number((avgMinutes / 60).toFixed(1))
        };
      });

      setStats({
        todayTasks: completedToday || 0,
        totalToday: totalToday || 0,
        successRate: totalGlobal ? Math.round(((completedGlobal || 0) / totalGlobal) * 100) : 0,
        streak: metrics?.streak_days || 0,
        totalCompleted: completedGlobal || 0,
        weeklyData,
        priorityData: { high, medium, low, none },
        procrastination: { onTime: procOnTime, delayed: procDelayed },
        delayAge: { light: delayLight, medium: delayMedium, critical: delayCritical },
        punctuality: { onTime: puncOnTime, late: puncLate },
        efficiencyTrend
      });
      setLoading(false);
    }

    if (!userLoading) {
      fetchRealStats();
    }
  }, [userId, userLoading]);

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

  const priorityChartData = [
    { name: 'Alta', value: stats.priorityData.high, color: '#EF4444' }, 
    { name: 'Media', value: stats.priorityData.medium, color: '#F97316' }, 
    { name: 'Baja', value: stats.priorityData.low, color: '#3B82F6' }, 
    { name: 'Sin Asignar', value: stats.priorityData.none, color: '#8b8b99' }, 
  ];
  const maxPriorityTasks = Math.max(...priorityChartData.map(d => d.value), 1);

  const delayAgeData = [
    { name: 'Leve (<2h)', value: stats.delayAge.light, fill: '#FBBF24' },
    { name: 'Medio (<6h)', value: stats.delayAge.medium, fill: '#F97316' },
    { name: 'Crítico (>12h)', value: stats.delayAge.critical, fill: '#EF4444' },
  ];

  const punctualityData = [
    { name: 'A tiempo', value: stats.punctuality.onTime, fill: '#10B981' },
    { name: 'Tarde', value: stats.punctuality.late, fill: '#EF4444' }
  ];

  const totalProc = stats.procrastination.onTime + stats.procrastination.delayed;
  const procPercent = totalProc > 0 ? (stats.procrastination.onTime / totalProc) * 100 : 100;
  
  // Para el Gauge Chart (Medio Anillo)
  const gaugeData = [
     { name: 'A Tiempo', value: stats.procrastination.onTime, fill: procPercent > 60 ? '#10B981' : procPercent > 30 ? '#FBBF24' : '#EF4444' },
     { name: 'Atrasado', value: stats.procrastination.delayed, fill: 'var(--surface-container-high)' }
  ];

  return (
    <div className="flex w-full h-full bg-background overflow-y-auto px-6 py-8 md:p-12 pb-32 lg:pb-12 custom-scrollbar relative">
      <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-8">
        
        <header>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-on-surface mb-2">Análisis de Rendimiento</h1>
          <p className="text-sm text-on-surface-variant font-medium">Métricas avanzadas de tiemp y eficiencia</p>
        </header>

        {/* Top Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group transition-all duration-300">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Racha Actual</h3>
              <div className="p-2 bg-orange-500/10 rounded-xl"><Flame size={16} className="text-orange-500" /></div>
            </div>
            <div className="relative z-10">
              <p className="text-3xl font-bold text-on-surface mb-2">{stats.streak} <span className="text-sm font-medium text-on-surface-variant">días</span></p>
            </div>
          </div>
          <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group transition-all duration-300">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Tareas Hoy</h3>
              <div className="p-2 bg-amber-500/10 rounded-xl"><Zap size={16} className="text-amber-500" /></div>
            </div>
            <div className="flex items-end justify-between relative z-10">
              <p className="text-3xl font-bold text-on-surface">{stats.todayTasks}<span className="text-xl text-on-surface-variant font-medium">/{stats.totalToday}</span></p>
            </div>
          </div>
          <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group transition-all duration-300 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Completadas</h3>
              <div className="p-2 bg-indigo-500/10 rounded-xl"><CheckCircle2 size={16} className="text-indigo-500" /></div>
            </div>
            <div className="relative z-10 mt-auto">
              <p className="text-3xl font-bold text-on-surface">{stats.totalCompleted}</p>
            </div>
          </div>
          <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group transition-all duration-300 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Tasa Éxito</h3>
              <div className="p-2 bg-emerald-500/10 rounded-xl"><Award size={16} className="text-emerald-500" /></div>
            </div>
            <div className="relative z-10 mt-auto">
              <p className="text-3xl font-bold text-emerald-400">{stats.successRate}%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Procrastination Gauge (Termometro) */}
          <div className="glass-panel p-6 rounded-3xl flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-bold tracking-widest text-on-surface-variant uppercase flex gap-2 items-center"><AlertTriangle size={14} className="text-amber-500" /> Termómetro de Procrastinación</h3>
            </div>
            <p className="text-[11px] text-on-surface-variant/80 mb-4">Mide el balance entre tus tareas al día y las retrasadas.</p>
            
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[180px]">
              <div className="w-full absolute inset-0 flex justify-center h-[200px] mt-4">
                <ResponsiveContainer width={240} height={120}>
                  <PieChart>
                    <Pie
                      data={gaugeData}
                      cx={120}
                      cy={120}
                      startAngle={180}
                      endAngle={0}
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={8}
                    >
                      {gaugeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute top-[80px] text-center w-full">
                 <p className="text-4xl font-black text-on-surface">{Math.round(procPercent)}%</p>
                 <p className="text-[10px] uppercase tracking-widest font-bold mt-1 mx-auto" style={{ color: procPercent > 60 ? '#10B981' : procPercent > 30 ? '#FBBF24' : '#EF4444' }}>
                   {procPercent > 60 ? 'En Orden' : procPercent > 30 ? 'Peligro Moderado' : 'Zona Crítica'}
                 </p>
              </div>
            </div>
          </div>

          {/* Edad del Retraso */}
          <div className="glass-panel p-6 rounded-3xl flex flex-col">
            <h3 className="text-xs font-bold tracking-widest text-on-surface-variant uppercase mb-2 flex gap-2 items-center"><Clock size={14} className="text-red-400" /> Tareas Cerradas con Retraso</h3>
            <p className="text-[11px] text-on-surface-variant/80 mb-6">Historial de qué tan tarde cerraste tus tareas.</p>
            
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={delayAgeData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--on-surface-variant)', fontWeight: 'bold' }} width={90} />
                  <Tooltip cursor={{ fill: 'var(--surface-container)' }} contentStyle={{ backgroundColor: 'var(--surface-container-high)', borderRadius: '12px', border: 'none', color: 'white', fontWeight: 'bold' }} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                    <LabelList dataKey="value" position="right" fill="var(--on-surface-variant)" fontSize={12} fontWeight="bold" />
                    {delayAgeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Anillo de Puntualidad */}
          <div className="glass-panel p-6 rounded-3xl flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-bold tracking-widest text-on-surface-variant uppercase flex items-center gap-2"><Target size={14} className="text-teal-400" /> Anillo de Puntualidad</h3>
            </div>
            <p className="text-[11px] text-on-surface-variant/80 mb-4">¿Entregas a tiempo una vez completadas?</p>
            
            <div className="h-[200px] w-full flex items-center justify-center relative">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={punctualityData} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={10}>
                       {punctualityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                       ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface-container-high)', borderRadius: '12px', border: 'none', color: 'white' }} />
                 </PieChart>
               </ResponsiveContainer>
               
               <div className="absolute flex flex-col items-center pointer-events-none">
                  <p className="text-sm font-bold text-on-surface">Puntualidad</p>
                  <p className="text-2xl font-black text-teal-400">
                    {stats.punctuality.onTime + stats.punctuality.late > 0 ? Math.round((stats.punctuality.onTime / (stats.punctuality.onTime + stats.punctuality.late)) * 100) : 0}%
                  </p>
               </div>
            </div>
          </div>

          {/* Efficiency Trend Line */}
          <div className="glass-panel p-6 rounded-3xl flex flex-col">
            <h3 className="text-xs font-bold tracking-widest text-on-surface-variant uppercase mb-2 flex items-center gap-2"><Activity size={14} className="text-indigo-400" /> Tendencia de Eficiencia</h3>
            <p className="text-[11px] text-on-surface-variant/80 mb-6">Promedio de horas para completar tareas por día.</p>
            
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.efficiencyTrend} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--on-surface-variant)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--on-surface-variant)' }} />
                  <Tooltip wrapperStyle={{ outline: 'none' }} cursor={{ stroke: 'var(--surface-variant)' }} contentStyle={{ backgroundColor: 'var(--surface-container-high)', borderRadius: '12px', border: '1px solid var(--surface-variant)', color: 'var(--on-surface)' }} />
                  <Line type="monotone" dataKey="hours" name="Tiempo Promedio (H)" stroke="#818CF8" strokeWidth={4} dot={{ r: 4, fill: '#818CF8', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#E0E7FF' }} style={{ filter: 'drop-shadow(0px 4px 8px rgba(129, 140, 248, 0.5))' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Productivity Area Chart */}
          <div className="glass-panel p-6 rounded-3xl lg:col-span-2">
            <h3 className="text-xs font-bold tracking-widest text-on-surface-variant uppercase mb-6 flex justify-between">
               Volumen de Productividad <span className="text-[10px] bg-surface-variant/50 px-2 py-1 rounded-md text-on-surface">Últimos 7 días</span>
            </h3>
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--on-surface-variant)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--on-surface-variant)' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--surface-container-high)', border: '1px solid var(--surface-variant)', borderRadius: '12px', fontSize: '12px', color: 'var(--on-surface)' }} />
                  <Area type="monotone" dataKey="tasks" name="Tareas Completadas" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" style={{ filter: 'drop-shadow(0px 4px 12px rgba(99, 102, 241, 0.4))' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
      <FloatingQuickAdd />
    </div>
  );
}
