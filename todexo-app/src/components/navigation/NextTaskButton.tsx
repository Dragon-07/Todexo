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

  const fetchNextTask = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    // Obtener la tarea más próxima hoy que tenga hora y aún no esté completada
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('due_date', todayStr)
      .eq('status', 'pending')
      .not('due_time', 'is', null)
      .order('due_time', { ascending: true })
      .limit(1);

    if (data && data.length > 0 && !error) {
      setNextTask(data[0] as Task);
    } else {
      setNextTask(null);
    }
  };

  useEffect(() => {
    fetchNextTask();
    
    // Recargar la tarea cada 5 minutos por si hay cambios en la DB
    const taskInterval = setInterval(fetchNextTask, 5 * 60 * 1000);
    return () => clearInterval(taskInterval);
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
      } else if (diffMinutes > 60) {
        setPercent(100);
        setTimeLeft(`${Math.floor(diffMinutes / 60)}h ${Math.floor(diffMinutes % 60)}m`);
      } else {
        // La barra se acorta conforme nos acercamos (60 min = 100%, 0 min = 0%)
        const p = (diffMinutes / 60) * 100;
        setPercent(p);
        setTimeLeft(`${Math.floor(diffMinutes)} min`);
      }
    };

    calculateProgress();
    const progressInterval = setInterval(calculateProgress, 30000); // Cada 30 seg
    return () => clearInterval(progressInterval);
  }, [nextTask]);

  if (!nextTask) return null;

  return (
    <div className="px-2 mt-2">
        <div className="flex flex-col gap-2 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary/80 whitespace-nowrap px-1">
            Próxima tarea
          </span>
          <div className="relative w-full h-12 bg-surface-container-high/40 rounded-2xl overflow-hidden border border-white/5 shadow-inner">
            {/* Barra de progreso de fondo (se acorta) */}
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary-dim transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
              style={{ width: `${percent}%` }}
            />
            
            {/* Tiempo centrado dentro de la barra */}
            <div className="absolute inset-0 flex items-center justify-center select-none z-20">
              {timeLeft === 'Ahora' ? (
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
