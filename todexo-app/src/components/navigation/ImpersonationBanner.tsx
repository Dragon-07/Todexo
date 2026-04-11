'use client';

import { useImpersonation } from '@/context/ImpersonationContext';
import { X, Eye, AlertTriangle } from 'lucide-react';

export default function ImpersonationBanner() {
  const { targetUser, isImpersonating, stopImpersonation } = useImpersonation();

  if (!isImpersonating) return null;

  return (
    <div className="sticky top-0 left-0 right-0 z-[60] bg-indigo-600 text-white px-6 py-3 shadow-2xl animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
             <Eye size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/80 leading-none mb-1">Modo Supervisión Activo</p>
            <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
              Inspeccionando a <span className="bg-white/20 px-2 py-0.5 rounded-md text-white">{targetUser?.full_name}</span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-indigo-100 text-[10px] font-bold uppercase tracking-wider bg-black/10 px-3 py-1.5 rounded-full border border-white/10">
            <AlertTriangle size={12} className="text-amber-400" />
            Solo lectura y gestión de tareas
          </div>
          
          <button 
            onClick={stopImpersonation}
            className="flex items-center gap-2 bg-white text-indigo-600 px-5 py-2 rounded-xl font-black text-sm hover:bg-indigo-50 transition-all hover:scale-105 shadow-lg active:scale-95"
          >
            Detener Supervisión
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
