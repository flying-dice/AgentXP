/** Pure logic of TimeUpDown: a time of day is the number of minutes since midnight (0 ... 1439), shown as `9:00 AM`. */

export type TimeSegment = 'hour' | 'minute' | 'period'

export const MINUTES_PER_DAY = 1440

export const clampMinutes = (minutes: number): number => Math.min(MINUTES_PER_DAY - 1, Math.max(0, Math.round(minutes)))

const pad = (n: number): string => String(n).padStart(2, '0')

/** `9:00 AM`, `12:30 PM`. */
export function formatTime(minutes: number): string {
  const m = clampMinutes(minutes)
  const hour = Math.floor(m / 60)
  return `${hour % 12 === 0 ? 12 : hour % 12}:${pad(m % 60)} ${hour < 12 ? 'AM' : 'PM'}`
}

/**
 * Reads what a person types: `9:30 AM`, `9:30am`, `9 pm`, `21:15`, `930`, `0915`. Null when it is not a time.
 * Without AM or PM the hours 0 to 23 count as a 24-hour clock, except 1 to 12 typed alone with no colon, which stay as typed.
 */
export function parseTime(text: string): number | null {
  const m = /^\s*(\d{1,2})(?::?(\d{2}))?\s*([ap])?\.?m?\.?\s*$/i.exec(text)
  if (!m) return null
  let hour = Number(m[1])
  const minute = m[2] === undefined ? 0 : Number(m[2])
  if (minute > 59) return null
  const period = m[3]?.toLowerCase()
  if (period) {
    if (hour < 1 || hour > 12) return null
    hour = (hour % 12) + (period === 'p' ? 12 : 0)
  } else if (hour > 23) return null
  return hour * 60 + minute
}

/** The part of `9:30 AM` the caret is in. */
export function segmentAt(text: string, caret: number): TimeSegment {
  const colon = text.indexOf(':')
  if (colon < 0 || caret <= colon) return 'hour'
  const space = text.indexOf(' ', colon)
  return space < 0 || caret <= space ? 'minute' : 'period'
}

/** Where a segment starts and ends in `formatTime(minutes)`, to select it. */
export function segmentRange(text: string, segment: TimeSegment): [number, number] {
  const colon = text.indexOf(':')
  const space = text.indexOf(' ', colon)
  if (segment === 'hour') return [0, colon]
  if (segment === 'minute') return [colon + 1, space]
  return [space + 1, text.length]
}

/**
 * One step of a segment, like the spinner of Windows 7: the hours cycle inside AM or PM (11 AM, 12 PM stay on their side), the
 * minutes cycle inside the hour, and the period moves the time by 12 hours.
 */
export function stepTime(minutes: number, segment: TimeSegment, direction: 1 | -1, minuteStep = 1): number {
  const m = clampMinutes(minutes)
  const hour = Math.floor(m / 60)
  const minute = m % 60
  if (segment === 'period') return (m + 12 * 60) % MINUTES_PER_DAY
  if (segment === 'hour') {
    const base = hour < 12 ? 0 : 12
    return (base + ((((hour % 12) + direction) % 12) + 12) % 12) * 60 + minute
  }
  return hour * 60 + ((((minute + direction * minuteStep) % 60) + 60) % 60)
}

/** The hour and minute of a time of day. */
export const splitMinutes = (minutes: number): { hour: number; minute: number } => ({ hour: Math.floor(clampMinutes(minutes) / 60), minute: clampMinutes(minutes) % 60 })
