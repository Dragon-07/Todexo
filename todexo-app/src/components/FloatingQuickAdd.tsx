'use client';

import { useState } from 'react';
import { Sparkles, X, Plus, Clock, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import clsx from 'clsx';

export default function FloatingQuickAdd({ onTaskAdded }: { onTaskAdded?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from('tasks').insert({
        title,
        user_id: user.id,
        status: 'pending'
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
          <div className="w-full max-w-xl bg-surface-container rounded-[2.5rem] border border-surface-variant p-8 ambient-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
            
            <header className="flex items-center justify-between mb-8 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <Plus size={24} />
                </div>
                <div>
                   <h2 className="text-xl font-black text-white px-1">Nueva Meta</h2>
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
                <button type="button" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high border border-surface-variant/40 text-on-surface-variant hover:text-primary transition-colors">
                  <Clock size={14} />
                  Recordatorio
                </button>
                <button type="button" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high border border-surface-variant/40 text-on-surface-variant hover:text-secondary transition-colors">
                  <Tag size={14} />
                  Etiqueta
                </button>
              </div>

              <div className="flex justify-end pt-6">
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-10 py-5 bg-gradient-to-r from-primary to-primary-dim text-white font-black text-base rounded-2xl hover:scale-105 active:scale-95 transition-all glow-primary disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Guardar en Todexo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
