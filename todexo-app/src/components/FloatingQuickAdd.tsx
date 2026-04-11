'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Plus, Clock, Calendar, Flag, Sun, Sofa, FastForward, Slash, ChevronDown, Repeat, Flame, MinusCircle, ChevronsDown, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { manageReminderTask } from '@/lib/reminder';
import clsx from 'clsx';
import { format, addDays, nextMonday, nextSaturday, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

export default function FloatingQuickAdd({ 
  onTaskAdded,
  initialDueDate,
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}: { 
  onTaskAdded?: () => void,
  initialDueDate?: Date | null,
  open?: boolean,
  onOpenChange?: (open: boolean) => void
}) {
  const [mounted, setMounted] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const { userId } = useEffectiveUser();

  useEffect(() => {
    setMounted(true);
  }, []);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  
  const setIsOpen = (newOpen: boolean) => {
    setInternalOpen(newOpen);
    externalOnOpenChange?.(newOpen);
  };

  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDueDate !== undefined ? initialDueDate : new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);
  const [timeSearch, setTimeSearch] = useState('');
  const [isRepeatMenuOpen, setIsRepeatMenuOpen] = useState(false);
  const [selectedRepeat, setSelectedRepeat] = useState<string | null>(null);
  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<number>(0);
  const [isReminderMenuOpen, setIsReminderMenuOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<number | null>(null);

  const dateOptions = [
    { label: 'Hoy', date: new Date(), time: null, icon: Calendar, color: 'text-green-400' },
    { label: 'Mañana', date: addDays(new Date(), 1), time: null, icon: Sun, color: 'text-orange-400' },
    { label: 'Este fin de semana', date: nextSaturday(new Date()), time: null, icon: Sofa, color: 'text-blue-400' },
    { label: 'Próxima semana', date: nextMonday(new Date()), time: null, icon: FastForward, color: 'text-pink-400' },
    { label: 'Sin fecha', date: null, time: null, icon: Slash, color: 'text-on-surface-variant' },
  ];

  const renderMonth = (monthOffset: number) => {
    const monthDate = addMonths(new Date(), monthOffset);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start, end });
    const monthLabel = format(monthDate, 'MMMM yyyy', { locale: es });
    const firstDayIdx = (start.getDay() === 0 ? 6 : start.getDay() - 1);

    return (
      <div key={monthOffset} className="px-3 py-3 border-b border-surface-variant/5">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface/90 mb-4 flex items-center gap-2">
          {monthLabel}
        </h4>
        <div className="grid grid-cols-7 gap-0.5 text-center mb-2">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <span key={`${d}-${i}`} className="text-[9px] font-black text-on-surface-variant/80 uppercase tracking-tighter">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array(firstDayIdx).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
          {days.map(day => {
            const isSel = selectedDate && isSameDay(day, selectedDate);
            const isTod = isToday(day);
            const isRep = selectedRepeat && selectedDate && day > selectedDate && (
              (selectedRepeat === 'daily') ||
              (selectedRepeat === 'weekly' && day.getDay() === selectedDate.getDay()) ||
              (selectedRepeat === 'weekday' && day.getDay() >= 1 && day.getDay() <= 5) ||
              (selectedRepeat === 'monthly' && day.getDate() === selectedDate.getDate())
            );

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  setSelectedDate(day);
                }}
                className={clsx(
                  "w-7 h-7 flex items-center justify-center text-[9px] font-bold rounded-full transition-all hover:bg-surface-variant/50 relative",
                  isSel ? "bg-primary text-white shadow-sm" : isTod ? "text-primary border border-primary/20" : "text-on-surface-variant/80",
                  isRep && !isSel && "border border-dashed border-primary/30 text-primary/70"
                )}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const generateTimeSlots = (query: string) => {
    const slots = [];
    const now = new Date();
    
    if (!query) {
      const start = new Date();
      start.setMinutes(Math.floor(now.getMinutes() / 15) * 15);
      start.setSeconds(0);
      
      for (let i = 0; i < 24; i++) {
        const time = new Date(start.getTime() + i * 15 * 60000);
        slots.push({
          display: format(time, 'h:mm a'),
          value: format(time, 'HH:mm:ss')
        });
      }
      return slots;
    }

    const clean = query.replace(/\D/g, '');
    const customSlots = [];

    if (clean.length >= 1 && clean.length <= 4) {
      let h = 0, m = 0;
      if (clean.length <= 2) {
        h = parseInt(clean);
      } else {
        h = parseInt(clean.slice(0, clean.length - 2));
        m = parseInt(clean.slice(clean.length - 2));
      }

      if (h < 24 && m < 60) {
        const hBase = h % 12 || 12;
        const mStr = m.toString().padStart(2, '0');
        customSlots.push({ 
          display: `${hBase}:${mStr} AM`, 
          value: `${(hBase === 12 ? 0 : hBase).toString().padStart(2, '0')}:${mStr}:00`,
          isCustom: true 
        });
        customSlots.push({ 
          display: `${hBase}:${mStr} PM`, 
          value: `${(hBase === 12 ? 12 : hBase + 12).toString().padStart(2, '0')}:${mStr}:00`,
          isCustom: true 
        });
      }
    }

    const intervalSlots = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const h12 = h % 12 || 12;
        const time12 = `${h12}:${m.toString().padStart(2, '0')}`;
        const isHourMatch = h12.toString() === query;
        const isTimeStartMatch = time12.startsWith(query);

        if (isHourMatch || isTimeStartMatch) {
          const d = new Date(); d.setHours(h, m, 0, 0);
          intervalSlots.push({ display: format(d, 'h:mm a'), value: format(d, 'HH:mm:ss') });
        }
      }
    }
    
    const combined = [...customSlots, ...intervalSlots.sort((a, b) => a.value.localeCompare(b.value))];
    const unique = Array.from(new Set(combined.map(s => s.value))).map(v => combined.find(s => s.value === v));
    return unique.slice(0, 12);
  };

  const getLabelForDate = (date: Date | null) => {
    if (!date) return 'Sin fecha';
    const now = new Date();
    if (format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) return 'Hoy';
    if (format(date, 'yyyy-MM-dd') === format(addDays(now, 1), 'yyyy-MM-dd')) return 'Mañana';
    return format(date, "d 'de' MMM", { locale: es });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !userId) return;

    setLoading(true);

    const payload: any = {
      title,
      user_id: userId,
      status: 'pending',
      due_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      due_time: selectedTime || null,
      repeat_type: selectedRepeat,
      priority: selectedPriority
    };

    if (selectedReminder && selectedDate) {
      const fullDueDate = new Date(selectedDate);
      if (selectedTime) {
        const [h, m, s] = selectedTime.split(':').map(Number);
        fullDueDate.setHours(h, m, s);
      } else {
        fullDueDate.setHours(9, 0, 0);
      }
      const reminderDate = new Date(fullDueDate.getTime() - selectedReminder * 60000);
      payload.reminder_at = reminderDate.toISOString();
    }

    const { data: insertedTask, error } = await supabase
      .from('tasks')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating task:', error);
      setLoading(false);
      return;
    }

    if (payload.reminder_at && insertedTask) {
      await manageReminderTask(
        insertedTask.id,
        title,
        null,
        payload.reminder_at,
        selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
        selectedTime,
        userId,
        selectedPriority,
        selectedRepeat
      );
    }

    setTitle('');
    setSelectedPriority(0);
    setSelectedDate(new Date());
    setSelectedTime(null);
    setSelectedRepeat(null);
    setSelectedReminder(null);
    setIsOpen(false);
    onTaskAdded?.();
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 md:bottom-12 right-6 md:right-12 w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-dim text-white flex items-center justify-center shadow-2xl glow-primary hover:scale-110 active:scale-95 transition-all z-40 group"
      >
        <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20 group-hover:opacity-40 transition-opacity"></div>
        <Sparkles size={28} className="relative transition-transform group-hover:rotate-12" />
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-background/95 backdrop-blur-3xl flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
          <div className="w-full max-w-xl glass-modal rounded-[2.5rem] p-8 relative overflow-visible shadow-[0_40px_100px_rgba(0,0,0,0.4)]">
            <header className="flex items-center justify-between mb-8 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <Plus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-on-surface px-1">Nueva Tarea</h2>
                  <p className="text-xs text-on-surface-variant font-medium px-1">Captura rápida supervisada</p>
                </div>
              </div>
              <button
                type="submit"
                form="quick-add-form"
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dim text-white font-bold text-sm rounded-xl hover:scale-105 active:scale-95 transition-all glow-primary disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Guardar'}
              </button>
            </header>

            <form id="quick-add-form" onSubmit={handleAdd} className="relative space-y-6">
              <textarea
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Escribe lo que quieres lograr hoy..."
                className="w-full bg-transparent text-2xl font-bold text-on-surface placeholder:text-on-surface-variant/20 focus:outline-none min-h-[120px] resize-none border-none ring-0 p-0 leading-tight relative z-10"
                required
              />

              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-surface-variant/30 uppercase tracking-widest text-[10px] font-black">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDateMenuOpen(!isDateMenuOpen);
                      setIsPriorityMenuOpen(false);
                      setIsReminderMenuOpen(false);
                    }}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high border border-surface-variant/40 transition-all",
                      isDateMenuOpen ? "text-primary border-primary/50" : "text-on-surface-variant hover:text-primary"
                    )}
                  >
                    <Sun size={14} className={clsx(selectedDate && "text-primary")} />
                    <span className={clsx(
                      "text-[11px] font-black uppercase tracking-tight",
                      selectedDate ? "text-primary" : "text-on-surface-variant"
                    )}>
                      {getLabelForDate(selectedDate)}
                    </span>
                    <ChevronDown size={12} className={clsx("transition-transform", isDateMenuOpen && "rotate-180")} />
                  </button>

                  {isDateMenuOpen && (
                    <div className="absolute bottom-full md:bottom-auto md:left-full md:ml-4 md:-top-64 mb-2 left-0 w-64 glass-modal rounded-2xl shadow-2xl z-[60] overflow-hidden">
                       <div className="max-h-[440px] flex flex-col overflow-y-auto custom-scrollbar">
                          {Array.from({ length: 15 }).map((_, i) => renderMonth(i))}
                       </div>
                       <div className="p-2 border-t border-surface-variant/20 bg-surface-container-high flex justify-end">
                          <button type="button" onClick={() => setIsDateMenuOpen(false)} className="px-4 py-1.5 bg-primary text-white text-[10px] font-black rounded-lg">LISTO</button>
                       </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsPriorityMenuOpen(!isPriorityMenuOpen);
                      setIsDateMenuOpen(false);
                      setIsReminderMenuOpen(false);
                    }}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high border transition-all",
                      selectedPriority > 0 ? "border-primary/50 text-primary" : "border-surface-variant/40 text-on-surface-variant"
                    )}
                  >
                    <Flag size={14} />
                    <span>Prioridad {selectedPriority || ''}</span>
                  </button>
                  {isPriorityMenuOpen && (
                    <div className="absolute bottom-full right-0 mb-4 w-48 glass-modal rounded-2xl shadow-2xl z-50 py-2">
                       {[3, 2, 1, 0].map(p => (
                         <button key={p} type="button" onClick={() => { setSelectedPriority(p); setIsPriorityMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-surface-variant/20 text-xs font-bold uppercase">Prioridad {p || 'Ninguna'}</button>
                       ))}
                    </div>
                  )}
                </div>

                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="ml-auto p-2.5 rounded-xl bg-surface-variant/10 text-on-surface-variant hover:text-red-400 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
