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
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const dateOptions = [
    { label: 'Hoy', date: new Date(), icon: Calendar, color: 'text-green-400' },
    { label: 'Mañana', date: addDays(new Date(), 1), icon: Sun, color: 'text-orange-400' },
    { label: 'Este fin de semana', date: nextSaturday(new Date()), icon: Sofa, color: 'text-blue-400' },
    { label: 'Próxima semana', date: nextMonday(new Date()), icon: FastForward, color: 'text-pink-400' },
    { label: 'Sin fecha', date: null, icon: Slash, color: 'text-on-surface-variant' },
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
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  setSelectedDate(day);
                  setIsDateMenuOpen(false);
                }}
                className={clsx(
                  "w-7 h-7 flex items-center justify-center text-[9px] font-bold rounded-full transition-all hover:bg-surface-variant/50",
                  isSel ? "bg-primary text-white shadow-sm" : isTod ? "text-primary border border-primary/20" : "text-on-surface-variant/80"
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
        due_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
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
                            <span className="text-secondary opacity-60 text-[8px]">Hoy: {format(new Date(), 'd MMM', { locale: es })}</span>
                          </div>
                          {dateOptions.map((opt, i) => {
                            const Icon = opt.icon;
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setSelectedDate(opt.date);
                                  setIsDateMenuOpen(false);
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

                      <div className="p-2 bg-surface-container-high/60 border-t border-surface-variant/20 grid grid-cols-2 gap-2">
                        <button type="button" className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-surface-container border border-surface-variant/30 text-white text-[10px] font-bold hover:bg-surface-variant transition-all hover:border-primary/50 group">
                          <Clock size={12} className="text-primary group-hover:scale-110 transition-transform" />
                          Hora
                        </button>
                        <button type="button" className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-surface-container border border-surface-variant/30 text-white text-[10px] font-bold hover:bg-surface-variant transition-all hover:border-secondary/50 group">
                          <Repeat size={12} className="text-secondary group-hover:scale-110 transition-transform" />
                          Repetir
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
