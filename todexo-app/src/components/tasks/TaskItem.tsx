import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Circle, CheckCircle2, MoreVertical, Tag, Clock, Calendar, Flame, MinusCircle, ChevronsDown, Repeat, Trash2, Bell } from 'lucide-react';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useUserRole } from '@/hooks/useUserRole';
import { Lock } from 'lucide-react';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  status: 'pending' | 'completed';
  time?: string;
  tags?: string[];
  due_date?: string | null;
  due_time?: string | null;
  repeat_type?: string | null;
  priority?: string | number | null;
  project_id?: string | null;
  reminder_at?: string | null;
  is_reminder?: boolean;
  reminder_for_task_id?: string | null;
  assigned_by?: string | null;
}

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (task: Task) => void;
  compact?: boolean;
}

export default function TaskItem({ task, onToggle, onDelete, onEdit, compact = false }: TaskItemProps) {
  const { role } = useUserRole();
  const isCompleted = task.status === 'completed';

  // Bloqueo: si es estándar y la tarea fue asignada por alguien más (un admin)
  const isReadonly = role === 'standard' && task.assigned_by && task.assigned_by !== task.user_id;

  const getLabelForDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      const date = parseISO(dateStr);
      const now = new Date();
      if (isSameDay(date, now)) return 'Hoy';
      if (isSameDay(date, addDays(now, 1))) return 'Mañana';
      return format(date, "d MMM", { locale: es });
    } catch (e) {
      return null;
    }
  };

  const dateLabel = getLabelForDate(task.due_date);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCompleteMenuOpen, setIsCompleteMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const completeMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (completeMenuRef.current && !completeMenuRef.current.contains(event.target as Node)) {
        setIsCompleteMenuOpen(false);
      }
    }
    if (isMenuOpen || isCompleteMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, isCompleteMenuOpen]);

  // Normalizar la prioridad para el renderizado (soporta "1", "2", "3", 1, 2, 3, "high", etc.)
  const isHigh = task.priority == 3 || task.priority === 'high' || task.priority === '3';
  const isMedium = task.priority == 2 || task.priority === 'medium' || task.priority === '2';
  const isLow = task.priority == 1 || task.priority === 'low' || task.priority === '1';

  const handleCardClick = () => {
    if (isReadonly) return; // No permitir abrir el editor si es solo lectura
    if (onEdit) onEdit(task);
  };

  // Funión especial para eliminar el recordatorio y limpiar la tarea original
  const handleDeleteReminder = async () => {
    try {
      // 1. Si tiene una tarea asociada, limpiamos su campo reminder_at
      if (task.reminder_for_task_id) {
        await supabase
          .from('tasks')
          .update({ reminder_at: null })
          .eq('id', task.reminder_for_task_id);
      }
      
      // 2. Ejecutamos la eliminación de la tarea-recordatorio (la fila actual)
      if (onDelete) {
        onDelete(task.id);
      }
    } catch (error) {
      console.error('Error al eliminar recordatorio:', error);
    } finally {
      setIsMenuOpen(false);
    }
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const [mainTaskData, setMainTaskData] = useState<{
    title: string;
    due_date?: string | null;
    due_time?: string | null;
  } | null>(null);

  // Cargar datos de la tarea original al expandir
  useEffect(() => {
    if (task.is_reminder && isExpanded && task.reminder_for_task_id && !mainTaskData) {
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
  }, [isExpanded, task.is_reminder, task.reminder_for_task_id]);

  // === RENDERIZADO PREMIUM PARA TAREAS-RECORDATORIO ===
  if (task.is_reminder) {
    return (
      <div
        onClick={() => !isCompleted && onEdit && onEdit(task)}
        className={clsx(
          "group flex items-center justify-between rounded-3xl border transition-all cursor-pointer select-none relative overflow-visible",
          compact ? "p-1.5 rounded-2xl gap-2" : "py-1 px-5 rounded-[2rem] gap-4",
          isMenuOpen ? "z-[200] brightness-110" : "z-0",
          isCompleted
            ? "glass-panel opacity-85 border-white/20 dark:border-white/10 grayscale"
            : "glass-panel border-white/30 dark:border-white/10 hover:brightness-105 hover:scale-[1.01] ambient-shadow"
        )}
      >
        {/* Capa de efectos de fondo (Glow y LED) con overflow-hidden para no salirse de los bordes redondeados */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          {/* Indicador lateral eliminado a petición del usuario */}
        </div>

        <div className="flex items-center gap-4 flex-1 min-w-0 pl-4">
          {/* Campana de recordatorio Premium */}
          <div className={clsx(
            "flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-500",
            isCompleted
              ? "bg-surface-variant/20 border-white/5 text-on-surface-variant/40"
              : "bg-amber-500/15 border-amber-500/30 text-amber-500 group-hover:scale-110 group-hover:rotate-12"
          )}>
            <Bell size={18} className={isCompleted ? "" : "fill-amber-500/20 glow-amber"} />
          </div>

          <div className="flex-1 min-w-0 py-1">
            {/* Header del Recordatorio */}
            <div className="flex items-center gap-3 mb-0.5 flex-wrap">
              <span className={clsx(
                "text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-full border transition-colors",
                isCompleted 
                  ? "bg-white/5 border-white/10 text-on-surface-variant/40" 
                  : "bg-amber-500/20 border-amber-500/40 text-amber-400"
              )}>
                Recordatorio
              </span>
              
              {task.due_date && (
                <div className={clsx(
                  "flex items-center gap-1.5 text-[11px] font-bold transition-opacity uppercase",
                  isCompleted ? "text-on-surface-variant/30" : "text-amber-500/80"
                )}>
                  <Calendar size={12} strokeWidth={2.5} />
                  <span>{format(parseISO(task.due_date), 'd MMM', { locale: es })}</span>
                </div>
              )}

              {task.due_time && (
                <div className={clsx(
                  "flex items-center gap-1.5 text-[11px] font-bold transition-opacity",
                  isCompleted ? "text-on-surface-variant/30" : "text-amber-500/80"
                )}>
                  <Clock size={12} strokeWidth={2.5} />
                  <span>{format(new Date(`2000-01-01T${task.due_time}`), 'h:mm a')}</span>
                </div>
              )}

              {/* Prioridad en el Recordatorio */}
              {!isCompleted && (isHigh || isMedium || isLow) && (
                <div className={clsx(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight border shadow-sm",
                  isHigh ? "bg-red-500/20 text-red-400 border-red-400/30" : 
                  isMedium ? "bg-orange-500/20 text-orange-400 border-orange-400/30" : 
                  isLow ? "bg-blue-500/20 text-blue-400 border-blue-400/30" : ""
                )}>
                  {isHigh ? <Flame size={10} className="fill-red-400/20" /> :
                   isMedium ? <MinusCircle size={10} className="fill-orange-400/20" /> :
                   isLow ? <ChevronsDown size={10} className="fill-blue-400/20" /> : null}
                  <span>
                      {isHigh ? 'Alta' :
                       isMedium ? 'Media' :
                       isLow ? 'Baja' : ''}
                  </span>
                </div>
              )}

              {/* Repetición en el Recordatorio */}
              {task.repeat_type && (
                <div className={clsx(
                   "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                   isCompleted ? "bg-white/5 border-white/10 text-on-surface-variant/30" : "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                )}>
                  <Repeat size={10} strokeWidth={3} />
                  <span>
                    {task.repeat_type === 'daily' && 'Cada día'}
                    {task.repeat_type === 'weekly' && 'Semanal'}
                    {task.repeat_type === 'weekday' && 'Lun-Vie'}
                    {task.repeat_type === 'monthly' && 'Mensual'}
                  </span>
                </div>
              )}
            </div>

            {/* Título refinado con truncado */}
            <p className={clsx(
              "text-base md:text-lg font-black transition-all truncate",
              isCompleted 
                ? "text-on-surface/30 line-through tracking-wider" 
                : "text-on-surface/90 tracking-tight group-hover:text-on-surface"
            )}>
              {task.title.replace(/^🔔\s*/, '')}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 relative z-50" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className={clsx(
              "transition-all p-2 rounded-xl border border-transparent",
              isMenuOpen 
                ? "bg-amber-500/20 text-amber-500 border-amber-500/30" 
                : "text-on-surface-variant/40 hover:bg-amber-500/10 hover:text-amber-400 opacity-0 group-hover:opacity-100"
            )}
          >
            <MoreVertical size={20} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-12 w-52 bg-[#1c1d21] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[300] overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-md">
              <div className="p-2 flex flex-col gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteReminder();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 text-sm font-black text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-[0.98] group/btn"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover/btn:bg-red-500/20 transition-colors">
                    <Trash2 size={16} />
                  </div>
                  Terminar Recordatorio
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  // =====================================================
  // =====================================================

  return (
    <div 
      onClick={handleCardClick}
      className={clsx(
        "group flex items-center justify-between rounded-3xl border transition-all cursor-pointer select-none relative overflow-visible",
        compact ? "p-1 rounded-2xl gap-1" : "py-0.5 px-5 rounded-[2rem] gap-4",
        (isMenuOpen || isCompleteMenuOpen) ? "z-[100]" : "z-0",
        isCompleted 
          ? "glass-panel opacity-85 border-white/20 dark:border-white/10" 
          : "glass-panel border-white/30 dark:border-white/10 hover:brightness-105 hover:scale-[1.01] ambient-shadow"
      )}
    >
      <div className={clsx(
        "flex-1 min-w-0 transition-all",
        compact ? "flex flex-col gap-1.5" : "flex items-center gap-4",
        isCompleted && "opacity-80 grayscale-[0.3]"
      )}>
        {/* Checkbox Icon - Hidden in compact mode */}
        {!compact && (
          <div className="relative flex items-center justify-center flex-shrink-0" ref={completeMenuRef}>
            <button 
              disabled={isReadonly}
              onClick={(e) => {
                e.stopPropagation();
                if (isReadonly) return;
                
                if (isCompleted) {
                  onToggle(task.id);
                } else {
                  setIsCompleteMenuOpen(!isCompleteMenuOpen);
                }
              }}
              className={clsx(
                "focus:outline-none",
                isReadonly && "cursor-not-allowed opacity-50"
              )}
            >
              {isCompleted ? (
                <div className="text-secondary glow-secondary transition-all transform scale-100">
                  <CheckCircle2 size={32} strokeWidth={2.5} />
                </div>
              ) : (
                <div className={clsx(
                  "relative flex items-center justify-center text-on-surface-variant/40 group-hover:text-primary transition-all group-hover:scale-110",
                  isCompleteMenuOpen && "text-primary scale-110 transitions-all duration-300"
                )}>
                  <Circle size={36} strokeWidth={2} />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-50 group-hover:scale-100">
                    <CheckCircle2 size={24} className="text-primary fill-primary/10" strokeWidth={2.5} />
                  </div>
                </div>
              )}
            </button>

            {isCompleteMenuOpen && !isCompleted && (
              <div className="absolute left-0 top-10 w-40 glass-modal rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in zoom-in duration-200">
                 <div className="p-1.5 flex flex-col gap-1">
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       onToggle(task.id);
                       setIsCompleteMenuOpen(false);
                     }}
                     className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-on-surface hover:bg-primary/20 rounded-xl transition-colors"
                   >
                     <CheckCircle2 size={16} className="text-primary" />
                     Completar
                   </button>
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       setIsCompleteMenuOpen(false);
                     }}
                     className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-variant rounded-xl transition-colors"
                   >
                     <Circle size={16} />
                     Continuar
                   </button>
                 </div>
              </div>
            )}
          </div>
        )}

        <div className={clsx(
          "flex-1 min-w-0 transition-all",
          compact ? "space-y-0.5" : "space-y-1"
        )}>
          <span className={clsx(
            "transition-all truncate block",
             compact ? "text-sm font-bold" : "text-base md:text-lg font-black",
            isCompleted ? "text-on-surface/60 line-through tracking-wide" : "text-on-surface tracking-tight"
          )}>
            {task.title}
          </span>

          {isReadonly && (
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-amber-500/60 tracking-[0.1em]">
              <Lock size={10} />
              Asignada por Admin
            </div>
          )}
          
          <div className={clsx(
            "flex items-center transition-opacity flex-shrink-0 flex-wrap",
            compact ? "gap-1.5" : "gap-2"
          )}>
            {dateLabel && !compact && (
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-black text-on-surface-variant bg-surface-variant/20 px-2 py-1 rounded-lg border border-surface-variant/10">
                <Calendar size={12} />
                <span>{dateLabel}</span>
              </div>
            )}
            {(task.time || task.due_time) && (
              <div className="flex items-center gap-1 text-[10px] lowercase font-black text-teal-400 bg-teal-400/5 px-1.5 py-0.5 rounded-md border border-teal-400/10 whitespace-nowrap">
                <Clock size={10} />
                <span>{task.due_time ? format(new Date(`2000-01-01T${task.due_time}`), 'h:mm a') : task.time}</span>
              </div>
            )}

            {task.reminder_at && (
              <div className="flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-400/5 px-1.5 py-0.5 rounded-md border border-amber-400/10 whitespace-nowrap">
                <Bell size={10} className="fill-amber-400/20" />
                {!compact && <span>Recordatorio</span>}
              </div>
            )}
            
            {/* Priority Badge */}
            {!isCompleted && (isHigh || isMedium || isLow) ? (
              <div className={clsx(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight border shadow-sm",
                isHigh ? "bg-red-500/15 text-red-400 border-red-500/30" : 
                isMedium ? "bg-orange-500/15 text-orange-400 border-orange-500/30" : 
                isLow ? "bg-blue-500/15 text-blue-400 border-blue-500/30" : ""
              )}>
                {isHigh ? <Flame size={10} className="fill-red-400/20" /> :
                 isMedium ? <MinusCircle size={10} className="fill-orange-400/20" /> :
                 isLow ? <ChevronsDown size={10} className="fill-blue-400/20" /> : null}
                {!compact && (
                  <span>
                      {isHigh ? 'Alta' :
                       isMedium ? 'Media' :
                       isLow ? 'Baja' : ''}
                  </span>
                )}
              </div>
            ) : null}

            {task.repeat_type && (
              <div className="flex items-center gap-1 text-[9px] uppercase font-black text-secondary bg-secondary/15 px-1.5 py-0.5 rounded-md border border-secondary/30 whitespace-nowrap">
                <Repeat size={10} className="flex-shrink-0" />
                <span>
                  {task.repeat_type === 'daily' && 'Cada día'}
                  {task.repeat_type === 'weekly' && 'Semanal'}
                  {task.repeat_type === 'weekday' && 'Lun-Vie'}
                  {task.repeat_type === 'monthly' && 'Mensual'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 relative z-10" ref={menuRef}>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          className={clsx(
            "text-on-surface-variant transition-all p-2 rounded-xl hover:bg-surface-variant border border-transparent hover:border-surface-variant/50",
            isMenuOpen ? "bg-surface-variant opacity-100" : isCompleted ? "opacity-40 hover:opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <MoreVertical size={18} />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-12 w-48 glass-modal rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-1.5 flex flex-col gap-1">
              {isCompleted && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(task.id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors"
                >
                  <Repeat size={16} />
                  Reanudar Tarea
                </button>
              )}
              
              {!isReadonly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDelete) onDelete(task.id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  <Trash2 size={16} />
                  Eliminar Tarea
                </button>
              )}

              {isReadonly && (
                <div className="px-3 py-2 text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest text-center">
                  Solo lectura
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
