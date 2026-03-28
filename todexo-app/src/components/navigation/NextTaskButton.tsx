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
      <div className="group relative w-full overflow-hidden rounded-2xl bg-surface-container/40 border border-white/10 p-4 transition-all hover:bg-surface-container/60 hover:border-primary/30 cursor-pointer ambient-shadow">
        
        {/* Barra de progreso de fondo (se acorta) */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-primary-dim transition-all duration-1000 ease-out glow-primary"
          style={{ width: `${percent}%` }}
        />

        <div className="flex flex-col gap-1 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary/80 whitespace-nowrap">
            Próxima tarea
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-on-surface tracking-tighter">
              {timeLeft.split(' ')[0]}
            </span>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              {timeLeft.split(' ')[1] || ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
