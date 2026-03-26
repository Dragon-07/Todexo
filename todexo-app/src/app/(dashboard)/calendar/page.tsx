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
  Clock,
  Trash2,
  Repeat
} from 'lucide-react';
import clsx from 'clsx';
import TaskItem, { Task } from '@/components/tasks/TaskItem';
import { supabase } from '@/lib/supabase';
import { calculateNextDueDate, RepeatType } from '@/lib/recurrence';
import { manageReminderTask } from '@/lib/reminder';
import FloatingQuickAdd from '@/components/FloatingQuickAdd';
import TaskEditor from '@/components/tasks/TaskEditor';
import { format, isSameDay, parseISO, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

type ViewMode = 'list' | 'week' | 'month';

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddInitialDate, setQuickAddInitialDate] = useState<Date | null>(null);
  const [selectedDayTasksDate, setSelectedDayTasksDate] = useState<Date | null>(null);

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
      
      let nextReminderAt: string | null = null;
      if (task.reminder_at && task.due_date) {
        try {
          const originalDueDate = parseISO(`${task.due_date}T${task.due_time || '09:00:00'}`);
          const reminderAtDate = parseISO(task.reminder_at);
          const diffMs = originalDueDate.getTime() - reminderAtDate.getTime();
          
          const newFullDueDate = new Date(nextDueDate);
          if (task.due_time) {
            const [h, m, s] = task.due_time.split(':').map(Number);
            newFullDueDate.setHours(h, m, s);
          } else {
            newFullDueDate.setHours(9, 0, 0);
          }
          
          nextReminderAt = new Date(newFullDueDate.getTime() - diffMs).toISOString();
        } catch (e) {
          console.error("Error calculating next reminder:", e);
        }
      }

      const payload = {
        title: task.title,
        user_id: task.user_id,
        status: 'pending' as const,
        due_date: format(nextDueDate, 'yyyy-MM-dd'),
        due_time: task.due_time || null,
        repeat_type: task.repeat_type,
        priority: task.priority || 0,
        project_id: task.project_id || null,
        reminder_at: nextReminderAt
      };
      
      const { data: insertedTask, error } = await supabase.from('tasks').insert(payload).select('id').single();
      
      if (!error && insertedTask && nextReminderAt) {
        await manageReminderTask(
           insertedTask.id,
           task.title,
           null,
           nextReminderAt,
           payload.due_date,
           payload.due_time,
           task.user_id,
           task.priority || 0,
           task.repeat_type
         );
      }
      
      fetchTasks();
    }
  };

  const deleteTask = async (id: string) => {
    // Update local state optimistically
    setTasks(tasks.filter(t => t.id !== id));

    // Persist to Supabase
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting task:', error);
      fetchTasks(); // Revert on error
    }
  };

  const updateTask = async (updatedFields: Partial<Task>) => {
    if (!editingTask) return;
    
    // Update local state optimistically
    setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...updatedFields } : t));
    
    const { error } = await supabase
      .from('tasks')
      .update(updatedFields)
      .eq('id', editingTask.id);
      
    if (error) {
      console.error('Error updating task:', error);
      fetchTasks(); // Revert on error
    } else {
      // Sync with DB to be sure
      fetchTasks();
    }
  };

  const monthName = format(currentDate, 'MMMM', { locale: es });
  const year = currentDate.getFullYear();
  
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handlePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(prev => addDays(prev, -7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(prev => addDays(prev, 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-slide-up">
      <header className="px-6 py-4 md:px-12 md:py-6 md:pr-32 border-b border-surface-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-secondary-dim flex items-center justify-center shadow-xl glow-secondary flex-shrink-0">
            <Calendar className="text-on-surface" size={24} />
          </div>
          {viewMode !== 'list' ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={handlePrev} 
                className="p-2.5 rounded-2xl bg-surface-container hover:bg-surface-variant text-on-surface transition-all ambient-shadow active:scale-95 group"
                title={viewMode === 'week' ? "Semana anterior" : "Mes anterior"}
              >
                <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              
              <div className="text-left">
                <h1 className="text-3xl font-black tracking-tighter text-on-surface capitalize">
                  {viewMode === 'week' ? (
                    (() => {
                      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
                      const end = addDays(start, 6);
                      if (start.getMonth() === end.getMonth()) {
                        return (
                          <>
                            <span className="text-primary">{format(start, 'd')}</span> al <span className="text-primary">{format(end, 'd')}</span> de {monthName}
                          </>
                        );
                      }
                      return (
                        <span className="text-2xl md:text-3xl">
                          <span className="text-primary">{format(start, 'd')}</span> {format(start, 'MMM', { locale: es })} al <span className="text-primary">{format(end, 'd')}</span> {format(end, 'MMM', { locale: es })}
                        </span>
                      );
                    })()
                  ) : (
                    <>
                      {monthName} <span className="opacity-30 font-light">{year}</span>
                    </>
                  )}
                </h1>
                <p className="text-on-surface-variant font-medium mt-0.5 uppercase tracking-widest text-[9px]">
                  {viewMode === 'week' ? 'Tu programa semanal' : 'Tu horizonte de tareas'}
                </p>
              </div>

              <button 
                onClick={handleNext} 
                className="p-2.5 rounded-2xl bg-surface-container hover:bg-surface-variant text-on-surface transition-all ambient-shadow active:scale-95 group"
                title="Mes siguiente"
              >
                <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button 
                onClick={() => setCurrentDate(new Date())} 
                className="ml-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-[0.1em] text-primary hover:bg-primary/20 transition-all ambient-shadow active:scale-95 flex items-center gap-2"
              >
                 <Clock size={14} />
                 Hoy
              </button>
            </div>
          ) : (
            <div className="text-left">
              <h1 className="text-3xl font-black tracking-tighter text-on-surface capitalize">
                Agenda del <span className="text-primary">Calendario</span>
              </h1>
              <p className="text-on-surface-variant font-medium mt-0.5 uppercase tracking-widest text-[9px]">Tu flujo de tareas completo</p>
            </div>
          )}
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


      <main className={clsx(
        "flex-1 overflow-y-auto custom-scrollbar md:pr-32",
        viewMode === 'month' ? "p-4 md:p-6" : "p-6 md:p-12"
      )}>
        {viewMode === 'list' && (
          <div className="space-y-12 max-w-5xl">
            {tasks.length > 0 ? (
              <div className="space-y-10">
                {Object.entries(
                  tasks.reduce((groups: Record<string, Task[]>, task) => {
                    const key = task.due_date || 'sin-fecha';
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(task);
                    return groups;
                  }, {})
                )
                .sort(([a], [b]) => {
                  if (a === 'sin-fecha') return 1;
                  if (b === 'sin-fecha') return -1;
                  return a.localeCompare(b);
                })
                .map(([dateStr, dayTasks]) => {
                   const isNoDate = dateStr === 'sin-fecha';
                   const dateObj = !isNoDate ? parseISO(dateStr) : null;
                   const isTodayDay = dateObj ? isSameDay(new Date(), dateObj) : false;
                   
                   return (
                     <div key={dateStr} className="space-y-6">
                       <div className="flex items-center gap-4 group">
                         <div className={clsx(
                           "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all",
                           isTodayDay 
                             ? "bg-primary text-white border-primary shadow-lg glow-primary" 
                             : "bg-surface-container text-on-surface-variant border-surface-variant/30"
                         )}>
                           {isNoDate ? 'Sin fecha definida' : (
                             <>
                               {isTodayDay && <span className="mr-2 opacity-60">Hoy — </span>}
                               {format(dateObj!, "EEEE, d 'de' MMMM", { locale: es })}
                             </>
                           )}
                         </div>
                         <div className="h-px flex-1 bg-surface-variant/20 group-hover:bg-primary/20 transition-colors" />
                         <span className="text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-[0.15em]">{dayTasks.length} {dayTasks.length === 1 ? 'tarea' : 'tareas'}</span>
                       </div>
                       
                       <div className="space-y-3">
                         {dayTasks.map(task => (
                           <TaskItem 
                             key={task.id} 
                             task={task} 
                             onToggle={toggleTask} 
                             onDelete={deleteTask} 
                             onEdit={setEditingTask}
                           />
                         ))}
                       </div>
                     </div>
                   );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-surface-variant flex items-center justify-center mb-6">
                  <Sparkles size={40} className="text-on-surface-variant opacity-20" />
                </div>
                <h3 className="text-2xl font-bold text-on-surface mb-2">No hay tareas programadas</h3>
                <p className="text-on-surface-variant max-w-xs">Relájate o añade nuevas tareas para organizar tu calendario.</p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'week' && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-6 min-h-full">
            {(() => {
              const start = startOfWeek(currentDate, { weekStartsOn: 1 });
              const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));
              const dayLabels = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

              return weekDays.map((dayDate, idx) => {
                const dayTasks = tasks.filter(t => t.due_date && isSameDay(parseISO(t.due_date), dayDate));
                const isTodayStr = isSameDay(new Date(), dayDate);

                return (
                  <div key={idx} className="flex flex-col gap-4 min-w-[200px] md:min-w-0">
                    <div className={clsx(
                      "group/dayheader relative text-[10px] font-black uppercase tracking-widest text-center mb-2 px-2 py-2.5 rounded-xl border transition-all flex items-center justify-center",
                      isTodayStr 
                        ? "bg-primary text-white border-primary shadow-lg glow-primary" 
                        : "bg-surface-container text-on-surface-variant border-surface-variant/30"
                    )}>
                      <span>{dayLabels[idx]} <span className="opacity-60 ml-0.5">{format(dayDate, 'd')}</span></span>
                      <button 
                         onClick={() => {
                           setQuickAddInitialDate(dayDate);
                           setIsQuickAddOpen(true);
                         }}
                         className="absolute right-2 p-1 rounded-lg hover:bg-white/10 opacity-0 group-hover/dayheader:opacity-100 transition-all active:scale-90"
                         title="Añadir tarea a este día"
                      >
                         <Plus size={14} className={isTodayStr ? "text-white" : "text-primary"} />
                      </button>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      {dayTasks.map(task => (
                        <div key={task.id} className="group relative">
                          <TaskItem 
                            task={task} 
                            onToggle={toggleTask} 
                            onDelete={deleteTask} 
                            onEdit={setEditingTask}
                            compact
                          />
                        </div>
                      ))}
                      
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {viewMode === 'month' && (
          <div>
            <div className="grid grid-cols-7 gap-px rounded-3xl overflow-hidden border border-surface-variant ambient-shadow bg-surface-variant/20">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="bg-surface-container py-2 text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{day}</div>
              ))}
              
              {/* Empty days at the start */}
              {Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[110px] bg-surface-container-low/30"></div>
              ))}
              
              {/* Actual days */}
              {days.map(day => {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const isToday = isSameDay(new Date(), date);
                const dayTasks = tasks.filter(t => t.due_date && isSameDay(parseISO(t.due_date), date));
                
                return (
                  <div 
                    key={day} 
                    onClick={() => setSelectedDayTasksDate(date)}
                    className={clsx(
                      "min-h-[110px] p-2 bg-surface-container-low/50 hover:bg-surface-container-high transition-colors group relative cursor-pointer",
                      isToday && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className={clsx(
                        "w-6 h-6 flex items-center justify-center text-[10px] font-black rounded-lg transition-all text-center",
                        isToday ? "bg-primary text-white shadow-lg glow-primary" : "text-on-surface-variant group-hover:text-on-surface"
                      )}>
                        {day}
                      </div>
                      <Plus 
                        size={14} 
                        className="text-on-surface-variant/40 opacity-0 group-hover:opacity-100 transition-all hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickAddInitialDate(date);
                          setIsQuickAddOpen(true);
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map(task => (
                        <div 
                          key={task.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTask(task);
                          }}
                          className={clsx(
                            "text-[9px] font-bold px-2 py-0.5 rounded-md text-on-surface truncate border flex items-center justify-between gap-2 transition-all hover:ring-2 hover:ring-primary/30",
                            task.status === 'completed' ? "bg-surface-container-low/70 border-surface-variant/20 opacity-80" : "bg-surface-container-high border-surface-variant/30"
                          )}
                        >
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
                        <div className="text-[8px] font-black text-on-surface-variant px-2 uppercase tracking-widest text-center">
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

      {/* Day Details Modal */}
      {selectedDayTasksDate && (
        <div 
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setSelectedDayTasksDate(null)}
        >
          <div 
            className="w-full max-w-lg glass-modal rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-on-surface capitalize">
                    {format(selectedDayTasksDate, "EEEE, d 'de' MMMM", { locale: es })}
                  </h2>
                  <p className="text-on-surface-variant font-medium mt-1 uppercase tracking-widest text-[10px]">Tareas programadas</p>
                </div>
                <button 
                  onClick={() => setSelectedDayTasksDate(null)}
                  className="w-12 h-12 rounded-2xl bg-surface-container hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-all hover:rotate-90 group"
                >
                  <Plus size={24} className="rotate-45 group-hover:text-red-400 transition-colors" />
                </button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 pb-4">
                {tasks.filter(t => t.due_date && isSameDay(parseISO(t.due_date), selectedDayTasksDate)).length > 0 ? (
                  tasks.filter(t => t.due_date && isSameDay(parseISO(t.due_date), selectedDayTasksDate)).map(task => (
                    <TaskItem 
                      key={task.id}
                      task={task}
                      onToggle={toggleTask}
                      onDelete={deleteTask}
                      onEdit={(task) => {
                        setEditingTask(task);
                        setSelectedDayTasksDate(null);
                      }}
                      compact
                    />
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-surface-variant/30 flex items-center justify-center mx-auto mb-4">
                       <Calendar size={32} className="text-on-surface-variant/40" />
                    </div>
                    <p className="text-on-surface-variant font-bold">No hay tareas para este día</p>
                    <button 
                      onClick={() => {
                        setQuickAddInitialDate(selectedDayTasksDate);
                        setIsQuickAddOpen(true);
                        setSelectedDayTasksDate(null);
                      }}
                      className="mt-4 px-6 py-2.5 rounded-2xl bg-primary text-white font-bold tracking-tight shadow-lg glow-primary active:scale-95 transition-all text-sm"
                    >
                      Añadir primera tarea
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Floating Panel */}
      <FloatingQuickAdd 
        open={isQuickAddOpen} 
        onOpenChange={(open) => {
          setIsQuickAddOpen(open);
          if (!open) setQuickAddInitialDate(null);
        }} 
        onTaskAdded={() => {
          fetchTasks();
          setIsQuickAddOpen(false);
        }}
        initialDueDate={quickAddInitialDate}
      />

      {/* Task Editor Modal */}
      {editingTask && (
        <TaskEditor 
          task={editingTask}
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSave={updateTask}
        />
      )}
    </div>
  );
}
