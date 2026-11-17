/**
 * Task Scheduler time logic: triggers and the pure computation of their next run.
 *
 * Triggers are written in the wall-clock time of the user (`2026-11-17T09:00`, no zone). A `Zone` turns wall-clock time into
 * instants and back, so the computation is exact over daylight saving changes and testable in any host zone:
 *  - a wall-clock time that does not exist (the hour skipped in spring) runs at the same offset as before the gap, which is
 *    the first instant after the gap (02:30 becomes 03:30);
 *  - a wall-clock time that exists twice (the hour repeated in autumn) runs at its first occurrence.
 *
 * Rules of the recurring triggers (docs: manuals/task-scheduler.md):
 *  - daily: on the start day and then every `everyDays` days;
 *  - weekly: in the start week and then every `everyWeeks` weeks, on the chosen days. A week starts on Sunday;
 *  - monthly: on the chosen days of the chosen months. A day that a month does not have (31 in April, 30 in February) is
 *    skipped for that month, like the Windows Task Scheduler. `lastDay` runs on the last day of each chosen month instead;
 *  - nothing runs before the start, and nothing runs after `expiresAt`.
 *
 * Pure: no Node, no Electron, no DOM. The only global it reads is `Intl` inside `ianaZone` and `Date` inside `localZone`.
 */

/** Wall-clock date and time without a zone, `YYYY-MM-DDTHH:mm`. */
export type LocalDateTime = string

/** 0 = Sunday ... 6 = Saturday. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const

interface TimedBase {
  /** The first moment the trigger can fire. */
  startAt: LocalDateTime
  /** The trigger does not fire after this moment; null = never. */
  expiresAt: LocalDateTime | null
}

export interface OnceTrigger extends TimedBase {
  kind: 'once'
  enabled: boolean
}
export interface DailyTrigger extends TimedBase {
  kind: 'daily'
  enabled: boolean
  everyDays: number
}
export interface WeeklyTrigger extends TimedBase {
  kind: 'weekly'
  enabled: boolean
  everyWeeks: number
  daysOfWeek: DayOfWeek[]
}
export interface MonthlyTrigger extends TimedBase {
  kind: 'monthly'
  enabled: boolean
  /** 1 = January ... 12 = December. */
  months: number[]
  /** 1 ... 31. */
  daysOfMonth: number[]
  /** Also (or only) the last day of each chosen month. */
  lastDay: boolean
}
export interface StartupTrigger {
  kind: 'startup'
  enabled: boolean
  /** Minutes to wait after AgentXP started. */
  delayMinutes: number
}

export type TimedTrigger = OnceTrigger | DailyTrigger | WeeklyTrigger | MonthlyTrigger
export type TriggerDto = TimedTrigger | StartupTrigger
export type TriggerKind = TriggerDto['kind']

export const TRIGGER_KINDS: readonly TriggerKind[] = ['once', 'daily', 'weekly', 'monthly', 'startup']

/** What the user sees for a kind in the lists ("One time", "Daily", ...). */
export const TRIGGER_KIND_LABEL: Record<TriggerKind, string> = {
  once: 'One time',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  startup: 'At AgentXP startup'
}

// ---------------------------------------------------------------- zones

/** A time zone: how far its clocks are ahead of UTC at an instant. The zone is the only source of daylight saving rules. */
export interface Zone {
  /** Minutes east of UTC at the instant `epochMs`. */
  offsetMinutes(epochMs: number): number
}

/** The clocks of the computer. */
export const localZone: Zone = { offsetMinutes: (ms) => -new Date(ms).getTimezoneOffset() }

/** A fixed offset, for tests that need no daylight saving. */
export const fixedZone = (offsetMinutes: number): Zone => ({ offsetMinutes: () => offsetMinutes })

/** A named zone (`America/New_York`) through `Intl`; the same on every host. */
export function ianaZone(timeZone: string): Zone {
  const format = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
  return {
    offsetMinutes(ms) {
      const seconds = Math.floor(ms / 1000) * 1000
      const parts: Record<string, number> = {}
      for (const p of format.formatToParts(seconds)) if (p.type !== 'literal') parts[p.type] = Number(p.value)
      const asUtc = Date.UTC(parts['year'], parts['month'] - 1, parts['day'], parts['hour'] % 24, parts['minute'], parts['second'])
      return Math.round((asUtc - seconds) / 60_000)
    }
  }
}

export interface Wall {
  year: number
  /** 1 ... 12. */
  month: number
  day: number
  hour: number
  minute: number
}

const MINUTE = 60_000
const DAY = 86_400_000

/** The wall-clock time of an instant in a zone. */
export function toWall(zone: Zone, epochMs: number): Wall {
  const d = new Date(epochMs + zone.offsetMinutes(epochMs) * MINUTE)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() }
}

const sameWall = (a: Wall, b: Wall): boolean => a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour && a.minute === b.minute

/** The instant of a wall-clock time in a zone: the first one when it exists twice, the one after the gap when it does not exist. */
export function toEpoch(zone: Zone, wall: Wall): number {
  const naive = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute)
  const before = zone.offsetMinutes(naive - DAY)
  const after = zone.offsetMinutes(naive + DAY)
  const valid = [...new Set([naive - before * MINUTE, naive - after * MINUTE])].filter((ms) => sameWall(toWall(zone, ms), wall)).sort((a, b) => a - b)
  return valid[0] ?? naive - before * MINUTE
}

// ---------------------------------------------------------------- wall-clock text

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

/** Parses `YYYY-MM-DDTHH:mm`; null for anything else or a date that does not exist (2026-02-30). */
export function parseLocal(text: string): Wall | null {
  const m = LOCAL_RE.exec(text)
  if (!m) return null
  const [year, month, day, hour, minute] = m.slice(1).map(Number)
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month) || hour > 23 || minute > 59) return null
  return { year, month, day, hour, minute }
}

const pad = (n: number, width = 2): string => String(n).padStart(width, '0')

export const formatLocal = (w: Wall): LocalDateTime => `${pad(w.year, 4)}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`

export const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate()

/** The wall-clock time of an instant as `YYYY-MM-DDTHH:mm`. */
export const localOf = (zone: Zone, epochMs: number): LocalDateTime => formatLocal(toWall(zone, epochMs))

/** The instant of a `YYYY-MM-DDTHH:mm` text; null when it does not parse. */
export function epochOfLocal(zone: Zone, text: LocalDateTime): number | null {
  const wall = parseLocal(text)
  return wall ? toEpoch(zone, wall) : null
}

/** `9:00 AM`. */
export function formatClock(hour: number, minute: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${h}:${pad(minute)} ${hour < 12 ? 'AM' : 'PM'}`
}

/** `11/17/2026`, the way the Windows XP lists show dates. */
export const formatWallDate = (w: Wall): string => `${w.month}/${w.day}/${w.year}`

// ---------------------------------------------------------------- calendar days

const dayNumber = (year: number, month: number, day: number): number => Math.floor(Date.UTC(year, month - 1, day) / DAY)
const wallOfDay = (day: number, hour: number, minute: number): Wall => {
  const d = new Date(day * DAY)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour, minute }
}
const mod = (n: number, m: number): number => ((n % m) + m) % m
/** 1970-01-01 was a Thursday. */
const weekdayOf = (day: number): DayOfWeek => mod(day + 4, 7) as DayOfWeek

// ---------------------------------------------------------------- the next run

/** How far ahead a search goes: enough for 29 February (8 years) and for the longest "every N" a task can have. */
const MAX_MONTHS_AHEAD = 12 * 9
const MAX_SPANS_AHEAD = 4

/**
 * The first moment after `after` (an instant, ms) at which `trigger` fires, or null when it never fires again (a one-time
 * trigger in the past, an expired trigger, a start-up trigger, a trigger that is off or has no day or month chosen).
 * A trigger that is switched off still has a next run here: `enabled` is the task's business, so a preview can show it.
 */
export function nextRun(trigger: TriggerDto, after: number, zone: Zone): number | null {
  if (trigger.kind === 'startup') return null
  const start = parseLocal(trigger.startAt)
  if (!start) return null
  const found = search(trigger, start, after, zone)
  if (found === null) return null
  const expires = trigger.expiresAt === null ? null : epochOfLocal(zone, trigger.expiresAt)
  return expires !== null && found > expires ? null : found
}

function search(trigger: TimedTrigger, start: Wall, after: number, zone: Zone): number | null {
  const startDay = dayNumber(start.year, start.month, start.day)
  const afterWall = toWall(zone, after)
  // The day before `after` can still hold a moment later than `after` when the zone moved its clocks back.
  const firstDay = Math.max(startDay, dayNumber(afterWall.year, afterWall.month, afterWall.day) - 1)
  const at = (day: number): number => toEpoch(zone, wallOfDay(day, start.hour, start.minute))

  switch (trigger.kind) {
    case 'once': {
      const ms = toEpoch(zone, start)
      return ms > after ? ms : null
    }
    case 'daily': {
      const every = Math.max(1, Math.floor(trigger.everyDays))
      const first = startDay + Math.ceil((firstDay - startDay) / every) * every
      for (let i = 0; i < MAX_SPANS_AHEAD; i++) {
        const ms = at(first + i * every)
        if (ms > after) return ms
      }
      return null
    }
    case 'weekly': {
      const every = Math.max(1, Math.floor(trigger.everyWeeks))
      if (trigger.daysOfWeek.length === 0) return null
      const startWeek = startDay - weekdayOf(startDay)
      for (let day = firstDay; day <= firstDay + 7 * every * MAX_SPANS_AHEAD; day++) {
        if (!trigger.daysOfWeek.includes(weekdayOf(day))) continue
        const week = day - weekdayOf(day)
        if (((week - startWeek) / 7) % every !== 0) continue
        const ms = at(day)
        if (ms > after) return ms
      }
      return null
    }
    case 'monthly': {
      if (trigger.months.length === 0 || (trigger.daysOfMonth.length === 0 && !trigger.lastDay)) return null
      const startIndex = afterWall.year * 12 + afterWall.month - 1
      const firstIndex = Math.max(start.year * 12 + start.month - 1, startIndex)
      for (let index = firstIndex; index < firstIndex + MAX_MONTHS_AHEAD; index++) {
        const year = Math.floor(index / 12)
        const month = (index % 12) + 1
        if (!trigger.months.includes(month)) continue
        const length = daysInMonth(year, month)
        const days = new Set(trigger.daysOfMonth.filter((d) => d >= 1 && d <= length))
        if (trigger.lastDay) days.add(length)
        for (const d of [...days].sort((a, b) => a - b)) {
          const day = dayNumber(year, month, d)
          if (day < startDay) continue
          const ms = at(day)
          if (ms > after) return ms
        }
      }
      return null
    }
  }
}

/** The first moment after `after` at which any of the enabled `triggers` fires; null when none does. */
export function nextRunOfTriggers(triggers: readonly TriggerDto[], after: number, zone: Zone): number | null {
  let best: number | null = null
  for (const trigger of triggers) {
    if (!trigger.enabled) continue
    const ms = nextRun(trigger, after, zone)
    if (ms !== null && (best === null || ms < best)) best = ms
  }
  return best
}

// ---------------------------------------------------------------- text

const listOf = (items: readonly string[]): string => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)
const ordinal = (n: number): string => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`
const everyOf = (n: number, unit: string): string => (n === 1 ? `every ${unit}` : `every ${n} ${unit}s`)

/** The sentence of a trigger in the library list: `At 9:00 AM every day`, `At 8:30 AM every Monday and Friday`. */
export function describeTrigger(trigger: TriggerDto): string {
  if (trigger.kind === 'startup') return trigger.delayMinutes > 0 ? `At AgentXP startup, after a delay of ${trigger.delayMinutes} ${trigger.delayMinutes === 1 ? 'minute' : 'minutes'}` : 'At AgentXP startup'
  const start = parseLocal(trigger.startAt)
  if (!start) return TRIGGER_KIND_LABEL[trigger.kind]
  const time = formatClock(start.hour, start.minute)
  switch (trigger.kind) {
    case 'once':
      return `At ${time} on ${formatWallDate(start)}`
    case 'daily':
      return `At ${time} ${everyOf(trigger.everyDays, 'day')}`
    case 'weekly': {
      const days = [...trigger.daysOfWeek].sort((a, b) => a - b).map((d) => DAY_NAMES[d])
      return `At ${time} on ${listOf(days) || 'no day'}, ${everyOf(trigger.everyWeeks, 'week')}`
    }
    case 'monthly': {
      const days = [...trigger.daysOfMonth].sort((a, b) => a - b).map(ordinal)
      if (trigger.lastDay) days.push('last day')
      const months = trigger.months.length === 12 ? 'every month' : `of ${listOf([...trigger.months].sort((a, b) => a - b).map((m) => MONTH_NAMES[m - 1]))}`
      return `At ${time} on the ${listOf(days) || 'no day'} ${months}`
    }
  }
}

/** A fresh trigger of a kind, starting at `from` (a wall-clock time) with the usual defaults. */
export function newTrigger(kind: TriggerKind, from: LocalDateTime): TriggerDto {
  const timed = { startAt: from, expiresAt: null, enabled: true }
  switch (kind) {
    case 'once':
      return { kind, ...timed }
    case 'daily':
      return { kind, ...timed, everyDays: 1 }
    case 'weekly': {
      const start = parseLocal(from)
      const day = start ? weekdayOf(dayNumber(start.year, start.month, start.day)) : 1
      return { kind, ...timed, everyWeeks: 1, daysOfWeek: [day] }
    }
    case 'monthly': {
      const start = parseLocal(from)
      return { kind, ...timed, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], daysOfMonth: [Math.min(start?.day ?? 1, 28)], lastDay: false }
    }
    case 'startup':
      return { kind, enabled: true, delayMinutes: 0 }
  }
}

/** Why a trigger cannot be saved, in plain words, or null when it is fine. */
export function triggerProblem(trigger: TriggerDto): string | null {
  if (trigger.kind === 'startup') return Number.isInteger(trigger.delayMinutes) && trigger.delayMinutes >= 0 && trigger.delayMinutes <= 1440 ? null : 'The delay must be between 0 and 1440 minutes.'
  const start = parseLocal(trigger.startAt)
  if (!start) return 'The start date and time are not valid.'
  if (trigger.expiresAt !== null) {
    const end = parseLocal(trigger.expiresAt)
    if (!end) return 'The expiration date and time are not valid.'
    if (trigger.expiresAt <= trigger.startAt) return 'The trigger must expire after it starts.'
  }
  switch (trigger.kind) {
    case 'once':
      return null
    case 'daily':
      return Number.isInteger(trigger.everyDays) && trigger.everyDays >= 1 && trigger.everyDays <= 365 ? null : 'Repeat every 1 to 365 days.'
    case 'weekly':
      if (!Number.isInteger(trigger.everyWeeks) || trigger.everyWeeks < 1 || trigger.everyWeeks > 52) return 'Repeat every 1 to 52 weeks.'
      return trigger.daysOfWeek.length === 0 ? 'Select at least one day of the week.' : null
    case 'monthly':
      if (trigger.months.length === 0) return 'Select at least one month.'
      return trigger.daysOfMonth.length === 0 && !trigger.lastDay ? 'Select at least one day of the month.' : null
  }
}
