'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type UserRole = 'owner' | 'admin' | 'standard';

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRole(null);
          setFullName(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error obteniendo rol:', error);
          setRole('standard');
          setFullName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario');
        } else {
          setRole(data?.role as UserRole);
          setFullName(data?.full_name);
        }
      } catch (err) {
        console.error('Error inesperado:', err);
        setRole('standard');
      } finally {
        setLoading(false);
      }
    }

    getRole();
  }, []);

  return { role, fullName, loading };
}
