import { addDays, format, formatDistanceToNow, isSameDay, parseISO, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

function toDate(value: string | Date): Date {
  if (value instanceof Date) return value
  const normalized = value.length === 10 ? `${value}T12:00:00` : value
  return parseISO(normalized)
}

export function formatDate(value: string): string {
  return format(toDate(value), 'dd/MM/yyyy', { locale: es })
}

/** Ejemplo: miércoles 22 de julio de 2026 */
export function formatDateLong(value: string): string {
  return format(toDate(value), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
}

/** Ejemplo: mié 22/07 */
export function formatDateShort(value: string): string {
  return format(toDate(value), 'EEE dd/MM', { locale: es })
}

export function formatDateTime(value: string): string {
  return format(parseISO(value), "dd/MM/yyyy HH:mm", { locale: es })
}

export function formatTime(value: string): string {
  return format(parseISO(value), 'HH:mm', { locale: es })
}

export function formatRelative(value: string): string {
  return formatDistanceToNow(parseISO(value), { addSuffix: true, locale: es })
}

export function todayISODate(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function parseISODateParam(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = toDate(value)
  if (Number.isNaN(parsed.getTime())) return null
  return value
}

export function addDaysISODate(days: number, from: Date = new Date()): string {
  return format(addDays(startOfDay(from), days), 'yyyy-MM-dd')
}

export function isSameDayISO(value: string, day: string): boolean {
  return value.slice(0, 10) === day.slice(0, 10)
}

export function isDeliveryScheduledForToday(deliveryDate: string): boolean {
  return isSameDayISO(deliveryDate, todayISODate())
}

export function getRelativeDayLabel(value: string): string | null {
  const date = startOfDay(toDate(value))
  const today = startOfDay(new Date())
  if (isSameDay(date, today)) return 'Hoy'
  if (isSameDay(date, addDays(today, -1))) return 'Ayer'
  if (isSameDay(date, addDays(today, 1))) return 'Mañana'
  if (isSameDay(date, addDays(today, 2))) return 'Pasado mañana'
  return null
}

/** Hoy · miércoles 22 de julio de 2026 */
export function formatDeliveryDate(value: string): string {
  const relative = getRelativeDayLabel(value)
  const long = formatDateLong(value)
  return relative ? `${relative} · ${long}` : long
}

export function capitalize(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatDeliveryDateDisplay(value: string): string {
  return capitalize(formatDeliveryDate(value))
}

export function toISODate(value: Date): string {
  return format(value, 'yyyy-MM-dd')
}

export function formatMonthYear(value: Date): string {
  return capitalize(format(value, 'MMMM yyyy', { locale: es }))
}
