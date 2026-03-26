import { supabase } from './supabase';
import { format, parseISO } from 'date-fns';

export async function manageReminderTask(
  mainTaskId: string,
  mainTaskTitle: string,
  oldReminderAt: string | null,
  newReminderAt: string | null,
  mainTaskDueDate: string | null,
  mainTaskDueTime: string | null,
  userId: string,
  priority: number | string = 0,
  repeatType: string | null = null
) {
  // 1. Caso: Se ha ELIMINADO el recordatorio
  if (oldReminderAt && !newReminderAt) {
    await supabase
      .from('tasks')
      .delete()
      .eq('reminder_for_task_id', mainTaskId)
      .eq('is_reminder', true);
    return;
  }

  // 2. Caso: Se ha AÑADIDO o MODIFICADO el recordatorio
  if (newReminderAt) {
    // Título formateado con la hora original si existe
    let reminderTitle = `🔔 ${mainTaskTitle}`;
    if (mainTaskDueTime) {
      try {
        const timeStr = format(new Date(`2000-01-01T${mainTaskDueTime}`), 'h:mm a');
        reminderTitle = `🔔 ${mainTaskTitle} · a las ${timeStr}`;
      } catch (e) {}
    }

    // Buscamos si ya existe uno
    const { data: existingReminder } = await supabase
      .from('tasks')
      .select('id')
      .eq('reminder_for_task_id', mainTaskId)
      .eq('is_reminder', true)
      .single();

    const reminderDate = parseISO(newReminderAt);
    const dueDate = format(reminderDate, 'yyyy-MM-dd');
    const dueTime = format(reminderDate, 'HH:mm:ss');

    if (existingReminder) {
      // Actualizar el existente
      await supabase
        .from('tasks')
        .update({
          title: reminderTitle,
          due_date: dueDate,
          due_time: dueTime,
          status: 'pending', // Si se mueve la fecha, lo reactivamos
          priority: priority,
          repeat_type: repeatType
        })
        .eq('id', existingReminder.id);
    } else {
      // Crear uno nuevo
      await supabase.from('tasks').insert({
        title: reminderTitle,
        user_id: userId,
        status: 'pending',
        due_date: dueDate,
        due_time: dueTime,
        priority: priority,
        repeat_type: repeatType,
        is_reminder: true,
        reminder_for_task_id: mainTaskId
      });
    }
  }
}
