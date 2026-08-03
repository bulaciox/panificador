import { addDays, format, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/** Fecha local en formato ISO corto (yyyy-MM-dd), que es lo que habla la API. */
export function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function fromIsoDate(iso: string): Date {
  return parseISO(iso);
}

export function shiftIso(iso: string, days: number): string {
  return toIsoDate(addDays(fromIsoDate(iso), days));
}

/** "Hoy", "Mañana", "Ayer" o "miércoles, 29 de julio". */
export function longLabel(iso: string): string {
  const date = fromIsoDate(iso);
  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Mañana";
  if (isYesterday(date)) return "Ayer";
  return capitalize(format(date, "EEEE, d 'de' MMMM", { locale: es }));
}

/** true cuando longLabel devuelve "Hoy"/"Mañana"/"Ayer" en vez de la fecha. */
export function isRelativeLabel(iso: string): boolean {
  const date = fromIsoDate(iso);
  return isToday(date) || isTomorrow(date) || isYesterday(date);
}

export function subLabel(iso: string): string {
  return capitalize(format(fromIsoDate(iso), "EEEE d 'de' MMMM yyyy", { locale: es }));
}

/** Hora de un instante ISO ("18:42"), para saber en qué momento del día fue. */
export function timeLabel(iso: string): string {
  return format(new Date(iso), "HH:mm");
}

/** "vie 31 jul" para las píldoras de fecha de las listas. */
export function shortDate(iso: string): string {
  const date = fromIsoDate(iso);
  if (isToday(date)) return "hoy";
  if (isTomorrow(date)) return "mañana";
  return format(date, "EEE d MMM", { locale: es });
}

/** Igual que subLabel pero en minúscula, para meterlo dentro de una frase. */
export function inlineDate(iso: string): string {
  return format(fromIsoDate(iso), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
}

/** "JUE", "VIE"… para la cabecera de la rejilla de hábitos. */
export function weekdayAbbr(iso: string): string {
  return format(fromIsoDate(iso), "EEE", { locale: es }).replace(".", "").toUpperCase();
}

export function weekdayShort(iso: string): string {
  return capitalize(format(fromIsoDate(iso), "EEEEE", { locale: es }));
}

export function dayNumber(iso: string): string {
  return format(fromIsoDate(iso), "d");
}

/** "hace 3 días" contando desde la fecha original de la tarea. */
export function carriedLabel(days: number): string {
  if (days === 1) return "de ayer";
  if (days < 7) return `hace ${days} días`;
  if (days < 14) return "hace 1 semana";
  if (days < 30) return `hace ${Math.floor(days / 7)} semanas`;
  return `hace ${Math.floor(days / 30)} meses`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
