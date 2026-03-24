'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  Flame, 
  MinusCircle, 
  ChevronsDown, 
  Repeat,
  Type,
  Check
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import { Task } from './TaskItem';

interface TaskEditorProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: Partial<Task>) => void;
}

export default function TaskEditor({ task, isOpen, onClose, onSave }: TaskEditorProps) {
  const [title, setTitle] = useState(task.title);
  const [date, setDate] = useState<string | null>(task.due_date || null);
  const [time, setTime] = useState<string | null>(task.due_time || null);
  const [priority, setPriority] = useState<number | string>(task.priority || 0);
  
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(task.title);
      setDate(task.due_date || null);
      setTime(task.due_time || null);
      setPriority(task.priority || 0);
    }
  }, [isOpen, task]);

  if (!isOpen) return null;

  const hasChanges = title !== task.title || 
                    date !== (task.due_date || null) || 
                    time !== (task.due_time || null) || 
                    priority != (task.priority || 0);

  const handleSave = () => {
    if (!hasChanges) return;
    onSave({
      title,
      due_date: date,
      due_time: time,
      priority
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        ref={modalRef}
        className="w-full max-w-lg bg-surface-container rounded-[2.5rem] border border-surface-variant/50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-white/5"
      >
        {/* Header */}
        <div className="px-6 py-3 border-b border-surface-variant/30 flex items-center justify-between bg-surface-container-high/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
              <Type size={16} />
            </div>
            <h2 className="text-base font-black text-white tracking-tight">Editar Tarea</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 rounded-xl bg-surface-variant/10 hover:bg-red-500/10 text-on-surface-variant hover:text-red-400 border border-surface-variant/20 hover:border-red-500/30 transition-all group active:scale-90 shadow-sm"
            title="Cerrar edición"
          >
            <X size={18} className="group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Title Textarea */}
          <div className="space-y-1.5">
             <label className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1">Título de la tarea</label>
             <textarea 
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               className="w-full bg-surface-container-low border border-surface-variant/30 rounded-xl px-5 py-3 text-white font-bold focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/30 text-sm resize-none min-h-[120px] custom-scrollbar"
               placeholder="¿Qué hay que hacer?"
               rows={3}
             />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date Selection */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1">Fecha</label>
              <div className="relative group">
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={16} />
                <input 
                  type="date"
                  value={date || ''}
                  onChange={(e) => setDate(e.target.value || null)}
                  className="w-full bg-surface-container-low border border-surface-variant/30 rounded-xl pl-11 pr-3 py-2 text-white font-bold focus:outline-none focus:border-primary/50 transition-all text-xs [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Time Selection */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1">Hora</label>
              <div className="relative group">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-teal-400 transition-colors" size={16} />
                <input 
                  type="time"
                  value={time || ''}
                  onChange={(e) => setTime(e.target.value || null)}
                  className="w-full bg-surface-container-low border border-surface-variant/30 rounded-xl pl-11 pr-3 py-2 text-white font-bold focus:outline-none focus:border-teal-400/50 transition-all text-xs [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
             <label className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1">Prioridad</label>
             <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 3, label: 'Alta', icon: Flame, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
                  { value: 2, label: 'Media', icon: MinusCircle, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
                  { value: 1, label: 'Baja', icon: ChevronsDown, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
                  { value: 0, label: 'Ninguna', icon: Check, color: 'text-on-surface-variant', bg: 'bg-surface-variant/10', border: 'border-surface-variant/20' },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className={clsx(
                      "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all",
                      priority == p.value 
                        ? `${p.bg} ${p.border} ${p.color} ring-2 ring-${p.color.split('-')[1]}-400/10 scale-105` 
                        : "bg-surface-container-low border-surface-variant/10 text-on-surface-variant hover:border-surface-variant/30"
                    )}
                  >
                    <p.icon size={16} />
                    <span className="text-[8px] font-black uppercase tracking-wider">{p.label}</span>
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 bg-surface-container-high/30 border-t border-surface-variant/10 flex gap-3">
          <button 
            onClick={handleSave}
            disabled={!hasChanges}
            className={clsx(
              "flex-1 px-4 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all mt-2 border",
              hasChanges 
                ? "bg-primary text-white border-primary/50 glow-primary scale-[1.02] shadow-xl" 
                : "bg-surface-container-high border-surface-variant/50 text-white/40 cursor-not-allowed opacity-50"
            )}
          >
            Guardar Cambios
          </button>
          
          <button 
            onClick={() => {
              onSave({ status: 'completed' });
              onClose();
            }}
            className="flex-1 px-4 py-3.5 rounded-xl bg-secondary text-white font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all glow-secondary shadow-2xl flex items-center justify-center gap-2 mt-2"
          >
            <Check size={14} strokeWidth={3} />
            Finalizar Tarea
          </button>
        </div>
      </div>
    </div>
  );
}
