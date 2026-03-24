'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Flame, Target, Trophy, Zap, Crown, Award } from 'lucide-react';
import clsx from 'clsx';
import FloatingQuickAdd from '@/components/FloatingQuickAdd';

const productivityData = [
  { name: 'Lun', tasks: 3 },
  { name: 'Mar', tasks: 5 },
  { name: 'Mié', tasks: 4 },
  { name: 'Jue', tasks: 7 },
  { name: 'Vie', tasks: 6 },
  { name: 'Sáb', tasks: 9 },
  { name: 'Dom', tasks: 8 },
];

export default function StatsPage() {
  return (
    <div className="flex w-full h-full bg-background overflow-y-auto px-6 py-8 md:p-12 pb-32 lg:pb-12 custom-scrollbar relative">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
        
        <header>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">Estadísticas y Progreso</h1>
        </header>

        {/* Top Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="bg-surfaceContainer p-5 rounded-2xl border border-surfaceVariant hover:-translate-y-1 transition-transform">
            <h3 className="text-[10px] uppercase font-bold tracking-widest text-onSurfaceVariant mb-2 flex items-center gap-2">
               <Flame size={14} className="text-[#FF6E84]" /> Racha Actual
            </h3>
            <p className="text-3xl font-bold text-white mb-2">14 <span className="text-sm font-medium text-onSurfaceVariant">días</span></p>
            {/* Minimal SVG sparkline */}
            <svg width="100%" height="24" viewBox="0 0 100 24" className="overflow-visible">
               <polyline points="0,20 20,24 40,15 60,10 80,18 100,2" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="bg-surfaceContainer p-5 rounded-2xl border border-surfaceVariant flex items-center justify-between hover:-translate-y-1 transition-transform">
             <div>
                <h3 className="text-[10px] uppercase font-bold tracking-widest text-onSurfaceVariant mb-2">Tareas Hoy</h3>
                <p className="text-3xl font-bold text-white">7<span className="text-xl text-onSurfaceVariant">/12</span></p>
             </div>
             <div className="relative w-12 h-12 flex items-center justify-center glow-tertiary rounded-full bg-surfaceContainerLow">
                 <svg className="w-full h-full transform -rotate-90 absolute inset-0" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" className="stroke-surfaceVariant" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" className="stroke-tertiary" strokeWidth="3" strokeDasharray="94.248" strokeDashoffset={94.248 - (7/12) * 94.248} />
                 </svg>
                 <span className="relative font-bold text-xs text-white z-10">58%</span>
              </div>
          </div>

          <div className="bg-surfaceContainer p-5 rounded-2xl border border-surfaceVariant hover:-translate-y-1 transition-transform">
             <h3 className="text-[10px] uppercase font-bold tracking-widest text-onSurfaceVariant mb-2">Esta Semana</h3>
             <div className="flex items-end justify-between h-12 gap-1 mt-4">
                {[15, 30, 20, 45, 35, 60, 50].map((h, i) => (
                   <div key={i} className="w-full bg-[#6366F1] rounded-sm opacity-80 hover:opacity-100 hover:glow-primary transition-opacity" style={{ height: `${h}%` }}></div>
                ))}
             </div>
          </div>

          <div className="bg-surfaceContainer p-5 rounded-2xl border border-surfaceVariant hover:-translate-y-1 transition-transform flex flex-col justify-between">
             <h3 className="text-[10px] uppercase font-bold tracking-widest text-onSurfaceVariant mb-2 flex justify-between">
                Tasa de Éxito <span className="text-tertiary">↗</span>
             </h3>
             <div>
                <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">87%</p>
                <p className="text-[10px] text-tertiary mt-1">+4.2% desde la última semana</p>
             </div>
          </div>

        </div>

        {/* Middle Section - Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Productivity Area Chart */}
          <div className="bg-surfaceContainer p-6 rounded-2xl border border-surfaceVariant">
            <h3 className="text-xs font-bold tracking-widest text-onSurfaceVariant uppercase mb-6 flex justify-between">
               Productividad Semanal <span className="text-[10px] bg-surfaceVariant px-2 py-1 rounded-md">Últimos 7 días</span>
            </h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productivityData}>
                  <defs>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#aaaab3' }} dy={10} />
                  <Tooltip 
                     contentStyle={{ backgroundColor: '#1d1f27', border: '1px solid #46484f', borderRadius: '12px', fontSize: '12px' }}
                     itemStyle={{ color: '#F1F5F9' }}
                  />
                  <Area type="monotone" dataKey="tasks" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" style={{ filter: 'drop-shadow(0px 4px 12px rgba(99, 102, 241, 0.4))' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Area Distribution */}
          <div className="bg-surfaceContainer p-6 rounded-2xl border border-surfaceVariant flex flex-col">
            <h3 className="text-xs font-bold tracking-widest text-onSurfaceVariant uppercase mb-6">Distribución por Área</h3>
            
            <div className="space-y-5 flex-1">
               <ProgressBar label="Trabajo" percent={70} color="#6366F1" />
               <ProgressBar label="Personal" percent={55} color="#8B5CF6" />
               <ProgressBar label="Salud" percent={90} color="#14B8A6" glow />
               <ProgressBar label="Aprendizaje" percent={30} color="#F59E0B" />
               <ProgressBar label="Finanzas" percent={15} color="#EC4899" />
            </div>

            <div className="mt-6 bg-surfaceVariant/50 p-4 rounded-xl flex items-start gap-3">
               <div className="bg-tertiary/20 text-tertiary p-1.5 rounded-lg"><Target size={16} /></div>
               <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">Insight Semanal</h4>
                  <p className="text-[10px] text-onSurfaceVariant leading-relaxed">Tu enfoque en "Salud" ha mejorado un 15% respecto al mes pasado. ¡Sigue así!</p>
               </div>
            </div>
          </div>

        </div>

        {/* Achievements Section */}
        <div className="bg-surfaceContainer p-6 rounded-2xl border border-surfaceVariant">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold tracking-widest text-onSurfaceVariant uppercase">Historial de Logros</h3>
              <button className="text-[10px] font-bold text-primary hover:text-white transition-colors">Ver todos</button>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <AchievementCard title="Primera Semana" icon={<Trophy size={20} />} unlocked glowColor="glow-primary" />
              <AchievementCard title="Velocista" icon={<Zap size={20} />} unlocked glowColor="glow-tertiary" />
              <AchievementCard title="Tirador de élite" icon={<Target size={20} />} />
              <AchievementCard title="Imparable" icon={<Flame size={20} />} />
              <AchievementCard title="Maestro" icon={<Crown size={20} />} />
           </div>
        </div>

      </div>
      <FloatingQuickAdd />
    </div>
  );
}

function ProgressBar({ label, percent, color, glow = false }: { label: string, percent: number, color: string, glow?: boolean }) {
   return (
      <div>
         <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-onSurface">{label}</span>
            <span className="text-xs font-bold" style={{ color }}>{percent}%</span>
         </div>
         <div className="h-1.5 w-full bg-surfaceContainerHighest rounded-full overflow-hidden">
            <div 
               className={clsx("h-full rounded-full transition-all duration-1000", glow ? "shadow-[0_0_8px_currentColor]" : "")} 
               style={{ width: `${percent}%`, backgroundColor: color, color }}
            ></div>
         </div>
      </div>
   )
}

function AchievementCard({ title, icon, unlocked = false, glowColor = "" }: { title: string, icon: React.ReactNode, unlocked?: boolean, glowColor?: string }) {
   return (
      <div className={clsx(
         "p-4 rounded-2xl flex flex-col items-center text-center gap-3 transition-all duration-300",
         unlocked 
            ? `bg-surfaceContainerHigh ghost-border-primary hover:-translate-y-1 ${glowColor}` 
            : "bg-surfaceContainerLow border border-surfaceVariant/50 opacity-60"
      )}>
         <div className={clsx(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            unlocked ? "bg-background text-white ambient-shadow" : "bg-surfaceContainer text-onSurfaceVariant"
         )}>
            {icon}
         </div>
         <div>
            <h4 className="text-xs font-bold text-white mb-0.5">{title}</h4>
            <span className={clsx("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase", unlocked ? "bg-tertiary/20 text-tertiary" : "text-onSurfaceVariant")}>
               {unlocked ? "Completado" : "Bloqueado"}
            </span>
         </div>
      </div>
   )
}
