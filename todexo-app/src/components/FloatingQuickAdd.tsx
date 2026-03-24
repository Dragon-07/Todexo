'use client';

import { useState } from 'react';
import { Sparkles, X, Plus, Clock, Calendar, Flag, Sun, Sofa, FastForward, Slash, ChevronDown, CalendarDays, Repeat } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import clsx from 'clsx';
import { format, addDays, nextMonday, nextSaturday, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export default function FloatingQuickAdd({ onTaskAdded }: { onTaskAdded?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);
  const [timeSearch, setTimeSearch] = useState('');
  const [isRepeatMenuOpen, setIsRepeatMenuOpen] = useState(false);
  const [selectedRepeat, setSelectedRepeat] = useState<string | null>(null);

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
      <div key={monthOffset} className="px-3 py-2 border-b border-surface-variant/10">
        <h4 className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2 capitalize">{monthLabel}</h4>
        <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => (
            <span key={d} className="text-[7px] font-bold text-on-surface-variant/40">{d}</span>
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
    if (!title.trim()) return;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.from('tasks').insert({
        title,
        user_id: user.id,
        status: 'pending',
        due_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
        due_time: selectedTime || null,
        repeat_type: selectedRepeat
      });

      setTitle('');
      setIsOpen(false);
      onTaskAdded?.();
    }
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

      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xl flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-surface-container rounded-[2.5rem] border border-surface-variant p-8 ambient-shadow relative overflow-visible">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>

            <header className="flex items-center justify-between mb-8 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <Plus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white px-1">Nueva Tarea</h2>
                  <p className="text-xs text-on-surface-variant font-medium px-1">Captura rápida con IA asistida</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-on-surface-variant hover:text-white p-2 rounded-full hover:bg-surface-variant transition-colors"
                title="Cerrar (ESC)"
              >
                <X size={24} />
              </button>
            </header>

            <form onSubmit={handleAdd} className="relative space-y-6">
              <textarea
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Escribe lo que quieres lograr hoy..."
                className="w-full bg-transparent text-2xl font-bold text-white placeholder:text-on-surface-variant/30 focus:outline-none min-h-[120px] resize-none border-none ring-0 p-0 leading-tight"
                required
              />

              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-surface-variant/30 uppercase tracking-widest text-[10px] font-black">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high border border-surface-variant/40 transition-all",
                      isDateMenuOpen ? "text-primary border-primary/50" : "text-on-surface-variant hover:text-primary"
                    )}
                  >
                    <Sun size={14} />
                    {getLabelForDate(selectedDate)}
                    {selectedTime && (
                      <span className="text-secondary ml-1 lowercase">
                        {format(new Date(`2000-01-01T${selectedTime}`), 'h:mm a')}
                      </span>
                    )}
                    <ChevronDown size={12} className={clsx("transition-transform", isDateMenuOpen && "rotate-180")} />
                  </button>

                  {/* Indicator below the button */}
                  {selectedDate && (
                    <div className="absolute top-full left-0 mt-2 px-3 py-1 bg-surface-variant/20 rounded-full border border-surface-variant/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                      <div className="w-1 h-1 rounded-full bg-secondary glow-secondary"></div>
                      <span className="text-[10px] font-bold text-secondary uppercase tracking-tighter capitalize">
                        {format(selectedDate, "MMMM d", { locale: es })}
                      </span>
                    </div>
                  )}

                  {isDateMenuOpen && (
                    <div className="absolute bottom-full md:bottom-auto md:left-full md:ml-4 md:-top-64 mb-2 left-0 w-64 bg-surface-container rounded-2xl border border-surface-variant shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] z-[60] overflow-hidden animate-in slide-in-from-bottom-2 md:slide-in-from-left-2 duration-200">
                      <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
                        <div className="py-1 border-b border-surface-variant/20">
                          <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant flex justify-between items-center bg-surface-container-high/90 sticky top-0 backdrop-blur-md z-10 border-b border-surface-variant/10">
                            <span>Atajos</span>
                            <span className="text-secondary font-black text-[10px] tracking-widest uppercase truncate max-w-[150px] text-right">
                              {selectedDate ? (
                                (isToday(selectedDate) ? 'HOY: ' : 
                                 isSameDay(selectedDate, addDays(new Date(), 1)) ? 'MAÑANA: ' : '') + 
                                format(selectedDate, 'd MMM', { locale: es })
                              ) : 'SIN FECHA'}
                            </span>
                          </div>
                          {dateOptions.map((opt, i) => {
                            const Icon = opt.icon;
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setSelectedDate(opt.date);
                                  if (opt.time) setSelectedTime(opt.time);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-variant/50 transition-colors group"
                              >
                                <div className="flex items-center gap-2">
                                  <Icon size={14} className={clsx(opt.color)} />
                                  <span className="text-xs font-bold text-white group-hover:text-primary transition-colors">{opt.label}</span>
                                </div>
                                <span className="text-[9px] font-medium text-on-surface-variant/60 uppercase">
                                  {opt.date ? format(opt.date, 'eee', { locale: es }) : ''}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {Array.from({ length: 15 }).map((_, i) => renderMonth(i))}
                      </div>
                      <div className="p-2 bg-surface-container-high/60 border-t border-surface-variant/20 grid grid-cols-3 gap-2 relative">
                        <div className="relative">
                          <button 
                            type="button" 
                            onClick={() => {
                              setIsTimeMenuOpen(!isTimeMenuOpen);
                              if (!isTimeMenuOpen) setTimeSearch('');
                            }}
                            className={clsx(
                              "w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-surface-container border transition-all group text-[10px] font-bold h-[34px]",
                              isTimeMenuOpen ? "border-primary text-primary" : "border-surface-variant/30 text-white hover:bg-surface-variant hover:border-primary/50"
                            )}
                          >
                            {selectedTime ? (
                              <div className="flex items-center gap-1.5 text-primary">
                                <Clock size={12} className="animate-pulse" />
                                <span>{format(new Date(`2000-01-01T${selectedTime}`), 'h:mm a')}</span>
                              </div>
                            ) : 'Hora'}
                          </button>

                          {isTimeMenuOpen && (
                            <div className="absolute bottom-full left-0 mb-2 w-52 bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.4)] overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200 z-[70]">
                              <div className="p-2 border-b border-gray-50 bg-gray-50/10 text-center">
                                <input 
                                  autoFocus
                                  type="text"
                                  value={timeSearch}
                                  onChange={(e) => setTimeSearch(e.target.value)}
                                  placeholder="00:00"
                                  className="w-32 mx-auto block px-2 py-0.5 text-2xl font-black text-gray-900 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-200 text-center tracking-tight"
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
                                        <div className="flex px-3 py-2 gap-2 border-b border-gray-50 bg-primary/[0.03] sticky top-0 z-10 backdrop-blur-sm">
                                          {custom.map((s) => (
                                            <button 
                                              key={s.value}
                                              type="button"
                                              onClick={() => {
                                                setSelectedTime(s.value);
                                                setIsTimeMenuOpen(false);
                                              }}
                                              className="flex-1 py-2 px-1 bg-white border border-primary/20 rounded-xl text-[10px] font-black text-primary hover:bg-primary hover:text-white transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
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
                                            "w-full text-left px-4 py-3 text-[11px] font-bold transition-colors border-b border-gray-50/50 last:border-none",
                                            selectedTime === slot.value 
                                              ? "bg-primary/10 text-primary" 
                                              : "text-gray-700 hover:bg-gray-50 hover:text-primary"
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
                                "w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-surface-container border transition-all group text-[10px] font-bold h-[34px]",
                                isRepeatMenuOpen || selectedRepeat ? "border-secondary text-secondary" : "border-surface-variant/30 text-white hover:bg-surface-variant hover:border-secondary/50"
                              )}
                            >
                              <Repeat size={12} className={clsx("transition-transform", (isRepeatMenuOpen || selectedRepeat) ? "text-secondary" : "text-on-surface-variant group-hover:rotate-180 duration-500")} />
                              <span className="truncate">
                                {selectedRepeat ? (() => {
                                  const d = selectedDate || new Date();
                                  if (selectedRepeat === 'daily') return 'Día';
                                  if (selectedRepeat === 'weekly') return `Sem. (${format(d, 'eee', { locale: es })})`;
                                  if (selectedRepeat === 'weekday') return 'L-V';
                                  if (selectedRepeat === 'monthly') return `Mes (${format(d, 'd')})`;
                                  return 'Repetir';
                                })() : 'Repetir'}
                              </span>
                            </button>

                            {isRepeatMenuOpen && (
                              <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.4)] overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200 z-[70]">
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
                                          "w-full text-left px-4 py-3 text-[11px] font-bold transition-colors border-b border-gray-50 last:border-none uppercase tracking-tighter",
                                          selectedRepeat === opt.id ? "bg-secondary/10 text-secondary" : "text-gray-700 hover:bg-gray-50 hover:text-secondary"
                                        )}
                                      >
                                        {opt.label}
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
                                      className="w-full text-left px-4 py-2 text-[9px] font-black text-red-500 hover:bg-red-50 transition-colors uppercase tracking-widest"
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
                <button type="button" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high border border-surface-variant/40 text-on-surface-variant hover:text-secondary transition-colors">
                  <Calendar size={14} />
                  Fecha
                </button>
                <button type="button" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high border border-surface-variant/40 text-on-surface-variant hover:text-orange-400 transition-colors">
                  <Flag size={14} />
                  Prioridad
                </button>
                <button type="button" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high border border-surface-variant/40 text-on-surface-variant hover:text-primary transition-colors">
                  <Clock size={14} />
                  Recordatorio
                </button>
              </div>

              <div className="flex justify-end pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-10 py-5 bg-gradient-to-r from-primary to-primary-dim text-white font-black text-base rounded-2xl hover:scale-105 active:scale-95 transition-all glow-primary disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
