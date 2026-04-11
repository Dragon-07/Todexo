'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Plus, Clock, Calendar, Flag, Sun, Sofa, FastForward, Slash, ChevronDown, CalendarDays, Repeat, Flame, MinusCircle, ChevronsDown, Bell } from 'lucide-react';
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
    const firstDayIdx = (start.getDay() === 0 ? 6 : start.getDay() - 1); // Adjust for Monday start

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

  interface TimeSlot {
    display: string;
    value: string;
    isCustom?: boolean;
  }

  const generateTimeSlots = (query: string): TimeSlot[] => {
    const slots: TimeSlot[] = [];
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
    const customSlots: TimeSlot[] = [];

    // 1. Detección Inteligente (Human Parsing): "542" -> 5:42
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

    // 2. Filtro ESTRICTO de intervalos de 15 min (Formato 12 horas)
    const intervalSlots: TimeSlot[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const h12 = h % 12 || 12;
        const time12 = `${h12}:${m.toString().padStart(2, '0')}`;
        
        // Coincidencia estricta: si la hora sola coincide o si el formato h:mm empieza por la query
        const isHourMatch = h12.toString() === query;
        const isTimeStartMatch = time12.startsWith(query);

        if (isHourMatch || isTimeStartMatch) {
          const d = new Date(); d.setHours(h, m, 0, 0);
          intervalSlots.push({ display: format(d, 'h:mm a'), value: format(d, 'HH:mm:ss') });
        }
      }
    }
    
    // Ordenar cronológicamente
    const sortedIntervals = [...intervalSlots].sort((a, b) => {
        return a.value.localeCompare(b.value);
    });

    // Combinar, evitando duplicados (si el custom 3:00 ya está arriba, no lo repetimos abajo)
    const combined = [...customSlots];
    sortedIntervals.forEach(s => {
      if (!combined.some(c => c.value === s.value)) {
        combined.push(s);
      }
    });

    return combined.slice(0, 12);
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
        user_id: userId,

        title,
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

      // Insertar la tarea principal y obtener su ID
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

      // === CREAR TAREA-RECORDATORIO AUTOMÁTICA ===
      // Solo si hay recordatorio configurado
      if (payload.reminder_at && insertedTask) {
        await manageReminderTask(
          insertedTask.id,
          title,
          null, // Tarea nueva, no hay recordatorio previo
          payload.reminder_at,
          selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
          selectedTime,
          userId,
          selectedPriority,
          selectedRepeat
        );
      }
      // ===========================================

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
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>

            <header className="flex items-center justify-between mb-8 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <Plus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-on-surface px-1">Nueva Tarea</h2>
                  <p className="text-xs text-on-surface-variant font-medium px-1">Captura rápida con IA asistida</p>
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
                    {selectedTime && (
                      <span className="text-teal-400 ml-1 lowercase text-[10px] font-bold">
                        {format(new Date(`2000-01-01T${selectedTime}`), 'h:mm a')}
                      </span>
                    )}
                    <ChevronDown size={12} className={clsx("transition-transform", isDateMenuOpen && "rotate-180", selectedDate && "text-primary")} />
                  </button>


                  {isDateMenuOpen && (
                    <div className="absolute bottom-full md:bottom-auto md:left-full md:ml-4 md:-top-64 mb-2 left-0 w-64 glass-modal rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] z-[60] animate-in slide-in-from-bottom-2 md:slide-in-from-left-2 duration-200 overflow-hidden">

                      <div className="max-h-[440px] flex flex-col custom-scrollbar">
                        {/* ATAJOS: FIJO ARRIBA */}
                        <div className="flex-none py-0 border-b border-surface-variant/20 bg-surface-container-high">
                          <div className="px-3 pt-3 pb-1.5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant flex items-center relative border-b border-surface-variant/5">
                            <span className="relative z-10 opacity-60">Atajos</span>
                            <span className="absolute left-1/2 -translate-x-1/2 text-primary font-black text-[16px] tracking-[0.1em] uppercase truncate w-full text-center px-16 pointer-events-none">
                              {selectedDate ? format(selectedDate, 'MMMM d', { locale: es }) : 'SIN FECHA'}
                            </span>
                          </div>
                          {dateOptions.map((opt, i) => {
                            const Icon = opt.icon;
                            const isSelected = opt.date 
                              ? (selectedDate && isSameDay(selectedDate, opt.date))
                              : selectedDate === null;

                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setSelectedDate(opt.date);
                                  if (opt.time) setSelectedTime(opt.time);
                                }}
                                className={clsx(
                                  "w-full flex items-center justify-between px-3 py-2 transition-colors group",
                                  isSelected ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-surface-variant/50 border-l-2 border-transparent"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon size={14} className={clsx(opt.color)} />
                                  <span className={clsx(
                                    "text-xs font-bold transition-colors",
                                    isSelected ? "text-primary" : "text-on-surface group-hover:text-primary"
                                  )}>
                                    {opt.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isSelected && <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />}
                                  <span className={clsx(
                                    "text-[9px] font-medium uppercase",
                                    isSelected ? "text-primary/60" : "text-on-surface-variant/60"
                                  )}>
                                    {opt.date ? format(opt.date, 'eee', { locale: es }) : ''}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* CALENDARIO: DESPLAZABLE */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                          {Array.from({ length: 15 }).map((_, i) => renderMonth(i))}
                        </div>
                      </div>
                      <div className="p-2 bg-surface-container-high border-t border-surface-variant/20 grid grid-cols-3 gap-2 relative">
                        <div className="relative">
                          <button 
                            type="button" 
                            onClick={() => {
                              setIsTimeMenuOpen(!isTimeMenuOpen);
                              if (!isTimeMenuOpen) setTimeSearch('');
                            }}
                            className={clsx(
                              "w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border transition-all group text-[10px] font-black h-[34px]",
                              isTimeMenuOpen 
                                ? "bg-primary/20 border-primary text-primary shadow-sm shadow-primary/20" 
                                : "bg-surface-variant/30 border-surface-variant/40 text-on-surface hover:bg-surface-variant hover:border-primary/50"
                            )}
                          >
                            {selectedTime ? (
                              <div className="flex items-center gap-1.5 text-teal-400 lowercase">
                                <Clock size={12} className="animate-pulse" />
                                <span>{format(new Date(`2000-01-01T${selectedTime}`), 'h:mm a')}</span>
                              </div>
                            ) : 'Hora'}
                          </button>

                          {isTimeMenuOpen && (
                            <div className="absolute bottom-full left-0 mb-2 w-52 glass-modal rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.4)] overflow-hidden animate-in zoom-in-95 duration-200 z-[70]">
                              <div className="p-2 border-b border-surface-variant/20 bg-surface-container-high/30 text-center">
                                <input 
                                  autoFocus
                                  type="text"
                                  value={timeSearch}
                                  onChange={(e) => setTimeSearch(e.target.value)}
                                  placeholder="00:00"
                                  className="w-32 mx-auto block px-2 py-0.5 text-2xl font-black text-on-surface bg-surface-container-high rounded-xl border border-surface-variant/30 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/20 text-center tracking-tight"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const slots = generateTimeSlots(timeSearch);
                                      if (slots.length > 0) {
                                        setSelectedTime(slots[0].value);
                                        setIsTimeMenuOpen(false);
                                      }
                                    }
                                  }}
                                />
                              </div>
                              <div className="max-h-[300px] overflow-y-auto py-1 custom-scrollbar">
                                {(() => {
                                  const allSlots = generateTimeSlots(timeSearch);
                                  const custom = allSlots.filter(s => s.isCustom);
                                  const regular = allSlots.filter(s => !s.isCustom);
                                  
                                  return (
                                    <>
                                      {custom.length > 0 && (
                                        <div className="flex px-3 py-2 gap-2 border-b border-white/5 bg-primary/5 sticky top-0 z-10 backdrop-blur-sm">
                                          {custom.map((s) => (
                                            <button 
                                              key={s.value}
                                              type="button"
                                              onClick={() => {
                                                setSelectedTime(s.value);
                                                setIsTimeMenuOpen(false);
                                              }}
                                              className="flex-1 py-1.5 px-1 bg-surface-container border border-primary/30 rounded-xl text-[10px] font-black text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                                            >
                                              {s.display}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                      {regular.map((slot) => (
                                        <button
                                          key={slot.value}
                                          type="button"
                                          onClick={() => {
                                            setSelectedTime(slot.value);
                                            setIsTimeMenuOpen(false);
                                          }}
                                          className={clsx(
                                            "w-full text-left px-4 py-2 text-[13px] font-black tracking-tight transition-colors border-b border-white/5 last:border-none",
                                            selectedTime === slot.value 
                                              ? "bg-primary/10 text-primary" 
                                              : "text-on-surface/80 hover:bg-surface-variant hover:text-primary"
                                          )}
                                        >
                                          {slot.display}
                                        </button>
                                      ))}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                          <div className="relative">
                            <button 
                              type="button" 
                              onClick={() => setIsRepeatMenuOpen(!isRepeatMenuOpen)}
                              className={clsx(
                                "w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border transition-all group text-[10px] font-black h-[34px]",
                                isRepeatMenuOpen || selectedRepeat 
                                  ? "bg-secondary/20 border-secondary text-secondary shadow-sm shadow-secondary/20" 
                                  : "bg-surface-variant/30 border-surface-variant/40 text-on-surface hover:bg-surface-variant hover:border-secondary/50"
                              )}
                            >
                              <Repeat size={12} className={clsx("transition-transform", (isRepeatMenuOpen || selectedRepeat) ? "text-secondary" : "text-on-surface-variant group-hover:rotate-180 duration-500")} />
                              <span className="truncate">
                                {selectedRepeat ? (() => {
                                  const d = selectedDate || new Date();
                                  if (selectedRepeat === 'daily') return 'CADA DÍA';
                                  if (selectedRepeat === 'weekly') return `CADA SEMANA EL ${format(d, 'eeee', { locale: es }).toUpperCase()}`;
                                  if (selectedRepeat === 'weekday') return 'CADA DÍA LABORABLE (LUN - VIE)';
                                  if (selectedRepeat === 'monthly') return `CADA MES EL ${format(d, 'd')}`;
                                  return 'Repetir';
                                })() : 'Repetir'}
                              </span>
                            </button>

                            {isRepeatMenuOpen && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 glass-modal rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-200 z-[70] overflow-hidden">
                                  <div className="py-1">
                                    {(() => {
                                      const d = selectedDate || new Date();
                                      const dayName = format(d, 'eeee', { locale: es });
                                      const dayNum = format(d, 'd');
                                      const options = [
                                        { id: 'daily', label: 'Cada día' },
                                        { id: 'weekly', label: `Cada semana el ${dayName}` },
                                        { id: 'weekday', label: 'Cada día laborable (lun - vie)' },
                                        { id: 'monthly', label: `Cada mes el ${dayNum}` },
                                      ];
  
                                      return options.map((opt) => (
                                        <button
                                          key={opt.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedRepeat(opt.id);
                                            setIsRepeatMenuOpen(false);
                                          }}
                                          className={clsx(
                                            "w-full text-left px-4 py-2 text-[13px] font-black tracking-tight transition-colors border-b border-white/5 last:border-none uppercase",
                                            selectedRepeat === opt.id ? "bg-secondary/10 text-secondary" : "text-on-surface/80 hover:bg-surface-variant hover:text-secondary"
                                          )}
                                        >
                                          {opt.id === 'daily' && 'Cada día'}
                                          {opt.id === 'weekly' && `Cada semana el ${dayName}`}
                                          {opt.id === 'weekday' && 'Cada día laborable (lun - vie)'}
                                          {opt.id === 'monthly' && `Cada mes el ${dayNum}`}
                                        </button>
                                      ));
                                    })()}
                                    {selectedRepeat && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedRepeat(null);
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

                        <button 
                          type="button" 
                          onClick={() => setIsDateMenuOpen(false)}
                          className="flex items-center justify-center py-2 rounded-xl bg-primary text-white text-[10px] font-black hover:scale-105 active:scale-95 transition-all shadow-lg glow-primary-sm h-[34px]"
                        >
                          LISTO
                        </button>
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
                      selectedPriority === 3 ? "border-red-500/50 text-red-400" :
                      selectedPriority === 2 ? "border-orange-500/50 text-orange-400" :
                      selectedPriority === 1 ? "border-blue-500/50 text-blue-400" :
                      "border-surface-variant/40 text-on-surface-variant hover:text-primary"
                    )}
                  >
                    <div className={clsx("flex items-center gap-2", selectedPriority === 0 && "opacity-60")}>
                      {selectedPriority === 3 ? <Flame size={14} className="fill-red-400/20" /> :
                       selectedPriority === 2 ? <MinusCircle size={14} className="fill-orange-400/20" /> :
                       selectedPriority === 1 ? <ChevronsDown size={14} className="fill-blue-400/20" /> :
                       <Flag size={14} />}
                      {selectedPriority === 3 ? 'Alta' :
                       selectedPriority === 2 ? 'Media' :
                       selectedPriority === 1 ? 'Baja' : 'Sin prioridad'}
                    </div>
                  </button>

                  {isPriorityMenuOpen && (
                    <div className="absolute bottom-full right-0 mb-4 w-48 glass-modal rounded-[2.5rem] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
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
                              setSelectedPriority(p.id);
                              setIsPriorityMenuOpen(false);
                            }}
                            className={clsx(
                              "w-full text-left px-4 py-2 text-[13px] font-black tracking-tight transition-colors border-b border-white/5 last:border-none uppercase flex items-center gap-3",
                              selectedPriority === p.id ? "bg-surface-variant/20" : p.bg,
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
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsReminderMenuOpen(!isReminderMenuOpen);
                      setIsDateMenuOpen(false);
                      setIsPriorityMenuOpen(false);
                    }}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                      selectedReminder 
                        ? "bg-amber-400/10 border-amber-400/50 text-amber-500 shadow-sm shadow-amber-400/20" 
                        : "bg-surface-container-high border-surface-variant/40 text-on-surface-variant hover:text-amber-500"
                    )}
                  >
                    <Bell size={14} className={clsx(selectedReminder && "fill-amber-500/20")} />
                    <span>
                      {selectedReminder === 15 ? '15 min antes' :
                       selectedReminder === 30 ? '30 min antes' :
                       selectedReminder === 60 ? '1 hora antes' :
                       selectedReminder === 1440 ? '1 día antes' : 'Recordatorio'}
                    </span>
                  </button>

                  {isReminderMenuOpen && (
                    <div className="absolute bottom-full right-0 mb-4 w-48 glass-modal rounded-[2.5rem] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
                      <div className="py-1">
                        {[
                          { id: 15, label: '15 min antes' },
                          { id: 30, label: '30 min antes' },
                          { id: 60, label: '1 hora antes' },
                          { id: 1440, label: '1 día antes' },
                          { id: null, label: 'Sin recordatorio' },
                        ].map((r) => (
                          <button
                            key={String(r.id)}
                            type="button"
                            onClick={() => {
                              setSelectedReminder(r.id);
                              setIsReminderMenuOpen(false);
                            }}
                            className={clsx(
                              "w-full text-left px-4 py-2 text-[13px] font-black transition-colors border-b border-white/5 last:border-none uppercase flex items-center gap-3",
                              selectedReminder === r.id ? "bg-amber-400/10 text-amber-500" : "text-on-surface-variant/80 hover:bg-amber-400/10 hover:text-amber-500"
                            )}
                          >
                            <Bell size={14} className={selectedReminder === r.id ? "fill-amber-500/20" : ""} />
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="ml-auto p-2.5 rounded-xl bg-surface-variant/10 hover:bg-red-500/10 text-on-surface-variant hover:text-red-400 border border-surface-variant/20 hover:border-red-500/30 transition-all group active:scale-90 shadow-sm"
                  title="Cerrar ventana"
                >
                  <X size={20} className="group-hover:rotate-90 transition-transform duration-500" />
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
