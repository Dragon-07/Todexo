'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Task } from '@/components/tasks/TaskItem';
import { format, parseISO, isSameDay } from 'date-fns';
import clsx from 'clsx';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

export default function NextTaskButton() {
  const [nextTask, setNextTask] = useState<Task | null>(null);
  const [percent, setPercent] = useState(100);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [overdueCount, setOverdueCount] = useState(0);
  const { userId, loading: userLoading } = useEffectiveUser();

  const fetchNextTask = async () => {
    if (!userId) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const nowTime = format(new Date(), 'HH:mm:ss');
    
    // Obtener tareas pendientes de hoy con hora para separar próximas de vencidas
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
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
    if (userId) {
      fetchNextTask();
    }
    
    const channel = supabase
      .channel(`tasks-sidebar-${userId}`)
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
  }, [userId]);

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
        <div className="flex flex-col relative z-10 group">
          <div className={clsx(
            "relative w-full h-10 rounded-2xl overflow-hidden border transition-all duration-500",
            isOverdue 
              ? "bg-error-container/20 border-error/30 shadow-[0_0_15px_rgba(var(--error-rgb),0.15)]" 
              : "bg-surface-container-high/40 border-white/5 shadow-inner"
          )}>
            {/* CAPA 1: Texto de fondo (Oscuro para fondo claro) - ESTÁTICA */}
            <div className="absolute inset-0 flex flex-col items-center justify-center select-none z-10 pointer-events-none">
              <span className={clsx(
                "text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-0 transition-colors duration-300",
                isOverdue ? "text-error" : "text-primary"
              )}>
                {isOverdue ? '¡Tareas vencidas!' : 'Próxima tarea'}
              </span>
              <div className="flex items-center">
                {isOverdue ? (
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="text-base font-black text-error tracking-tighter">{overdueCount}</span>
                    <span className="text-[11px] font-black text-error uppercase tracking-widest">
                      {overdueCount === 1 ? 'Retrasada' : 'Retrasadas'}
                    </span>
                  </div>
                ) : timeLeft === 'Ahora' ? (
                  <span className="text-sm font-black text-primary uppercase tracking-widest">Iniciando ahora</span>
                ) : timeLeft.includes('h') ? (
                  <div className="flex items-baseline gap-1 leading-none">
                    <span className="text-base font-black text-primary tracking-tighter">{timeLeft.split('h')[0]}h</span>
                    <span className="text-[12px] font-black text-primary uppercase tracking-widest">
                      {timeLeft.split('h')[1].trim().replace('m', '')}M
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1 leading-none">
                    <span className="text-base font-black text-primary tracking-tighter">{timeLeft.split(' ')[0]}</span>
                    <span className="text-[12px] font-black text-primary uppercase tracking-widest">MIN</span>
                  </div>
                )}
              </div>
            </div>

            {/* CAPA 2: Capa Frontal (Color + Texto Blanco) - RECORTE CON CLIP-PATH */}
            <div 
              className={clsx(
                "absolute inset-0 z-20 transition-all duration-1000 ease-out flex flex-col items-center justify-center",
                isOverdue 
                  ? "bg-gradient-to-r from-error to-error/60 shadow-[0_0_20px_rgba(var(--error-rgb),0.4)]" 
                  : "bg-gradient-to-r from-primary to-primary-dim shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
              )}
              style={{ 
                clipPath: `inset(0 ${100 - (isOverdue ? 100 : percent)}% 0 0)`,
                WebkitClipPath: `inset(0 ${100 - (isOverdue ? 100 : percent)}% 0 0)`
              }}
            >
              <span className="text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-0 text-white">
                {isOverdue ? '¡Tareas vencidas!' : 'Próxima tarea'}
              </span>
              <div className="flex items-center">
                {isOverdue ? (
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="text-base font-black text-white tracking-tighter">{overdueCount}</span>
                    <span className="text-[11px] font-black text-white uppercase tracking-widest">
                      {overdueCount === 1 ? 'Retrasada' : 'Retrasadas'}
                    </span>
                  </div>
                ) : timeLeft === 'Ahora' ? (
                  <span className="text-sm font-black text-white uppercase tracking-widest animate-pulse">Iniciando ahora</span>
                ) : timeLeft.includes('h') ? (
                  <div className="flex items-baseline gap-1 leading-none">
                    <span className="text-base font-black text-white tracking-tighter">{timeLeft.split('h')[0]}h</span>
                    <span className="text-[12px] font-black text-white uppercase tracking-widest">
                      {timeLeft.split('h')[1].trim().replace('m', '')}M
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1 leading-none">
                    <span className="text-base font-black text-white tracking-tighter">{timeLeft.split(' ')[0]}</span>
                    <span className="text-[12px] font-black text-white uppercase tracking-widest">MIN</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
