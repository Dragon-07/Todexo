'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

interface PriorityCounts {
  high: number;
  medium: number;
  low: number;
  none: number;
  total: number;
}

export default function TodayTasksSummary() {
  const [counts, setCounts] = useState<PriorityCounts>({
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
    total: 0
  });
  const { userId } = useEffectiveUser();

  const fetchTodayCounts = async () => {
    if (!userId) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('tasks')
      .select('priority')
      .eq('user_id', userId)
      .lte('due_date', todayStr)
      .eq('status', 'pending');

    if (data && !error) {
      const newCounts = data.reduce((acc, task) => {
        const p = task.priority;
        if (p == 3 || p === 'high' || p === '3') acc.high++;
        else if (p == 2 || p === 'medium' || p === '2') acc.medium++;
        else if (p == 1 || p === 'low' || p === '1') acc.low++;
        else acc.none++;
        acc.total++;
        return acc;
      }, { high: 0, medium: 0, low: 0, none: 0, total: 0 });
      
      setCounts(newCounts);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchTodayCounts();
    }
    
    const channel = supabase
      .channel(`today-counts-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        () => {
          fetchTodayCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (counts.total === 0) return null;

  // Calculate percentages for segments
  const getWidth = (count: number) => {
    return counts.total > 0 ? (count / counts.total) * 100 : 0;
  };

  return (
    <div className="px-2 mt-3">
        <div className="flex flex-col relative z-10">
          {/* Label Header */}
          <div className="flex justify-between items-end mb-1.5 px-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant leading-none">
              Resumen pendientes
            </span>
            <span className="text-[10px] font-black text-primary leading-none bg-primary/10 px-1.5 py-0.5 rounded-md">
              {counts.total} {counts.total === 1 ? 'Tarea' : 'Tareas'}
            </span>
          </div>

          {/* Segmented Bar */}
          <div className="relative w-full h-8 rounded-xl overflow-hidden border border-white/5 bg-surface-container-high/40 shadow-inner flex">
            {/* High Priority Segment */}
            {counts.high > 0 && (
              <div 
                className="h-full bg-error/20 flex items-center justify-center transition-all duration-500 border-r border-white/5"
                style={{ width: `${getWidth(counts.high)}%` }}
              >
                <div className="flex flex-col items-center">
                  <span className="text-sm font-black text-error leading-none">{counts.high}</span>
                </div>
              </div>
            )}

            {/* Medium Priority Segment */}
            {counts.medium > 0 && (
              <div 
                className="h-full bg-amber-500/20 flex items-center justify-center transition-all duration-500 border-r border-white/5"
                style={{ width: `${getWidth(counts.medium)}%` }}
              >
                 <div className="flex flex-col items-center">
                  <span className="text-sm font-black text-amber-500 leading-none">{counts.medium}</span>
                </div>
              </div>
            )}

            {/* Low Priority Segment */}
            {counts.low > 0 && (
              <div 
                className="h-full bg-primary/20 flex items-center justify-center transition-all duration-500 border-r border-white/5"
                style={{ width: `${getWidth(counts.low)}%` }}
              >
                 <div className="flex flex-col items-center">
                  <span className="text-sm font-black text-primary leading-none">{counts.low}</span>
                </div>
              </div>
            )}

            {/* No Priority Segment */}
            {counts.none > 0 && (
              <div 
                className="h-full bg-surface-variant/20 flex items-center justify-center transition-all duration-500"
                style={{ width: `${getWidth(counts.none)}%` }}
              >
                 <div className="flex flex-col items-center">
                  <span className="text-sm font-black text-on-surface-variant leading-none">{counts.none}</span>
                </div>
              </div>
            )}
          </div>

          {/* Legend labels (Compact) */}
          <div className="flex gap-2 mt-2 px-1">
            {counts.high > 0 && (
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-error" />
                    <span className="text-[8px] font-bold text-on-surface-variant uppercase">Alta</span>
                </div>
            )}
            {counts.medium > 0 && (
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-[8px] font-bold text-on-surface-variant uppercase">Media</span>
                </div>
            )}
            {counts.low > 0 && (
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[8px] font-bold text-on-surface-variant uppercase">Baja</span>
                </div>
            )}
             {counts.none > 0 && (
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-surface-variant" />
                    <span className="text-[8px] font-bold text-on-surface-variant uppercase">Ninguna</span>
                </div>
            )}
          </div>
        </div>
    </div>
  );
}
