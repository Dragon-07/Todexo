'use client';

import { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Sparkles, Flame, Trophy } from 'lucide-react';
import TaskItem, { Task } from '@/components/tasks/TaskItem';
import FloatingQuickAdd from '@/components/FloatingQuickAdd';
import TaskEditor from '@/components/tasks/TaskEditor';
import { supabase } from '@/lib/supabase';
import { calculateNextDueDate, RepeatType } from '@/lib/recurrence';
import { format } from 'date-fns';

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
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
       // Revert or show error if needed
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

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const totalTasks = tasks.length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks.length / totalTasks) * 100);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 md:p-12 pb-32 animate-slide-up h-full">
      <div className="max-w-3xl mx-auto flex flex-col min-h-full">
        
        {/* Superior Section - Stats Badges */}
        <div className="flex flex-wrap items-center gap-4 mb-14">
          <div className="flex items-center gap-3 bg-surface-container px-4 py-2.5 rounded-2xl border border-surface-variant/50 ambient-shadow group hover:border-primary/30 transition-all cursor-default">
            <div className="w-1.5 h-1.5 rounded-full bg-primary glow-primary group-hover:animate-pulse"></div>
            <span className="text-sm font-bold text-white tracking-wide">Hoy</span>
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/30"></span>
            <span className="text-xs font-medium text-on-surface-variant">{pendingTasks.length} pendientes</span>
          </div>

          <div className="flex items-center gap-3 bg-surface-container px-4 py-2.5 rounded-2xl border border-surface-variant/50 ambient-shadow group hover:border-tertiary/30 transition-all cursor-default">
             <Trophy size={16} className="text-tertiary glow-tertiary" />
             <span className="text-sm font-bold text-white tracking-wide">{progressPercent}%</span>
             <span className="text-xs font-medium text-on-surface-variant">Tareas diarias</span>
          </div>

          <div className="flex items-center gap-3 bg-surface-container px-4 py-2.5 rounded-2xl border border-surface-variant/50 ambient-shadow cursor-default ml-auto">
             <Flame size={16} className="text-primary glow-primary" />
             <span className="text-sm font-bold text-white">0</span>
             <span className="text-xs font-medium text-on-surface-variant">Racha</span>
          </div>
        </div>
        
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-6 mb-3">
             <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dim flex items-center justify-center shadow-2xl glow-primary">
                <Sparkles className="text-white" size={28} />
             </div>
             <div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">Mis Tareas</h1>
                <p className="text-on-surface-variant font-medium mt-1">Planifica tu enfoque con elegancia.</p>
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
             ) : (
                <div className="py-20 text-center flex flex-col items-center gap-6 glass rounded-[3rem] p-12 border-dashed border-2 border-surface-variant/30">
                   <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center text-primary glow-primary animate-bounce">
                     <CheckCircle2 size={40} />
                   </div>
                   <div className="space-y-2">
                     <h3 className="font-black text-2xl text-white">¡Todo al día!</h3>
                     <p className="text-on-surface-variant max-w-xs mx-auto">Disfruta tu tiempo libre o empieza a planificar los objetivos de mañana.</p>
                   </div>
                   <button className="px-6 py-3 bg-surface-variant text-white text-sm font-bold rounded-2xl hover:bg-primary transition-all hover:scale-105">
                      Ver sugerencias (IA)
                   </button>
                </div>
             )}
             
             {/* Add Button Inline */}
             <button className="w-full p-5 rounded-3xl border border-dashed border-surface-variant/50 text-on-surface-variant font-bold hover:text-white hover:border-primary/50 hover:bg-surface-container-low transition-all flex items-center gap-4 group mt-6">
                <div className="bg-surface-variant p-1.5 rounded-xl group-hover:bg-primary/20 transition-colors">
                   <Plus size={20} className="group-hover:text-primary transition-colors" />
                </div>
                <span>Añadir una tarea a Hoy</span>
                <span className="ml-auto text-[10px] bg-surface-container px-2 py-1 rounded-lg border border-surface-variant/30 opacity-0 group-hover:opacity-100 transition-opacity">N para nueva</span>
             </button>
           </div>
        )}

        {/* Completed Section */}
        {completedTasks.length > 0 && !loading && (
          <div className="mt-20 opacity-60 hover:opacity-100 transition-all pb-12">
            <div className="flex items-center gap-3 mb-8">
              <h3 className="text-xs font-black tracking-[0.2em] text-on-surface-variant uppercase">Completadas recientemente</h3>
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
