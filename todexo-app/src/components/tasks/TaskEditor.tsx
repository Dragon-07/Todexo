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

  const handleSave = () => {
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
        <div className="px-8 py-6 border-b border-surface-variant/30 flex items-center justify-between bg-surface-container-high/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
              <Type size={20} />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Editar Tarea</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-variant text-on-surface-variant hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Title Input */}
          <div className="space-y-3">
             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1">Título de la tarea</label>
             <input 
               type="text"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               className="w-full bg-surface-container-low border border-surface-variant/30 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/30 text-lg"
               placeholder="¿Qué hay que hacer?"
             />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Date Selection */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1">Fecha</label>
              <div className="relative group">
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="date"
                  value={date || ''}
                  onChange={(e) => setDate(e.target.value || null)}
                  className="w-full bg-surface-container-low border border-surface-variant/30 rounded-2xl pl-12 pr-4 py-3.5 text-white font-bold focus:outline-none focus:border-primary/50 transition-all text-sm [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Time Selection */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1">Hora</label>
              <div className="relative group">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-teal-400 transition-colors" size={18} />
                <input 
                  type="time"
                  value={time || ''}
                  onChange={(e) => setTime(e.target.value || null)}
                  className="w-full bg-surface-container-low border border-surface-variant/30 rounded-2xl pl-12 pr-4 py-3.5 text-white font-bold focus:outline-none focus:border-teal-400/50 transition-all text-sm [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Priority Selection */}
          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1">Prioridad</label>
             <div className="grid grid-cols-4 gap-3">
                {[
                  { value: 3, label: 'Alta', icon: Flame, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
                  { value: 2, label: 'Media', icon: MinusCircle, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
                  { value: 1, label: 'Baja', icon: ChevronsDown, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
                  { value: 0, label: 'Ninguna', icon: Check, color: 'text-on-surface-variant', bg: 'bg-surface-variant/20', border: 'border-surface-variant/30' },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className={clsx(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                      priority == p.value 
                        ? `${p.bg} ${p.border} ${p.color} ring-2 ring-${p.color.split('-')[1]}-400/20 scale-105` 
                        : "bg-surface-container-low border-surface-variant/20 text-on-surface-variant hover:border-surface-variant"
                    )}
                  >
                    <p.icon size={18} />
                    <span className="text-[10px] font-black uppercase tracking-wider">{p.label}</span>
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 pt-4 bg-surface-container-high/30 border-t border-surface-variant/10 flex flex-col gap-3">
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-2xl bg-surface-container-high border border-surface-variant/50 text-white font-black uppercase tracking-widest text-xs hover:bg-surface-variant transition-all mt-4"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="flex-1 px-6 py-4 rounded-2xl bg-surface-variant border border-surface-variant/50 text-white font-black uppercase tracking-widest text-xs hover:bg-surface-variant-high transition-all mt-4 hover:border-primary/30"
            >
              Guardar Cambios
            </button>
          </div>
          
          <button 
            onClick={() => {
              onSave({ status: 'completed' });
              onClose();
            }}
            className="w-full px-6 py-4 rounded-2xl bg-secondary text-white font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all glow-secondary shadow-2xl flex items-center justify-center gap-3"
          >
            <Check size={20} strokeWidth={3} />
            Finalizar Tarea
          </button>
        </div>
      </div>
    </div>
  );
}
