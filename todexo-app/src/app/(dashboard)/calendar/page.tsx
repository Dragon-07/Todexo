'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  List, 
  Grid3X3, 
  Columns,
  Sparkles,
  Plus,
  Clock
} from 'lucide-react';
import clsx from 'clsx';
import TaskItem, { Task } from '@/components/tasks/TaskItem';
import { supabase } from '@/lib/supabase';
import { calculateNextDueDate, RepeatType } from '@/lib/recurrence';
import FloatingQuickAdd from '@/components/FloatingQuickAdd';
import TaskEditor from '@/components/tasks/TaskEditor';
import { format, isSameDay, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

type ViewMode = 'list' | 'week' | 'month';

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('due_time', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      if (data && !error) {
        setTasks(data as Task[]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const toggleTask = async (id: string) => {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;
    
    const task = tasks[taskIndex];
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    
    // Update local state optimistically
    const newTasks = [...tasks];
    newTasks[taskIndex] = { ...task, status: newStatus };
    setTasks(newTasks);

    // Persist to Supabase
    await supabase.from('tasks').update({ status: newStatus }).eq('id', id);

    // Handle recurrence if task was just completed
    if (newStatus === 'completed' && task.repeat_type) {
      const nextDueDate = calculateNextDueDate(task.due_date || new Date(), task.repeat_type as RepeatType);
      
      const payload = {
        title: task.title,
        user_id: task.user_id,
        status: 'pending',
        due_date: format(nextDueDate, 'yyyy-MM-dd'),
        due_time: task.due_time,
        repeat_type: task.repeat_type,
        priority: task.priority,
        project_id: task.project_id
      };
      
      const { error } = await supabase.from('tasks').insert(payload);
      if (!error) {
        fetchTasks();
      }
    }
  };

  const deleteTask = async (id: string) => {
    // Update local state optimistically
    setTasks(tasks.filter(t => t.id !== id));

    // Persist to Supabase
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting task:', error);
      fetchTasks();
    }
  };

  const handleUpdateTask = async (updatedFields: Partial<Task>) => {
    if (!editingTask) return;

    // Update local state optimistically
    setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...updatedFields } : t));

    // Persist to Supabase
    const { error } = await supabase
      .from('tasks')
      .update(updatedFields)
      .eq('id', editingTask.id);

    if (error) {
      console.error('Error updating task:', error);
      fetchTasks();
    }
  };

  const getLabelForDate = (date: Date | null) => {
    if (!date) return 'Sin fecha';
    const now = new Date();
    if (isSameDay(date, now)) return 'Hoy';
    if (isSameDay(date, addDays(now, 1))) return 'Mañana';
    return format(date, "d 'de' MMM", { locale: es });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    return { firstDay, lastDate };
  };

  const { firstDay, lastDate } = getDaysInMonth(currentDate);
  const days = Array.from({ length: lastDate }, (_, i) => i + 1);
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long' });
  const year = currentDate.getFullYear();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-slide-up">
      <header className="px-6 py-8 md:px-12 md:py-10 md:pr-32 border-b border-surface-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary to-secondary-dim flex items-center justify-center shadow-2xl glow-secondary flex-shrink-0">
            <Calendar className="text-on-surface" size={28} />
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrevMonth} 
              className="p-3 rounded-2xl bg-surface-container hover:bg-surface-variant text-on-surface transition-all ambient-shadow active:scale-95 group"
              title="Mes anterior"
            >
              <ChevronLeft size={22} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            
            <div className="text-left">
              <h1 className="text-4xl font-black tracking-tighter text-on-surface capitalize">
                {monthName} <span className="opacity-30 font-light">{year}</span>
              </h1>
              <p className="text-on-surface-variant font-medium mt-1 uppercase tracking-widest text-[10px]">Tu horizonte de tareas</p>
            </div>

            <button 
              onClick={handleNextMonth} 
              className="p-3 rounded-2xl bg-surface-container hover:bg-surface-variant text-on-surface transition-all ambient-shadow active:scale-95 group"
              title="Mes siguiente"
            >
              <ChevronRight size={22} className="group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button 
              onClick={() => setCurrentDate(new Date())} 
              className="ml-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-[0.1em] text-primary hover:bg-primary/20 transition-all ambient-shadow active:scale-95 flex items-center gap-2"
            >
               <Clock size={14} />
               Hoy
            </button>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 p-1.5 bg-surface-container rounded-2xl border border-surface-variant/50 ambient-shadow">
          <button 
            onClick={() => setViewMode('list')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              viewMode === 'list' ? "bg-primary text-white glow-primary" : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <List size={18} />
            <span>Lista</span>
          </button>
          <button 
            onClick={() => setViewMode('week')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              viewMode === 'week' ? "bg-primary text-white glow-primary" : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <Columns size={18} />
            <span>Semana</span>
          </button>
          <button 
            onClick={() => setViewMode('month')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              viewMode === 'month' ? "bg-primary text-white glow-primary" : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <Grid3X3 size={18} />
            <span>Mensual</span>
          </button>
        </div>
      </header>


      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 md:pr-32">
        {viewMode === 'list' && (
          <div className="space-y-12 max-w-5xl">
            {tasks.length > 0 ? (
              // Group tasks by date
              Object.entries(
                tasks.reduce((groups, task) => {
                  const date = task.due_date || 'Sin fecha';
                  if (!groups[date]) groups[date] = [];
                  groups[date].push(task);
                  return groups;
                }, {} as Record<string, Task[]>)
              ).sort((a, b) => {
                if (a[0] === 'Sin fecha') return 1;
                if (b[0] === 'Sin fecha') return -1;
                return a[0].localeCompare(b[0]);
              }).map(([dateStr, dayTasks]) => (
                <section key={dateStr} className="space-y-4">
                  <h3 className="text-xs font-black tracking-[0.2em] text-on-surface-variant uppercase mb-6 flex items-center gap-4">
                    <span className="text-primary glow-primary">
                      {dateStr === 'Sin fecha' ? 'Sin fecha' : getLabelForDate(parseISO(dateStr))}
                    </span>
                    <div className="h-[1px] flex-1 bg-surface-variant/30"></div>
                  </h3>
                  {dayTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onToggle={toggleTask} 
                      onDelete={deleteTask} 
                      onEdit={setEditingTask} 
                    />
                  ))}
                </section>
              ))
            ) : (
              <div className="py-20 text-center opacity-40">No hay tareas programadas.</div>
            )}
          </div>
        )}

        {viewMode === 'week' && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 h-full min-h-[500px]">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="flex flex-col gap-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-center mb-2 px-2 py-1 rounded-lg bg-surface-container">{day}</div>
                <div className="flex-1 rounded-3xl border border-dashed border-surface-variant/30 hover:border-surface-variant p-4 transition-all group cursor-pointer flex flex-col items-center justify-center gap-3">
                  <Plus size={20} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                  <span className="text-[10px] font-bold text-on-surface-variant opacity-0 group-hover:opacity-100 uppercase transition-opacity">Añadir</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'month' && (
          <div>
            <div className="grid grid-cols-7 gap-px rounded-3xl overflow-hidden border border-surface-variant ambient-shadow bg-surface-variant/20">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="bg-surface-container py-3 text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{day}</div>
              ))}
              
              {/* Empty days at the start */}
              {Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[140px] bg-surface-container-low/30"></div>
              ))}
              
              {/* Actual days */}
              {days.map(day => {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const isToday = isSameDay(new Date(), date);
                const dayTasks = tasks.filter(t => t.due_date && isSameDay(parseISO(t.due_date), date));
                
                return (
                  <div key={day} className={clsx(
                    "min-h-[140px] p-3 bg-surface-container-low/50 hover:bg-surface-container-high transition-colors group relative",
                    isToday && "bg-primary/5"
                  )}>
                    <div className={clsx(
                      "w-7 h-7 flex items-center justify-center text-xs font-black rounded-lg mb-2 transition-all",
                      isToday ? "bg-primary text-white shadow-lg glow-primary" : "text-on-surface-variant group-hover:text-on-surface"
                    )}>
                      {day}
                    </div>

                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map(task => (
                        <div key={task.id} className={clsx(
                          "text-[9px] font-bold px-2 py-0.5 rounded-md text-on-surface truncate border flex items-center justify-between gap-2",
                          task.status === 'completed' ? "bg-surface-container-low/70 border-surface-variant/20 opacity-80" : "bg-surface-container-high border-surface-variant/30"
                        )}>
                           <div className="flex items-center gap-1.5 truncate">
                             <div className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", 
                               task.status === 'completed' ? "bg-surface-variant" :
                               task.priority === 3 ? "bg-red-400" :
                               task.priority === 2 ? "bg-orange-400" :
                               task.priority === 1 ? "bg-blue-400" :
                               "bg-primary"
                             )} />
                             <span className={clsx("truncate", task.status === 'completed' && "line-through text-on-surface-variant")}>{task.title}</span>
                           </div>
                           {task.due_time && task.status !== 'completed' && (
                             <span className="text-[8px] font-black text-teal-400 opacity-80 flex-shrink-0">
                               {format(new Date(`2000-01-01T${task.due_time}`), 'h:mm')}
                             </span>
                           )}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-[8px] font-black text-on-surface-variant px-2 uppercase tracking-widest">
                          + {dayTasks.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <FloatingQuickAdd onTaskAdded={fetchTasks} />

      {editingTask && (
        <TaskEditor 
          task={editingTask}
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleUpdateTask}
        />
      )}
    </div>
  );
}
