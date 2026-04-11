import { supabase } from './supabase';
import { format, parseISO } from 'date-fns';
import { calculateNextDueDate, RepeatType } from './recurrence';
import { manageReminderTask } from './reminder';

interface RecurrencePayload {
  task: any;
  nextDueDate: Date;
}

/**
 * Handles the creation of the next occurrence of a recurring task,
 * including its corresponding reminder if applicable.
 */
export async function handleTaskRecurrence(task: any) {
  if (!task.repeat_type) return null;

  const nextDueDate = calculateNextDueDate(
    task.due_date ? parseISO(task.due_date) : new Date(), 
    task.repeat_type as RepeatType
  );

  let nextReminderAt: string | null = null;
  
  if (task.reminder_at && task.due_date) {
    try {
      // Calculate the offset between due_date and reminder_at
      const originalDueDate = parseISO(`${task.due_date}T${task.due_time || '09:00:00'}`);
      const reminderAtDate = parseISO(task.reminder_at);
      const diffMs = originalDueDate.getTime() - reminderAtDate.getTime();
      
      // Apply the same offset to the new due_date
      const newFullDueDate = new Date(nextDueDate);
      if (task.due_time) {
        const [h, m, s] = task.due_time.split(':').map(Number);
        newFullDueDate.setHours(h, m, s);
      } else {
        newFullDueDate.setHours(9, 0, 0);
      }
      
      nextReminderAt = new Date(newFullDueDate.getTime() - diffMs).toISOString();
    } catch (e) {
      console.error("Error calculating next reminder:", e);
    }
  }

  const payload = {
    title: task.title,
    user_id: task.user_id,
    assigned_by: task.assigned_by,
    status: 'pending',
    due_date: format(nextDueDate, 'yyyy-MM-dd'),
    due_time: task.due_time || null,
    repeat_type: task.repeat_type,
    priority: task.priority || 0,
    project_id: task.project_id || null,
    reminder_at: nextReminderAt
  };

  const { data: insertedTask, error } = await supabase
    .from('tasks')
    .insert(payload)
    .select('id')
    .single();

  if (!error && insertedTask && nextReminderAt) {
    await manageReminderTask(
      insertedTask.id,
      task.title,
      null,
      nextReminderAt,
      payload.due_date,
      payload.due_time,
      task.user_id,
      task.priority || 0,
      task.repeat_type
    );
  }

  return { insertedTask, error };
}
