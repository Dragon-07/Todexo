'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
           email, 
           password,
           options: {
              data: {
                 first_name: email.split('@')[0], // Placeholder
              }
           }
        });
        if (error) throw error;
      }
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-surface-container p-8 rounded-3xl border border-surface-variant ambient-shadow relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
      
      <div className="text-center mb-8 relative">
        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 shadow-lg glow-primary">
          <span className="text-white font-bold text-xl">TX</span>
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2">{isLogin ? 'Bienvenido a Todexo' : 'Únete a Todexo'}</h2>
        <p className="text-sm text-on-surface-variant">Organiza tu vida con elegancia.</p>
      </div>

      <form onSubmit={handleAuth} className="space-y-4 relative">
        {error && <div className="p-3 bg-error/20 border border-error/50 rounded-xl text-error text-sm text-center">{error}</div>}
        
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all [&:-webkit-autofill]:bg-surface-container-low [&:-webkit-autofill]:text-on-surface [&:-webkit-autofill]:shadow-[0_0_0_1000px_#11131a_inset] autofill:bg-transparent"
            placeholder="tu@email.com"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Contraseña</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all [&:-webkit-autofill]:bg-surface-container-low [&:-webkit-autofill]:text-on-surface [&:-webkit-autofill]:shadow-[0_0_0_1000px_#11131a_inset] autofill:bg-transparent"
            placeholder="••••••••"
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dim text-white font-bold py-3 rounded-xl transition-all glow-primary mt-6 disabled:opacity-50"
        >
          {loading ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </button>
      </form>

      <div className="mt-6 text-center relative">
        <button 
          onClick={() => setIsLogin(!isLogin)} 
          className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  );
}
