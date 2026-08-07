import type { ISODate, ZoomLevel } from '../../types'
import {
  addDays,
  addMonths,
  diffDays,
  formatDayMonth,
  formatMonthLong,
  formatMonthShort,
  formatWeekdayShort,
  parseDate,
  quarterOf,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  toISO,
} from '../../lib/dates'

export type TickUnit = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'decade'

export interface ZoomConfig {
  level: ZoomLevel
  label: string
  /** Unidade das colunas (linha de baixo do cabeçalho). */
  unit: TickUnit
  /** Unidade dos agrupadores (linha de cima do cabeçalho). */
  groupUnit: TickUnit
  pxPerDay: number
  /** Folga aplicada nas duas pontas do intervalo, em dias. */
  paddingDays: number
}

export const ZOOM_LEVELS: ZoomLevel[] = ['year', 'quarter', 'month', 'week', 'day']

export const ZOOM_CONFIG: Record<ZoomLevel, ZoomConfig> = {
  day: { level: 'day', label: 'Dia', unit: 'day', groupUnit: 'month', pxPerDay: 40, paddingDays: 5 },
  week: {
    level: 'week',
    label: 'Semana',
    unit: 'week',
    groupUnit: 'month',
    pxPerDay: 100 / 7,
    paddingDays: 14,
  },
  month: {
    level: 'month',
    label: 'Mês',
    unit: 'month',
    groupUnit: 'year',
    pxPerDay: 130 / 30.44,
    paddingDays: 45,
  },
  quarter: {
    level: 'quarter',
    label: 'Trimestre',
    unit: 'quarter',
    groupUnit: 'year',
    pxPerDay: 150 / 91.3,
    paddingDays: 120,
  },
  year: {
    level: 'year',
    label: 'Ano',
    unit: 'year',
    groupUnit: 'decade',
    pxPerDay: 190 / 365.25,
    paddingDays: 400,
  },
}

export interface Tick {
  key: string
  start: Date
  end: Date
  x: number
  width: number
  label: string
  isCurrent: boolean
  isWeekend: boolean
}

export interface Scale {
  level: ZoomLevel
  start: Date
  end: Date
  pxPerDay: number
  width: number
  columns: Tick[]
  groups: Tick[]
  /** Posição, em px, do início do dia informado. */
  xOf: (iso: ISODate) => number
  /** Largura, em px, de um intervalo inclusivo. */
  widthOf: (start: ISODate, end: ISODate) => number
  /** Data correspondente a uma posição horizontal — usado no arrastar. */
  dateAt: (x: number) => ISODate
  /** Quantos px equivalem a um dia arrastado (mínimo de 1 dia por gesto). */
  daysFromPx: (px: number) => number
}

function startOfUnit(date: Date, unit: TickUnit): Date {
  switch (unit) {
    case 'day':
      return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    case 'week':
      return startOfWeek(date)
    case 'month':
      return startOfMonth(date)
    case 'quarter':
      return startOfQuarter(date)
    case 'year':
      return startOfYear(date)
    case 'decade':
      return new Date(Math.floor(date.getFullYear() / 10) * 10, 0, 1)
  }
}

function nextUnit(date: Date, unit: TickUnit): Date {
  switch (unit) {
    case 'day':
      return addDays(date, 1)
    case 'week':
      return addDays(date, 7)
    case 'month':
      return addMonths(startOfMonth(date), 1)
    case 'quarter':
      return addMonths(startOfQuarter(date), 3)
    case 'year':
      return new Date(date.getFullYear() + 1, 0, 1)
    case 'decade':
      return new Date(Math.floor(date.getFullYear() / 10) * 10 + 10, 0, 1)
  }
}

function labelFor(date: Date, unit: TickUnit): string {
  switch (unit) {
    case 'day':
      return `${formatWeekdayShort(date)} ${date.getDate()}`
    case 'week':
      return formatDayMonth(date)
    case 'month':
      return formatMonthShort(date)
    case 'quarter':
      return `T${quarterOf(date)}`
    case 'year':
      return String(date.getFullYear())
    case 'decade':
      return `${Math.floor(date.getFullYear() / 10) * 10}s`
  }
}

function groupLabelFor(date: Date, unit: TickUnit): string {
  if (unit === 'month') return formatMonthLong(date)
  if (unit === 'year') return String(date.getFullYear())
  if (unit === 'decade') return `Década de ${Math.floor(date.getFullYear() / 10) * 10}`
  return labelFor(date, unit)
}

function sameUnit(a: Date, b: Date, unit: TickUnit): boolean {
  return startOfUnit(a, unit).getTime() === startOfUnit(b, unit).getTime()
}

function buildTicks(
  rangeStart: Date,
  rangeEnd: Date,
  unit: TickUnit,
  pxPerDay: number,
  isGroup: boolean,
): Tick[] {
  const ticks: Tick[] = []
  const now = new Date()
  let cursor = startOfUnit(rangeStart, unit)
  let guard = 0

  while (cursor < rangeEnd && guard++ < 5000) {
    const next = nextUnit(cursor, unit)
    const visibleStart = cursor < rangeStart ? rangeStart : cursor
    const visibleEnd = next > rangeEnd ? rangeEnd : next
    const x = diffDays(rangeStart, visibleStart) * pxPerDay
    const width = diffDays(visibleStart, visibleEnd) * pxPerDay
    if (width > 0) {
      ticks.push({
        key: `${unit}-${toISO(cursor)}`,
        start: cursor,
        end: next,
        x,
        width,
        label: isGroup ? groupLabelFor(cursor, unit) : labelFor(cursor, unit),
        isCurrent: sameUnit(cursor, now, unit),
        isWeekend: unit === 'day' && (cursor.getDay() === 0 || cursor.getDay() === 6),
      })
    }
    cursor = next
  }

  return ticks
}

export interface ScaleInput {
  level: ZoomLevel
  /** Menor e maior data presentes nos itens visíveis (já filtrados). */
  minDate: ISODate
  maxDate: ISODate
}

export function buildScale({ level, minDate, maxDate }: ScaleInput): Scale {
  const config = ZOOM_CONFIG[level]
  const padded = {
    start: addDays(parseDate(minDate), -config.paddingDays),
    end: addDays(parseDate(maxDate), config.paddingDays),
  }

  // Alinhar nas bordas da unidade deixa o cabeçalho sem colunas cortadas.
  const start = startOfUnit(padded.start, config.unit)
  const end = nextUnit(startOfUnit(padded.end, config.unit), config.unit)
  const pxPerDay = config.pxPerDay
  const width = Math.max(diffDays(start, end) * pxPerDay, 320)

  const xOf = (iso: ISODate) => diffDays(start, parseDate(iso)) * pxPerDay
  const widthOf = (from: ISODate, to: ISODate) =>
    Math.max((diffDays(parseDate(from), parseDate(to)) + 1) * pxPerDay, 4)

  return {
    level,
    start,
    end,
    pxPerDay,
    width,
    columns: buildTicks(start, end, config.unit, pxPerDay, false),
    groups: buildTicks(start, end, config.groupUnit, pxPerDay, true),
    xOf,
    widthOf,
    dateAt: (x) => toISO(addDays(start, Math.floor(x / pxPerDay))),
    daysFromPx: (px) => Math.round(px / pxPerDay),
  }
}
