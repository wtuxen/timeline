import type { ISODate } from '../types'

/**
 * Todas as datas do app são `YYYY-MM-DD` interpretadas no fuso local. Usamos
 * `new Date(y, m, d)` (e nunca `new Date('2026-01-01')`, que é UTC) para que
 * um dia nunca "ande" para trás dependendo do fuso do usuário.
 */
export function parseDate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function toISO(date: Date): ISODate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function today(): ISODate {
  return toISO(new Date())
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1)
  // Preserva o dia quando possível (31 de jan + 1 mês = 28/29 de fev).
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(date.getDate(), lastDay))
  return next
}

export function addISODays(iso: ISODate, days: number): ISODate {
  return toISO(addDays(parseDate(iso), days))
}

/** Diferença em dias entre duas datas (b - a), ignorando horário e DST. */
export function diffDays(a: Date, b: Date): number {
  const ms =
    Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  return Math.round(ms / 86_400_000)
}

/** Duração inclusiva: 10/01 → 10/01 é 1 dia. */
export function durationInDays(start: ISODate, end: ISODate): number {
  return diffDays(parseDate(start), parseDate(end)) + 1
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const weekday = (d.getDay() + 6) % 7 // segunda = 0
  return addDays(d, -weekday)
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function startOfQuarter(date: Date): Date {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1)
}

export function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1)
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function minISO(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b
}

export function maxISO(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b
}

export function clampISO(value: ISODate, min: ISODate, max: ISODate): ISODate {
  return minISO(maxISO(value, min), max)
}

const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const fullDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const monthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
const monthLong = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const weekdayShort = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })

export function formatDayMonth(date: Date): string {
  return dayMonth.format(date)
}

export function formatFull(iso: ISODate): string {
  return fullDate.format(parseDate(iso))
}

export function formatMonthShort(date: Date): string {
  return capitalize(monthShort.format(date).replace('.', ''))
}

export function formatMonthLong(date: Date): string {
  return capitalize(monthLong.format(date))
}

export function formatWeekdayShort(date: Date): string {
  return capitalize(weekdayShort.format(date).replace('.', '').slice(0, 3))
}

export function quarterOf(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** "faltam 12 dias" / "há 3 dias" / "hoje", relativo a hoje. */
export function relativeToToday(iso: ISODate): string {
  const delta = diffDays(new Date(), parseDate(iso))
  if (delta === 0) return 'hoje'
  if (delta === 1) return 'amanhã'
  if (delta === -1) return 'ontem'
  if (delta > 0) return `em ${delta} dias`
  return `há ${Math.abs(delta)} dias`
}
