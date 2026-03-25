import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Circle, CheckCircle2, MoreVertical, Tag, Clock, Calendar, Flame, MinusCircle, ChevronsDown, Repeat, Trash2 } from 'lucide-react';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

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
}

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (task: Task) => void;
}

export default function TaskItem({ task, onToggle, onDelete, onEdit }: TaskItemProps) {
  const isCompleted = task.status === 'completed';

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
    if (onEdit) onEdit(task);
  };

  return (
    <div 
      onClick={handleCardClick}
      className={clsx(
        "group flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer select-none relative overflow-visible",
        (isMenuOpen || isCompleteMenuOpen) ? "z-[100]" : "z-0",
        isCompleted 
          ? "bg-surface-container-low/50 border-surface-variant/20" 
          : "bg-surface-container border-surface-variant/50 hover:bg-surface-container-high hover:border-primary/40 hover:scale-[1.01] ambient-shadow"
      )}
    >
      <div className={clsx(
        "flex items-center gap-4 flex-1 min-w-0 transition-all",
        isCompleted && "opacity-50 grayscale"
      )}>
        {/* Checkbox Icon with Confirmation Menu */}
        <div className="relative flex items-center justify-center flex-shrink-0" ref={completeMenuRef}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (isCompleted) {
                onToggle(task.id);
              } else {
                setIsCompleteMenuOpen(!isCompleteMenuOpen);
              }
            }}
            className="focus:outline-none"
          >
            {isCompleted ? (
              <div className="text-secondary glow-secondary transition-all transform scale-100">
                <CheckCircle2 size={24} strokeWidth={2.5} />
              </div>
            ) : (
              <div className={clsx(
                "relative flex items-center justify-center text-on-surface-variant/40 group-hover:text-primary transition-all group-hover:scale-110",
                isCompleteMenuOpen && "text-primary scale-110"
              )}>
                <Circle size={28} strokeWidth={2.5} />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-50 group-hover:scale-100">
                  <CheckCircle2 size={18} className="text-primary fill-primary/10" strokeWidth={3} />
                </div>
              </div>
            )}
          </button>

          {isCompleteMenuOpen && !isCompleted && (
            <div className="absolute left-0 top-10 w-40 bg-surface-container-high border border-surface-variant/50 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in zoom-in duration-200">
               <div className="p-1.5 flex flex-col gap-1">
                 <button
                   onClick={(e) => {
                     e.stopPropagation();
                     onToggle(task.id);
                     setIsCompleteMenuOpen(false);
                   }}
                   className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-white hover:bg-primary/20 rounded-xl transition-colors"
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

        <div className="flex items-center gap-4 flex-1 min-w-0 overflow-hidden">
          <span className={clsx(
            "text-base font-bold transition-all truncate flex-1 min-w-0",
            isCompleted ? "text-on-surface/40 line-through tracking-wide" : "text-on-surface tracking-tight"
          )}>
            {task.title}
          </span>
          
          <div className="flex items-center gap-2 transition-opacity flex-shrink-0">
            {dateLabel && (
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-black text-on-surface-variant bg-surface-variant/20 px-2 py-1 rounded-lg border border-surface-variant/10">
                <Calendar size={12} />
                <span>{dateLabel}</span>
              </div>
            )}
            {(task.time || task.due_time) && (
              <div className="flex items-center gap-1.5 text-[10px] lowercase font-black text-teal-400 bg-teal-400/5 px-2 py-1 rounded-lg border border-teal-400/10">
                <Clock size={12} />
                <span>{task.due_time ? format(new Date(`2000-01-01T${task.due_time}`), 'h:mm a') : task.time}</span>
              </div>
            )}
            
            {/* Priority Badge - Corregido para tipos string y number */}
            {!isCompleted && (isHigh || isMedium || isLow) ? (
              <div className={clsx(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm",
                isHigh ? "bg-red-500/15 text-red-400 border-red-500/30" : 
                isMedium ? "bg-orange-500/15 text-orange-400 border-orange-500/30" : 
                isLow ? "bg-blue-500/15 text-blue-400 border-blue-500/30" : ""
              )}>
                {isHigh ? <Flame size={12} className="fill-red-400/20" /> :
                 isMedium ? <MinusCircle size={12} className="fill-orange-400/20" /> :
                 isLow ? <ChevronsDown size={12} className="fill-blue-400/20" /> : null}
                <span>
                    {isHigh ? 'Alta' :
                     isMedium ? 'Media' :
                     isLow ? 'Baja' : ''}
                </span>
              </div>
            ) : null}

            {task.repeat_type && (
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-black text-secondary bg-secondary/15 px-2 py-1 rounded-md border border-secondary/30">
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
          <div className="absolute right-0 top-12 w-48 bg-surface-container-high border border-surface-variant/50 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in zoom-in duration-200">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
