'use client';

import { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Sparkles, Flame, Trophy, Calendar as CalendarIcon } from 'lucide-react';
import TaskItem, { Task } from '@/components/tasks/TaskItem';
import FloatingQuickAdd from '@/components/FloatingQuickAdd';
import TaskEditor from '@/components/tasks/TaskEditor';
import { supabase } from '@/lib/supabase';
import { calculateNextDueDate, RepeatType } from '@/lib/recurrence';
import { format, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

export default function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const { userId, isImpersonating, targetUserName, loading: userLoading } = useEffectiveUser();

  const fetchTasks = async () => {
    if (!userId) return;
    setLoading(true);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .lte('due_date', todayStr)
      .or(`status.eq.pending,due_date.eq.${todayStr}`)
      .order('due_date', { ascending: true })
      .order('due_time', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    
    if (data && !error) {
       setTasks(data as Task[]);
    } else if (error) {
      console.error('Error fetching today tasks:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!userLoading && userId) {
      fetchTasks();
    }
  }, [userId, userLoading]);

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
      const nextDueDate = calculateNextDueDate(task.due_date ? parseISO(task.due_date) : new Date(), task.repeat_type as RepeatType);
      
      const payload = {
        title: task.title,
        user_id: task.user_id,
        assigned_by: task.assigned_by, // Mantener quién la asignó originalmente
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
    setTasks(tasks.filter(t => t.id !== id));
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
       console.error('Error deleting task:', error);
       fetchTasks();
    }
  };

  const handleUpdateTask = async (updatedFields: Partial<Task>) => {
    if (!editingTask) return;

    setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...updatedFields } : t));

    const { error } = await supabase
      .from('tasks')
      .update(updatedFields)
      .eq('id', editingTask.id);

    if (error) {
      console.error('Error updating task:', error);
      fetchTasks();
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const progressPercent = tasks.length === 0 ? 0 : Math.round((completedTasks.length / tasks.length) * 100);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 md:p-12 md:pr-32 pb-32 animate-slide-up h-full">
      <div className="max-w-5xl flex flex-col min-h-full">
        
        {/* Stats Section */}
        <div className="flex flex-wrap items-center gap-4 mb-14">
          <div className="flex items-center gap-3 bg-surface-container px-4 py-2.5 rounded-2xl border border-surface-variant/50 ambient-shadow group hover:border-primary/30 transition-all cursor-default">
            <div className="w-1.5 h-1.5 rounded-full bg-primary glow-primary animate-pulse"></div>
            <span className="text-sm font-bold text-on-surface tracking-wide">Todas las tareas</span>
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/30"></span>
            <span className="text-xs font-medium text-on-surface-variant">{format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}</span>
          </div>

          <div className="flex items-center gap-3 bg-surface-container px-4 py-2.5 rounded-2xl border border-surface-variant/50 ambient-shadow group hover:border-tertiary/30 transition-all cursor-default">
             <Trophy size={16} className="text-tertiary glow-tertiary" />
             <span className="text-sm font-bold text-on-surface tracking-wide">{progressPercent}%</span>
             <span className="text-xs font-medium text-on-surface-variant">Completado</span>
          </div>

          <div className="flex items-center gap-3 bg-surface-container px-4 py-2.5 rounded-2xl border border-surface-variant/50 ambient-shadow cursor-default ml-auto">
             <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{pendingTasks.length} pendientes</span>
          </div>
        </div>
        
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-6 mb-3">
             <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${isImpersonating ? 'from-indigo-500 to-violet-600' : 'from-primary to-primary-dim'} flex items-center justify-center shadow-2xl ${isImpersonating ? '' : 'glow-primary'}`}>
                <CalendarIcon className="text-white" size={28} />
             </div>
             <div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-on-surface">
                  {isImpersonating ? `Tareas de ${targetUserName}` : 'Mis tareas de hoy'}
                </h1>
                <p className="text-on-surface-variant font-medium mt-1">
                  {isImpersonating 
                    ? `Supervisando las tareas del día de ${targetUserName}.`
                    : 'Lo que tienes planeado para este día.'
                  }
                </p>
             </div>
          </div>
        </header>

        {/* Task Content */}
        {loading ? (
           <div className="flex items-center justify-center py-24 group">
              <div className="w-10 h-10 rounded-full border-t-2 border-r-2 border-primary animate-spin glow-primary"></div>
           </div>
        ) : (
           <div className="space-y-4 flex-1">
             {pendingTasks.length > 0 ? (
                pendingTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={toggleTask} 
                    onDelete={deleteTask} 
                    onEdit={setEditingTask} 
                  />
                ))
             ) : completedTasks.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center gap-6 glass rounded-[3rem] p-12 border-dashed border-2 border-surface-variant/30">
                   <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center text-primary glow-primary animate-bounce">
                     <Sparkles size={40} />
                   </div>
                   <div className="space-y-2">
                     <h3 className="font-black text-2xl text-on-surface">¡Lista vacía!</h3>
                     <p className="text-on-surface-variant max-w-xs mx-auto">No tienes tareas para hoy. ¿Por qué no añades algo?</p>
                   </div>
                </div>
             ) : null}
             
             {/* Completed Section Inline if all pending are gone */}
             {pendingTasks.length === 0 && completedTasks.length > 0 && (
                <div className="py-12 text-center flex flex-col items-center gap-4">
                   <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary glow-secondary">
                      <CheckCircle2 size={32} />
                   </div>
                   <h3 className="font-black text-xl text-on-surface">¡Día terminado!</h3>
                   <p className="text-on-surface-variant text-sm">Has completado todas tus tareas de hoy.</p>
                </div>
             )}

             {/* Add Button Inline */}
             <button 
                onClick={() => setIsQuickAddOpen(true)}
                className="w-full p-5 rounded-3xl border border-dashed border-surface-variant/50 text-on-surface-variant font-bold hover:text-on-surface hover:border-primary/50 hover:bg-surface-container-low transition-all flex items-center gap-4 group mt-6"
              >
                <div className="bg-surface-variant p-1.5 rounded-xl group-hover:bg-primary/20 transition-colors">
                   <Plus size={20} className="group-hover:text-primary transition-colors" />
                </div>
                <span>Añadir una tarea a Hoy</span>
             </button>
           </div>
        )}

        {/* Completed Section at the bottom */}
        {completedTasks.length > 0 && !loading && (
          <div className="mt-20 opacity-60 hover:opacity-100 transition-all pb-12">
            <div className="flex items-center gap-3 mb-8">
              <h3 className="text-xs font-black tracking-[0.2em] text-on-surface-variant uppercase">Completadas hoy</h3>
              <div className="h-[1px] flex-1 bg-surface-variant/50"></div>
              <span className="text-[10px] font-bold text-on-surface-variant px-2">{completedTasks.length}</span>
            </div>
            <div className="space-y-3">
               {completedTasks.map(task => (
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
        )}

      </div>
      <FloatingQuickAdd 
        onTaskAdded={fetchTasks} 
        initialDueDate={new Date()} 
        open={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
      />
      
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
