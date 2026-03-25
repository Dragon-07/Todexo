import { addDays, addWeeks, addMonths, isFriday, isSaturday, isSunday, nextMonday, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

export type RepeatType = 'daily' | 'weekly' | 'weekday' | 'monthly';

export function calculateNextDueDate(currentDate: Date | string, repeatType: RepeatType): Date {
  const date = typeof currentDate === 'string' ? parseISO(currentDate) : currentDate;

  switch (repeatType) {
    case 'daily':
      return addDays(date, 1);
    
    case 'weekly':
      return addWeeks(date, 1);
    
    case 'weekday':
      // If Friday, next is Monday (+3)
      // If Saturday, next is Monday (+2)
      // Otherwise, next day (+1)
      if (isFriday(date)) {
        return addDays(date, 3);
      } else if (isSaturday(date)) {
        return addDays(date, 2);
      } else {
        return addDays(date, 1);
      }
    
    case 'monthly':
      return addMonths(date, 1);
    
    default:
      return date;
  }
}

export function getRepeatLabel(repeatType: RepeatType, date: Date): string {
  switch (repeatType) {
    case 'daily':
      return 'CADA DÍA';
    case 'weekly':
      return `CADA SEMANA EL ${format(date, 'eeee', { locale: es }).toUpperCase()}`;
    case 'weekday':
      return 'CADA DÍA LABORABLE (LUN - VIE)';
    case 'monthly':
      return `CADA MES EL ${format(date, 'd')}`;
    default:
      return '';
  }
}
