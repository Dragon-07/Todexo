'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

export default function DigitalClock({ className }: { className?: string }) {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!time) return null;

  return (
    <div className={clsx(
      "flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-variant/40 shadow-xl ambient-shadow transition-all group hover:bg-surface-container-high/80",
      className
    )}>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-black text-on-surface tracking-tighter tabular-nums">
          {format(time, 'h:mm', { locale: es })}
        </span>
        <span className="text-[10px] font-black uppercase text-primary tracking-widest opacity-80">
          {format(time, 'a', { locale: es }).replace('.', '')}
        </span>
      </div>
    </div>
  );
}
