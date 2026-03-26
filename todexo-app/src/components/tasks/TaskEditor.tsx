'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  Flame, 
  MinusCircle, 
  ChevronsDown, 
  PencilLine,
  Check,
  Flag,
  Repeat,
  Bell
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import { Task } from './TaskItem';

import { manageReminderTask } from '@/lib/reminder';
import { supabase } from '@/lib/supabase';

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
  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false);
  const [repeat, setRepeat] = useState<string | null>(task.repeat_type || null);
  const [isRepeatMenuOpen, setIsRepeatMenuOpen] = useState(false);
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);
  const [timeSearch, setTimeSearch] = useState('');
  const [reminderAt, setReminderAt] = useState<string | null>(task.reminder_at || null);
  const [isReminderMenuOpen, setIsReminderMenuOpen] = useState(false);
  const [selectedReminderMinutes, setSelectedReminderMinutes] = useState<number | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(task.title);
      setDate(task.due_date || null);
      setTime(task.due_time || null);
      setPriority(task.priority || 0);
      setRepeat(task.repeat_type || null);
      setReminderAt(task.reminder_at || null);
      setSelectedReminderMinutes(null);
    }
  }, [isOpen, task]);

  if (!isOpen) return null;

  const hasChanges = title !== task.title || 
                    date !== (task.due_date || null) || 
                    time !== (task.due_time || null) || 
                    priority != (task.priority || 0) ||
                    repeat !== (task.repeat_type || null) ||
                    reminderAt !== (task.reminder_at || null) ||
                    selectedReminderMinutes !== null;

  const handleSave = async () => {
    if (!hasChanges) return;
    
    let finalReminderAt = reminderAt;
    
    if (selectedReminderMinutes && date) {
      const fullDueDate = new Date(date);
      if (time) {
        const [h, m, s] = time.split(':').map(Number);
        fullDueDate.setHours(h, m, s);
      } else {
        fullDueDate.setHours(9, 0, 0);
      }
      const reminderDate = new Date(fullDueDate.getTime() - selectedReminderMinutes * 60000);
      finalReminderAt = reminderDate.toISOString();
    } else if (selectedReminderMinutes === null && reminderAt === null) {
       finalReminderAt = null;
    }

    // Gestionamos el recordatorio en la base de datos (crear/actualizar/borrar)
    // Solo si el recordatorio existe o va a existir
    if (task.reminder_at || finalReminderAt) {
      await manageReminderTask(
        task.id,
        title,
        task.reminder_at || null,
        finalReminderAt,
        date,
        time,
        task.user_id
      );
    }

    onSave({
      title,
      due_date: date,
      due_time: time,
      priority,
      repeat_type: repeat,
      reminder_at: finalReminderAt
    });
    onClose();
  };

  const generateTimeSlots = (query: string) => {
    const slots: { display: string; value: string; isCustom?: boolean }[] = [];
    const now = new Date();
    
    if (!query) {
      const start = new Date();
      start.setMinutes(Math.floor(now.getMinutes() / 15) * 15);
      start.setSeconds(0);
      for (let i = 0; i < 24; i++) {
        const t = new Date(start.getTime() + i * 15 * 60000);
        slots.push({ display: format(t, 'h:mm a'), value: format(t, 'HH:mm:ss') });
      }
      return slots;
    }

    const clean = query.replace(/\D/g, '');
    const customSlots: any[] = [];
    if (clean.length >= 1 && clean.length <= 4) {
      let h = 0, m = 0;
      if (clean.length <= 2) h = parseInt(clean);
      else { h = parseInt(clean.slice(0, clean.length - 2)); m = parseInt(clean.slice(clean.length - 2)); }
      if (h < 24 && m < 60) {
        const hBase = h % 12 || 12;
        const mStr = m.toString().padStart(2, '0');
        customSlots.push({ display: `${hBase}:${mStr} AM`, value: `${(hBase === 12 ? 0 : hBase).toString().padStart(2, '0')}:${mStr}:00`, isCustom: true });
        customSlots.push({ display: `${hBase}:${mStr} PM`, value: `${(hBase === 12 ? 12 : hBase + 12).toString().padStart(2, '0')}:${mStr}:00`, isCustom: true });
      }
    }

    const intervalSlots: any[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const h12 = h % 12 || 12;
        const time12 = `${h12}:${m.toString().padStart(2, '0')}`;
        if (h12.toString() === query || time12.startsWith(query)) {
          const d = new Date(); d.setHours(h, m, 0, 0);
          intervalSlots.push({ display: format(d, 'h:mm a'), value: format(d, 'HH:mm:ss') });
        }
      }
    }
    
    const combined = [...customSlots];
    intervalSlots.sort((a,b) => a.value.localeCompare(b.value)).forEach(s => {
      if (!combined.some(c => c.value === s.value)) combined.push(s);
    });
    return combined.slice(0, 12);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/95 backdrop-blur-2xl animate-in fade-in duration-300">
      <div 
        ref={modalRef}
        className="w-full max-w-lg glass-modal rounded-[2.5rem] border border-white/30 dark:border-white/10 shadow-2xl overflow-visible animate-in zoom-in-95 duration-300"
      >
        {/* Header */}
        <div className="px-6 py-3 border-b border-surface-variant/30 flex items-center justify-between bg-surface-container-high/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
              <PencilLine size={16} />
            </div>
            <h2 className="text-base font-black text-on-surface tracking-tight">Editar Tarea</h2>
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
               className="w-full bg-surface-container-low border border-surface-variant/30 rounded-xl px-5 py-3 text-on-surface font-bold focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/30 text-sm resize-none min-h-[120px] custom-scrollbar"
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
                  className="w-full bg-surface-container-low border border-surface-variant/30 rounded-xl pl-11 pr-3 py-2 text-on-surface font-bold focus:outline-none focus:border-primary/50 transition-all text-xs"
                />
              </div>
            </div>

            {/* Time Selection */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1">Hora</label>
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    setIsTimeMenuOpen(!isTimeMenuOpen);
                    setIsPriorityMenuOpen(false);
                    setIsRepeatMenuOpen(false);
                    setIsReminderMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 bg-surface-container-low border border-surface-variant/30 rounded-xl px-4 py-2 text-on-surface font-bold focus:outline-none focus:border-teal-400/50 transition-all text-xs"
                >
                  <Clock className={clsx("transition-colors", isTimeMenuOpen ? "text-teal-400" : "text-on-surface-variant")} size={16} />
                  <span>
                    {time ? format(new Date(`2000-01-01T${time}`), 'h:mm a') : 'Sin hora'}
                  </span>
                </button>

                {isTimeMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-52 glass-modal rounded-2xl shadow-2xl z-[70] overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-2 border-b border-surface-variant/20 bg-surface-container-high/30">
                      <input 
                        autoFocus
                        type="text"
                        value={timeSearch}
                        onChange={(e) => setTimeSearch(e.target.value)}
                        placeholder="00:00"
                        className="w-full px-3 py-1.5 text-lg font-black text-on-surface bg-surface-container-low rounded-xl border border-surface-variant/30 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/20 text-center"
                      />
                    </div>
                    <div className="max-h-[240px] overflow-y-auto py-1 custom-scrollbar">
                      {(() => {
                        const allSlots = generateTimeSlots(timeSearch);
                        const custom = allSlots.filter(s => s.isCustom);
                        const regular = allSlots.filter(s => !s.isCustom);
                        return (
                          <>
                            {custom.map((s) => (
                              <button 
                                key={s.value}
                                onClick={() => { setTime(s.value); setIsTimeMenuOpen(false); setTimeSearch(''); }}
                                className="w-full text-left px-4 py-2 text-[11px] font-black text-primary bg-primary/5 hover:bg-primary/10 transition-colors border-b border-white/5 last:border-none"
                              >
                                {s.display}
                              </button>
                            ))}
                            {regular.map((slot) => (
                              <button
                                key={slot.value}
                                onClick={() => { setTime(slot.value); setIsTimeMenuOpen(false); setTimeSearch(''); }}
                                className={clsx(
                                  "w-full text-left px-4 py-2 text-[13px] font-black tracking-tight transition-colors border-b border-white/5 last:border-none",
                                  time === slot.value ? "bg-primary/10 text-primary" : "text-on-surface/80 hover:bg-surface-variant hover:text-primary"
                                )}
                              >
                                {slot.display}
                              </button>
                            ))}
                            {time && (
                              <button
                                onClick={() => { setTime(null); setIsTimeMenuOpen(false); setTimeSearch(''); }}
                                className="w-full text-left px-4 py-2 text-[10px] font-black text-red-500 hover:bg-red-500/10 transition-colors uppercase tracking-widest"
                              >
                                Eliminar hora
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Priority + Repeat row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Priority Selection */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1">Prioridad</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsPriorityMenuOpen(!isPriorityMenuOpen);
                    setIsRepeatMenuOpen(false);
                    setIsReminderMenuOpen(false);
                    setIsTimeMenuOpen(false);
                  }}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low border transition-all w-full",
                    priority == 3 ? "border-red-500/50 text-red-400" :
                    priority == 2 ? "border-orange-500/50 text-orange-400" :
                    priority == 1 ? "border-blue-500/50 text-blue-400" :
                    "border-surface-variant/40 text-on-surface-variant hover:text-primary hover:border-primary/30"
                  )}
                >
                  <div className={clsx("flex items-center gap-2", priority == 0 && "opacity-60")}>
                    {priority == 3 ? <Flame size={14} className="fill-red-400/20" /> :
                     priority == 2 ? <MinusCircle size={14} className="fill-orange-400/20" /> :
                     priority == 1 ? <ChevronsDown size={14} className="fill-blue-400/20" /> :
                     <Flag size={14} />}
                    <span className="text-xs font-black uppercase tracking-tight">
                      {priority == 3 ? 'Alta' :
                       priority == 2 ? 'Media' :
                       priority == 1 ? 'Baja' : 'Sin prioridad'}
                    </span>
                  </div>
                </button>

                {isPriorityMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-44 glass-modal rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden border border-surface-variant/30 animate-in zoom-in-95 duration-200 z-[70]">
                    <div className="py-1">
                      {[
                        { id: 3, label: 'Alta', color: 'text-red-400', bg: 'hover:bg-red-500/10', Icon: Flame, iconColor: 'fill-red-400/20' },
                        { id: 2, label: 'Media', color: 'text-orange-400', bg: 'hover:bg-orange-500/10', Icon: MinusCircle, iconColor: 'fill-orange-400/20' },
                        { id: 1, label: 'Baja', color: 'text-blue-400', bg: 'hover:bg-blue-500/10', Icon: ChevronsDown, iconColor: 'fill-blue-400/20' },
                        { id: 0, label: 'Sin prioridad', color: 'text-on-surface-variant/60', bg: 'hover:bg-white/5', Icon: Flag, iconColor: '' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPriority(p.id);
                            setIsPriorityMenuOpen(false);
                          }}
                          className={clsx(
                            "w-full text-left px-4 py-2 text-[13px] font-black transition-colors border-b border-white/5 last:border-none uppercase flex items-center gap-3",
                            priority == p.id ? "bg-surface-variant/20" : p.bg,
                            p.color
                          )}
                        >
                          <p.Icon size={14} className={p.iconColor} />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Repeat Selection */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1">Repetir</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsRepeatMenuOpen(!isRepeatMenuOpen);
                    setIsPriorityMenuOpen(false);
                    setIsReminderMenuOpen(false);
                    setIsTimeMenuOpen(false);
                  }}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low border transition-all w-full",
                    repeat ? "border-secondary/50 text-secondary" :
                    "border-surface-variant/40 text-on-surface-variant hover:text-secondary hover:border-secondary/30"
                  )}
                >
                  <Repeat size={14} className={clsx("transition-transform", repeat ? "text-secondary" : "text-on-surface-variant")} />
                  <span className="text-xs font-black uppercase tracking-tight truncate">
                    {repeat === 'daily' && 'Cada día'}
                    {repeat === 'weekly' && 'Semanal'}
                    {repeat === 'weekday' && 'Lun-Vie'}
                    {repeat === 'monthly' && 'Mensual'}
                    {!repeat && 'No repetir'}
                  </span>
                </button>

                {isRepeatMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 glass-modal rounded-2xl shadow-2xl z-[70] overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="py-1">
                      {[
                        { id: 'daily', label: 'Cada día' },
                        { id: 'weekly', label: `Cada semana` },
                        { id: 'weekday', label: 'Cada día laborable (lun-vie)' },
                        { id: 'monthly', label: 'Cada mes' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setRepeat(opt.id);
                            setIsRepeatMenuOpen(false);
                          }}
                          className={clsx(
                            "w-full text-left px-4 py-2 text-[13px] font-black transition-colors border-b border-white/5 last:border-none uppercase flex items-center gap-3",
                            repeat === opt.id ? "bg-secondary/10 text-secondary" : "text-on-surface-variant hover:bg-surface-variant hover:text-secondary"
                          )}
                        >
                          <Repeat size={12} />
                          {opt.label}
                        </button>
                      ))}
                      {repeat && (
                        <button
                          type="button"
                          onClick={() => {
                            setRepeat(null);
                            setIsRepeatMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-[10px] font-black text-red-500 hover:bg-red-500/10 transition-colors uppercase tracking-widest"
                        >
                          Eliminar repetición
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reminder Selection */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1">Recordatorio</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsReminderMenuOpen(!isReminderMenuOpen);
                    setIsPriorityMenuOpen(false);
                    setIsRepeatMenuOpen(false);
                    setIsTimeMenuOpen(false);
                  }}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low border transition-all w-full",
                    (reminderAt || selectedReminderMinutes) ? "border-amber-400/50 text-amber-500 shadow-sm shadow-amber-400/10" :
                    "border-surface-variant/40 text-on-surface-variant hover:text-amber-500 hover:border-amber-400/30"
                  )}
                >
                  <Bell size={14} className={clsx("transition-transform", (reminderAt || selectedReminderMinutes) ? "text-amber-500 fill-amber-500/10" : "text-on-surface-variant")} />
                  <span className="text-xs font-black uppercase tracking-tight truncate">
                    {selectedReminderMinutes === 15 ? '15 min antes' :
                     selectedReminderMinutes === 30 ? '30 min antes' :
                     selectedReminderMinutes === 60 ? '1 hora antes' :
                     selectedReminderMinutes === 1440 ? '1 día antes' :
                     reminderAt ? format(parseISO(reminderAt), "d MMM, h:mm a", { locale: es }) : 'Sin recordatorio'}
                  </span>
                </button>

                {isReminderMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 glass-modal rounded-2xl shadow-2xl z-[70] overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="py-1">
                      {[
                        { id: 15, label: '15 min antes' },
                        { id: 30, label: '30 min antes' },
                        { id: 60, label: '1 hora antes' },
                        { id: 1440, label: '1 día antes' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSelectedReminderMinutes(opt.id);
                            setReminderAt(null);
                            setIsReminderMenuOpen(false);
                          }}
                          className={clsx(
                            "w-full text-left px-4 py-2 text-[13px] font-black transition-colors border-b border-white/5 last:border-none uppercase flex items-center gap-3",
                            selectedReminderMinutes === opt.id ? "bg-amber-400/10 text-amber-500" : "text-on-surface-variant hover:bg-surface-variant hover:text-amber-500"
                          )}
                        >
                          <Bell size={12} />
                          {opt.label}
                        </button>
                      ))}
                      {(reminderAt || selectedReminderMinutes) && (
                        <button
                          type="button"
                          onClick={() => {
                            setReminderAt(null);
                            setSelectedReminderMinutes(null);
                            setIsReminderMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-[11px] font-black text-red-500 hover:bg-red-500/10 transition-colors uppercase tracking-widest"
                        >
                          Eliminar recordatorio
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 bg-surface-container-high/30 border-t border-surface-variant/10 flex gap-3">
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

          <button 
            onClick={handleSave}
            disabled={!hasChanges}
            className={clsx(
              "flex-1 px-4 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all mt-2 border",
              hasChanges 
                ? "bg-primary text-white border-primary/50 glow-primary scale-[1.02] shadow-xl" 
                : "bg-surface-container-high border-surface-variant/50 text-on-surface-variant/40 cursor-not-allowed opacity-50"
            )}
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
