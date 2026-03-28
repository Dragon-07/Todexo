'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Task } from '@/components/tasks/TaskItem';
import { format, parseISO, isSameDay } from 'date-fns';
import clsx from 'clsx';

export default function NextTaskButton() {
  const [nextTask, setNextTask] = useState<Task | null>(null);
  const [percent, setPercent] = useState(100);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const [overdueCount, setOverdueCount] = useState(0);

  const fetchNextTask = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const nowTime = format(new Date(), 'HH:mm:ss');
    
    // Obtener tareas pendientes de hoy con hora para separar próximas de vencidas
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('due_date', todayStr)
      .eq('status', 'pending')
      .not('due_time', 'is', null)
      .order('due_time', { ascending: true });

    if (data && !error) {
      const overdue = data.filter(t => t.due_time < nowTime);
      const upcoming = data.filter(t => t.due_time >= nowTime);
      
      setOverdueCount(overdue.length);
      
      // Mostrar la próxima inminente, o si no hay futuras, la última vencida para referencia
      if (upcoming.length > 0) {
        setNextTask(upcoming[0] as Task);
      } else if (overdue.length > 0) {
        setNextTask(overdue[overdue.length - 1] as Task);
      } else {
        setNextTask(null);
      }
    } else {
      setNextTask(null);
      setOverdueCount(0);
    }
  };

  useEffect(() => {
    fetchNextTask();
    
    const channel = supabase
      .channel('tasks-sidebar-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          fetchNextTask();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!nextTask || !nextTask.due_time || !nextTask.due_date) {
        setPercent(0);
        return;
    };

    const calculateProgress = () => {
      const now = new Date();
      const [hours, minutes, seconds] = nextTask.due_time!.split(':').map(Number);
      const taskDateTime = new Date();
      taskDateTime.setHours(hours, minutes, seconds || 0, 0);

      const diffMs = taskDateTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      if (diffMinutes <= 0) {
        setPercent(0);
        setTimeLeft('Ahora');
      } else if (diffMinutes > 120) {
        setPercent(100);
        setTimeLeft(`${Math.floor(diffMinutes / 60)}h ${Math.floor(diffMinutes % 60)}m`);
      } else {
        const p = (diffMinutes / 120) * 100;
        setPercent(p);
        
        if (diffMinutes >= 60) {
          setTimeLeft(`${Math.floor(diffMinutes / 60)}h ${Math.floor(diffMinutes % 60)}m`);
        } else {
          setTimeLeft(`${Math.floor(diffMinutes)} min`);
        }
      }
    };

    calculateProgress();
    const progressInterval = setInterval(calculateProgress, 10000); // Más frecuente (10s) para alertas
    return () => clearInterval(progressInterval);
  }, [nextTask]);

  if (!nextTask && overdueCount === 0) return null;

  const isOverdue = overdueCount > 0;

  return (
    <div className="px-2 mt-2">
        <div className="flex flex-col gap-2 relative z-10">
          <div className="flex items-center justify-between px-1">
            <span className={clsx(
              "text-[10px] font-black uppercase tracking-widest transition-colors duration-300",
              isOverdue ? "text-error animate-pulse" : "text-primary/80"
            )}>
              {isOverdue ? '¡Alerta! Tareas vencidas' : 'Próxima tarea'}
            </span>
            {isOverdue && (
              <span className="bg-error text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-error/20">
                {overdueCount}
              </span>
            )}
          </div>

          <div className={clsx(
            "relative w-full h-12 rounded-2xl overflow-hidden border shadow-inner transition-all duration-500",
            isOverdue 
              ? "bg-error-container/20 border-error/30 shadow-[0_0_15px_rgba(var(--error-rgb),0.15)]" 
              : "bg-surface-container-high/40 border-white/5 shadow-inner"
          )}>
            {/* Barra de progreso dinámica */}
            <div 
              className={clsx(
                "absolute top-0 left-0 h-full transition-all duration-1000 ease-out",
                isOverdue 
                  ? "bg-gradient-to-r from-error to-error/60 shadow-[0_0_20px_rgba(var(--error-rgb),0.4)]" 
                  : "bg-gradient-to-r from-primary to-primary-dim shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
              )}
              style={{ width: isOverdue ? '100%' : `${percent}%` }}
            />
            
            {/* Texto informativo */}
            <div className="absolute inset-0 flex items-center justify-center select-none z-20">
              {isOverdue ? (
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-sm font-black text-on-error-container uppercase tracking-widest">
                    {overdueCount} {overdueCount === 1 ? 'Tarea' : 'Tareas'}
                  </span>
                  <span className="text-[10px] font-bold text-on-error-container/80 uppercase">
                    Retrasada{overdueCount === 1 ? '' : 's'}
                  </span>
                </div>
              ) : timeLeft === 'Ahora' ? (
                <span className="text-sm font-black text-on-surface uppercase tracking-widest animate-pulse">Ahora</span>
              ) : timeLeft.includes('h') ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-on-surface leading-none tracking-tighter">
                    {timeLeft.split('h')[0]}h
                  </span>
                  <span className="text-[12px] font-black text-on-surface/70 uppercase leading-none pb-0.5">
                    {timeLeft.split('h')[1].trim().replace('m', '')}M
                  </span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-on-surface leading-none tracking-tighter">
                    {timeLeft.split(' ')[0]}
                  </span>
                  <span className="text-[12px] font-black text-on-surface/70 uppercase leading-none pb-0.5">
                    MIN
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}
