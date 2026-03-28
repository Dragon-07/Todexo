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
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);
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

  const [mainTaskData, setMainTaskData] = useState<{
    title: string;
    due_date?: string | null;
    due_time?: string | null;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTitle(task.title);
      setDate(task.due_date || null);
      setTime(task.due_time || null);
      setPriority(task.priority || 0);
      setRepeat(task.repeat_type || null);
      setReminderAt(task.reminder_at || null);
      setSelectedReminderMinutes(null);

      if (task.is_reminder && task.reminder_for_task_id) {
        const fetchMainTask = async () => {
          const { data } = await supabase
            .from('tasks')
            .select('title, due_date, due_time')
            .eq('id', task.reminder_for_task_id)
            .single();
          if (data) setMainTaskData(data);
        };
        fetchMainTask();
      }
    }
  }, [isOpen, task]);

  if (!isOpen || !mounted) return null;

  const handleMarkAsDone = async () => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', task.id);
      
      if (!error) {
        onSave({ status: 'completed' });
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

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

    if (task.reminder_at || finalReminderAt) {
      await manageReminderTask(
        task.id,
        title,
        task.reminder_at || null,
        finalReminderAt,
        date,
        time,
        task.user_id,
        Number(priority),
        repeat
      );
    }

    onSave({
      title,
      due_date: date,
      due_time: time,
      priority: Number(priority),
      repeat_type: repeat,
      reminder_at: finalReminderAt
    });
    onClose();
  };

  const internalGenerateTimeSlots = (query: string) => {
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
    if (clean.length >= 1 && clean.length <= 4) {
      let h = 0, m = 0;
      if (clean.length <= 2) h = parseInt(clean);
      else { h = parseInt(clean.slice(0, clean.length - 2)); m = parseInt(clean.slice(clean.length - 2)); }
      if (h < 24 && m < 60) {
        const hBase = h % 12 || 12;
        const mStr = m.toString().padStart(2, '0');
        slots.push({ display: `${hBase}:${mStr} AM`, value: `${(h % 12).toString().padStart(2, '0')}:${mStr}:00`, isCustom: true });
        slots.push({ display: `${hBase}:${mStr} PM`, value: `${(h % 12 + 12).toString().padStart(2, '0')}:${mStr}:00`, isCustom: true });
      }
    }

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const h12 = h % 12 || 12;
        const time12 = `${h12}:${m.toString().padStart(2, '0')}`;
        if (h12.toString() === query || time12.startsWith(query)) {
          const d = new Date(); d.setHours(h, m, 0, 0);
          slots.push({ display: format(d, 'h:mm a'), value: format(d, 'HH:mm:ss') });
        }
      }
    }
    return slots;
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div 
        ref={modalRef}
        className="w-full max-w-lg glass-modal rounded-[3rem] shadow-[0_32px_128px_rgba(0,0,0,0.8)] border border-white/20 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header con estilo Glass */}
        <div className="p-4 flex items-center justify-between border-b border-white/10 shrink-0 bg-surface-container-high/30">
          <div className="flex items-center gap-4">
            <div className={clsx(
              "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-colors duration-500",
              task.is_reminder ? "bg-amber-500/15 border-amber-500/30 text-amber-500 shadow-amber-500/10" : "bg-primary/15 border-primary/30 text-primary shadow-primary/10"
            )}>
              {task.is_reminder ? <Bell size={22} className="fill-amber-500/10 glow-amber" /> : <PencilLine size={22} />}
            </div>
            <div>
              <h2 className="text-xl font-black text-on-surface tracking-tight uppercase">
                {task.is_reminder ? 'Recordatorio' : 'Editar Tarea'}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Todexo Premium Edition</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 rounded-2xl bg-surface-variant/40 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-all active:scale-90 border border-white/5"
          >
            <X size={20} />
          </button>
        </div>

        <div className={clsx(
          "p-4 overflow-y-auto custom-scrollbar",
          task.is_reminder ? "flex-initial space-y-3" : "flex-1 space-y-4"
        )}>
          {/* SECCIÓN ESPECIAL PARA RECORDATORIOS */}
          {task.is_reminder && (
            <div className="animate-in slide-in-from-top-4 duration-500 space-y-4">
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/80 px-1">
                <div className="w-2 h-2 rounded-full bg-amber-500 glow-amber" />
                <span>Tarea original vinculada</span>
              </div>
              
              <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/20 shadow-inner space-y-4">
                <p className="text-lg font-black text-on-surface leading-snug tracking-tight">
                  {mainTaskData?.title || 'Cargando datos de la tarea...'}
                </p>
                <div className="flex items-center gap-6">
                  {mainTaskData?.due_date && (
                    <div className="flex items-center gap-2 text-xs font-black text-amber-400">
                      <CalendarIcon size={16} />
                      <span className="uppercase tracking-widest">{format(parseISO(mainTaskData.due_date), 'd MMMM', { locale: es })}</span>
                    </div>
                  )}
                  {mainTaskData?.due_time && (
                    <div className="flex items-center gap-2 text-xs font-black text-teal-400">
                      <Clock size={16} />
                      <span>{format(new Date(`2000-01-01T${mainTaskData.due_time}`), 'h:mm a')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Title input - Hidden if it's a reminder */}
          {!task.is_reminder && (
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1">Título de la tarea</label>
              <textarea 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="¿Qué tienes programado?"
                className="w-full bg-surface-container border-2 border-surface-variant/20 rounded-[1.5rem] px-5 py-3 text-lg font-bold text-on-surface min-h-[80px] focus:outline-none focus:border-primary/50 transition-all resize-none shadow-inner placeholder:text-on-surface-variant/20 tracking-tight custom-scrollbar"
              />
            </div>
          )}

          {!task.is_reminder && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1">Fecha</label>
                  <div className="relative group">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={16} />
                    <input 
                      type="date"
                      value={date || ''}
                      onChange={(e) => setDate(e.target.value || null)}
                      className="w-full bg-surface-container border-2 border-surface-variant/20 rounded-2xl pl-12 pr-4 py-3 text-on-surface font-bold focus:outline-none focus:border-primary/50 transition-all text-xs"
                    />
                  </div>
                </div>
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
                      className="w-full h-[46px] flex items-center gap-3 bg-surface-container border-2 border-surface-variant/20 rounded-2xl px-4 py-3 text-on-surface font-bold focus:outline-none focus:border-teal-400/50 transition-all text-xs"
                    >
                      <Clock className={clsx("transition-colors", isTimeMenuOpen ? "text-teal-400" : "text-on-surface-variant")} size={16} />
                      <span>{time ? format(new Date(`2000-01-01T${time}`), 'h:mm a') : 'Sin hora'}</span>
                    </button>

                    {isTimeMenuOpen && (
                      <div className="absolute top-full left-0 mt-2 w-52 glass-modal rounded-[1.5rem] shadow-2xl z-[70] overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10">
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
                          {internalGenerateTimeSlots(timeSearch).map((slot, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setTime(slot.value);
                                setIsTimeMenuOpen(false);
                              }}
                              className={clsx(
                                "w-full text-left px-4 py-3 text-xs font-black transition-colors uppercase tracking-widest flex items-center justify-between border-b border-white/5 last:border-none",
                                time === slot.value ? "bg-teal-400/10 text-teal-400" : "text-on-surface/80 hover:bg-white/5 hover:text-teal-400",
                                slot.isCustom && "bg-primary/5 text-primary border-y border-white/5"
                              )}
                            >
                              <span>{slot.display}</span>
                              {time === slot.value && <Check size={14} />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1 font-amber-500">Recordatorio</label>
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
                        "flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container border-2 transition-all w-full h-[46px]",
                        (reminderAt || selectedReminderMinutes) ? "border-amber-400/50 text-amber-500 shadow-sm shadow-amber-400/10" : "border-surface-variant/20 text-on-surface-variant hover:border-amber-400/20"
                      )}
                    >
                      <Bell size={16} className={clsx((reminderAt || selectedReminderMinutes) ? "text-amber-500 fill-amber-500/10" : "text-on-surface-variant")} />
                      <span className="text-xs font-black uppercase tracking-tight truncate">
                        {selectedReminderMinutes === 15 ? '15 min antes' : selectedReminderMinutes === 30 ? '30 min antes' : selectedReminderMinutes === 60 ? '1 hora antes' : selectedReminderMinutes === 1440 ? '1 día antes' : reminderAt ? format(parseISO(reminderAt), "d MMM, h:mm a", { locale: es }) : 'Sin recordatorio'}
                      </span>
                    </button>

                    {isReminderMenuOpen && (
                      <div className="absolute left-0 top-full mt-2 w-56 glass-modal rounded-[1.5rem] shadow-[0_24px_64px_rgba(0,0,0,0.8)] z-[70] overflow-hidden border border-surface-variant/30 animate-in zoom-in-95 duration-200">
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
                              onClick={() => { setSelectedReminderMinutes(opt.id); setReminderAt(null); setIsReminderMenuOpen(false); }}
                              className={clsx("w-full text-left px-4 py-3 text-xs font-black transition-colors border-b border-white/5 last:border-none uppercase flex items-center gap-3", selectedReminderMinutes === opt.id ? "bg-amber-400/10 text-amber-500" : "text-on-surface-variant hover:bg-surface-variant")}
                            >
                              <Bell size={14} /> {opt.label}
                            </button>
                          ))}
                          {(reminderAt || selectedReminderMinutes) && (
                            <button
                              type="button"
                              onClick={() => { setReminderAt(null); setSelectedReminderMinutes(null); setIsReminderMenuOpen(false); }}
                              className="w-full text-left px-4 py-3 text-[10px] font-black text-red-500 hover:bg-red-500/10 transition-colors uppercase tracking-widest"
                            >
                              Terminar recordatorio
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1 border-white/5">Prioridad</label>
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
                        "flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-container border-2 transition-all w-full h-[46px]",
                        priority == 3 ? "border-red-500/50 text-red-400" :
                        priority == 2 ? "border-orange-500/50 text-orange-400" :
                        priority == 1 ? "border-blue-500/50 text-blue-400" :
                        "border-surface-variant/20 text-on-surface-variant hover:text-primary"
                      )}
                    >
                      {priority == 3 ? <Flame size={14} className="fill-red-400/20" /> :
                       priority == 2 ? <MinusCircle size={14} className="fill-orange-400/20" /> :
                       priority == 1 ? <ChevronsDown size={14} className="fill-blue-400/20" /> :
                       <Flag size={14} />}
                      <span className="text-xs font-black uppercase tracking-tight">
                        {priority == 3 ? 'Alta' : priority == 2 ? 'Media' : priority == 1 ? 'Baja' : 'Sin prioridad'}
                      </span>
                    </button>

                    {isPriorityMenuOpen && (
                      <div className="absolute top-full left-0 mt-2 w-48 glass-modal rounded-[1.5rem] shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden border border-surface-variant/30 z-[70] animate-in zoom-in-95 duration-200">
                        {[
                          { id: 3, label: 'Alta', color: 'text-red-400', bg: 'hover:bg-red-500/10', Icon: Flame, iconColor: 'fill-red-400/20' },
                          { id: 2, label: 'Media', color: 'text-orange-400', bg: 'hover:bg-orange-500/10', Icon: MinusCircle, iconColor: 'fill-orange-400/20' },
                          { id: 1, label: 'Baja', color: 'text-blue-400', bg: 'hover:bg-blue-500/10', Icon: ChevronsDown, iconColor: 'fill-blue-400/20' },
                          { id: 0, label: 'Sin prioridad', color: 'text-on-surface-variant/60', bg: 'hover:bg-white/5', Icon: Flag, iconColor: '' },
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { setPriority(p.id); setIsPriorityMenuOpen(false); }}
                            className={clsx("w-full text-left px-4 py-3 text-xs font-black transition-colors border-b border-white/5 last:border-none uppercase flex items-center gap-3", priority == p.id ? "bg-surface-variant/20" : p.bg, p.color)}
                          >
                            <p.Icon size={14} className={p.iconColor} /> {p.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1 border-white/5">Repetir</label>
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
                        "flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container border-2 transition-all w-full h-[46px]",
                        repeat ? "border-secondary/50 text-secondary" : "border-surface-variant/20 text-on-surface-variant hover:text-secondary"
                      )}
                    >
                      <Repeat size={16} className={repeat ? "text-secondary" : "text-on-surface-variant"} />
                      <span className="text-xs font-black uppercase tracking-tight">
                        {repeat === 'daily' ? 'Cada día' : repeat === 'weekly' ? 'Semanal' : repeat === 'weekday' ? 'Lun-Vie' : repeat === 'monthly' ? 'Mensual' : 'No repetir'}
                      </span>
                    </button>

                    {isRepeatMenuOpen && (
                      <div className="absolute top-full left-0 mt-2 w-full glass-modal rounded-[1.5rem] shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden border border-surface-variant/30 z-[70] animate-in zoom-in-95 duration-200">
                        {[
                          { id: 'daily', label: 'Cada día' },
                          { id: 'weekly', label: 'Cada semana' },
                          { id: 'weekday', label: 'Laborables' },
                          { id: 'monthly', label: 'Cada mes' },
                          { id: null, label: 'No repetir' },
                        ].map((opt) => (
                          <button
                            key={String(opt.id)}
                            type="button"
                            onClick={() => { setRepeat(opt.id); setIsRepeatMenuOpen(false); }}
                            className={clsx("w-full text-left px-4 py-3 text-xs font-black transition-colors uppercase tracking-widest flex items-center gap-4 border-b border-white/5 last:border-none", repeat === opt.id ? "bg-secondary/10 text-secondary" : "text-on-surface-variant hover:bg-surface-variant hover:text-secondary")}
                          >
                            <Repeat size={14} /> {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className={clsx(
          "border-t border-white/10 shrink-0 bg-surface-container-high/30 flex flex-col gap-4",
          task.is_reminder ? "p-6" : "p-8"
        )}>
          {task.is_reminder ? (
            <button
              onClick={handleMarkAsDone}
              className="w-full py-5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-black text-xs uppercase tracking-[0.3em] rounded-[2.5rem] flex items-center justify-center gap-4 shadow-xl shadow-amber-500/5 glow-amber-sm transition-all active:scale-[0.97] border border-amber-500/30"
            >
              <Bell size={20} className="fill-amber-500/10" />
              Terminar Recordatorio
            </button>
          ) : (
            <div className="flex gap-4">
              <button 
                onClick={onClose}
                className="flex-1 py-3 bg-surface-variant/30 hover:bg-red-500/10 text-on-surface-variant hover:text-red-400 font-black text-[10px] uppercase tracking-[0.2em] border border-white/5 rounded-2xl transition-all"
              >
                Continuar
              </button>
              <button 
                onClick={handleSave}
                disabled={!hasChanges}
                className={clsx(
                  "flex-[2] py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl",
                  hasChanges 
                    ? "bg-primary text-on-primary glow-primary hover:brightness-110 active:scale-[0.98]" 
                    : "bg-surface-variant/10 text-on-surface-variant opacity-50 cursor-not-allowed"
                )}
              >
                Guardar Cambios
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function generateTimeSlots(query: string) {
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
  if (clean.length >= 1 && clean.length <= 4) {
    let h = 0, m = 0;
    if (clean.length <= 2) h = parseInt(clean);
    else { h = parseInt(clean.slice(0, clean.length - 2)); m = parseInt(clean.slice(clean.length - 2)); }
    if (h < 24 && m < 60) {
      const hBase = h % 12 || 12;
      const mStr = m.toString().padStart(2, '0');
      slots.push({ display: `${hBase}:${mStr} AM`, value: `${(h % 12).toString().padStart(2, '0')}:${mStr}:00`, isCustom: true });
      slots.push({ display: `${hBase}:${mStr} PM`, value: `${(h % 12 + 12).toString().padStart(2, '0')}:${mStr}:00`, isCustom: true });
    }
  }

  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const h12 = h % 12 || 12;
      const time12 = `${h12}:${m.toString().padStart(2, '0')}`;
      if (h12.toString() === query || time12.startsWith(query)) {
        const d = new Date(); d.setHours(h, m, 0, 0);
        slots.push({ display: format(d, 'h:mm a'), value: format(d, 'HH:mm:ss') });
      }
    }
  }
  return slots;
}
