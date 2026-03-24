'use client';

import clsx from 'clsx';
import { Circle, CheckCircle2, MoreVertical, Tag, Clock } from 'lucide-react';

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  time?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
}

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
}

export default function TaskItem({ task, onToggle }: TaskItemProps) {
  const isCompleted = task.status === 'completed';

  return (
    <div 
      onClick={() => onToggle(task.id)}
      className={clsx(
        "group flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer select-none",
        isCompleted 
          ? "bg-surface-container-low/50 border-surface-variant/20 opacity-50 grayscale" 
          : "bg-surface-container border-surface-variant/50 hover:bg-surface-container-high hover:border-primary/40 hover:scale-[1.01] ambient-shadow"
      )}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Checkbox Icon */}
        <div className="relative flex items-center justify-center">
          {isCompleted ? (
            <div className="text-secondary glow-secondary transition-all transform scale-100">
              <CheckCircle2 size={24} strokeWidth={2.5} />
            </div>
          ) : (
            <div className="text-on-surface-variant/40 group-hover:text-primary transition-all group-hover:scale-110">
              <Circle size={24} strokeWidth={2} />
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <span className={clsx(
            "text-base font-bold transition-all",
            isCompleted ? "text-on-surface/40 line-through tracking-wide" : "text-on-surface tracking-tight"
          )}>
            {task.title}
          </span>
          
          <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {task.time && (
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-on-surface-variant">
                <Clock size={12} />
                <span>{task.time}</span>
              </div>
            )}
            {task.tags && task.tags.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-primary">
                <Tag size={12} />
                <span>{task.tags[0]}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Priority Badge (only if not completed) */}
        {!isCompleted && task.priority && (
          <div className={clsx(
            "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest",
            task.priority === 'high' ? "bg-error/10 text-error" : 
            task.priority === 'medium' ? "bg-primary/10 text-primary" : 
            "bg-on-surface-variant/10 text-on-surface-variant"
          )}>
            {task.priority}
          </div>
        )}
        
        <button className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-xl hover:bg-surface-variant">
          <MoreVertical size={18} />
        </button>
      </div>
    </div>
  );
}
