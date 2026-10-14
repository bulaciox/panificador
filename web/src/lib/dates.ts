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

/** Formato amigable para el encabezado de días completados (ej. "Hoy, 14 de octubre", "Ayer, 13 de octubre"). */
export function dayHeaderLabel(iso: string): string {
  const date = fromIsoDate(iso);
  const formatted = format(date, "EEEE, d 'de' MMMM", { locale: es });
  if (isToday(date)) return `Hoy, ${format(date, "d 'de' MMMM", { locale: es })}`;
  if (isYesterday(date)) return `Ayer, ${format(date, "d 'de' MMMM", { locale: es })}`;
  return capitalize(formatted);
}

/** Título y subtítulo para las columnas de los últimos 7 días. */
export function columnDateLabel(iso: string): { title: string; subtitle: string } {
  const date = fromIsoDate(iso);
  const dayMonth = format(date, "d MMM", { locale: es });
  const weekday = capitalize(format(date, "EEEE", { locale: es }));
  return { title: weekday, subtitle: dayMonth };
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

/** "3 días", "ayer"… contando desde la fecha original de la tarea. Corto a propósito. */
export function carriedLabel(days: number): string {
  if (days === 1) return "ayer";
  if (days < 7) return `${days} días`;
  if (days < 14) return "1 semana";
  if (days < 30) return `${Math.floor(days / 7)} semanas`;
  if (days < 60) return "1 mes";
  return `${Math.floor(days / 30)} meses`;
}

/** "1 sem", "2 sem", "1 mes"… para indicar cuánto tiempo lleva creada la tarea. */
export function staleLabel(days: number): string {
  if (days < 14) return "1 sem";
  if (days < 30) return `${Math.floor(days / 7)} sem`;
  if (days < 60) return "1 mes";
  if (days < 365) return `${Math.floor(days / 30)} meses`;
  return "+1 año";
}

export function staleLevel(days: number): "none" | "aging" | "stale" | "critical" {
  if (days < 7) return "none";
  if (days < 14) return "aging";
  if (days < 30) return "stale";
  return "critical";
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
