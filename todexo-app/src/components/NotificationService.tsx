'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function NotificationService() {
  const notifiedTasks = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Solicitar permiso al montar
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkReminders = async () => {
      if (typeof window === 'undefined') return;
      
      const now = new Date();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar tareas con recordatorios que ya deberían haber sonado y no han sido notificadas
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .not('reminder_at', 'is', null)
        .lte('reminder_at', now.toISOString());

      if (error) {
        console.error('Error al buscar recordatorios:', error);
        return;
      }

      tasks?.forEach(task => {
        if (!notifiedTasks.current.has(task.id)) {
          // Mostrar notificación nativa
          if ('Notification' in window && Notification.permission === 'granted') {
             const notification = new Notification('⏰ Recordatorio de Todexo', {
               body: task.title,
               tag: task.id, // Evita duplicados si se refresca la página
               silent: false,
             });

             notification.onclick = () => {
               window.focus();
               notification.close();
             };
          }
          notifiedTasks.current.add(task.id);
        }
      });
    };

    // Verificar cada minuto
    const interval = setInterval(checkReminders, 60000);
    checkReminders(); // Verificación inicial

    return () => clearInterval(interval);
  }, []);

  return null;
}
