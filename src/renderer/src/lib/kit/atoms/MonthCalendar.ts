export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export interface CalendarCell {
  date: Date
  inMonth: boolean
}

const pad = (n: number, len = 2): string => String(n).padStart(len, '0')

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Adds months, clamping the day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(d: Date, n: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const day = Math.min(d.getDate(), daysInMonth(target.getFullYear(), target.getMonth()))
  return new Date(target.getFullYear(), target.getMonth(), day)
}

/** Six weeks of cells covering the month; `firstDay` 0 = Sunday, 1 = Monday. */
export function buildMonthGrid(year: number, month: number, firstDay = 0): CalendarCell[] {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() - firstDay + 7) % 7
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(year, month, 1 - lead + i)
    return { date, inMonth: date.getMonth() === month }
  })
}

export function weekdayHeaders(firstDay = 0): string[] {
  return Array.from({ length: 7 }, (_, i) => DAY_NAMES[(firstDay + i) % 7].slice(0, 2))
}

/** Start year of the decade-like 12-year block shown in the years view. */
export function yearBlockStart(year: number): number {
  return year - (year % 10) - 1
}

export function clampDate(d: Date, min?: Date | null, max?: Date | null): Date {
  if (min && d < min) return min
  if (max && d > max) return max
  return d
}

export function formatShortDate(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${pad(d.getFullYear(), 4)}`
}

export function formatLongDate(d: Date): string {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

export function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
