/** Pure logic of DateTimeField: the value is a wall-clock text `YYYY-MM-DDTHH:mm`, with no time zone. */

const RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

export interface DateAndTime {
  /** Local date at midnight. */
  date: Date
  /** Minutes since midnight. */
  minutes: number
}

/** Splits `2026-11-17T09:30`; null when the text is not a real date and time (2026-02-30T10:00). */
export function splitLocal(text: string): DateAndTime | null {
  const m = RE.exec(text)
  if (!m) return null
  const [year, month, day, hour, minute] = m.slice(1).map(Number)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || hour > 23 || minute > 59) return null
  return { date, minutes: hour * 60 + minute }
}

const pad = (n: number, width = 2): string => String(n).padStart(width, '0')

/** Joins a date and a time of day into `2026-11-17T09:30`. */
export const joinLocal = (date: Date, minutes: number): string =>
  `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
