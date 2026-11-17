import { describe, expect, it } from 'vitest'
import {
  describeTrigger,
  epochOfLocal,
  fixedZone,
  ianaZone,
  localOf,
  newTrigger,
  nextRun,
  nextRunOfTriggers,
  parseLocal,
  toEpoch,
  toWall,
  triggerProblem,
  type DailyTrigger,
  type MonthlyTrigger,
  type OnceTrigger,
  type TriggerDto,
  type WeeklyTrigger,
  type Zone
} from './schedule'

const utc = fixedZone(0)
const newYork = ianaZone('America/New_York')
const berlin = ianaZone('Europe/Berlin')

/** The wall-clock time of the next run after the wall-clock time `after`, in `zone`. */
function nextLocal(trigger: TriggerDto, after: string, zone: Zone = utc): string | null {
  const from = epochOfLocal(zone, after)
  if (from === null) throw new Error(`bad time ${after}`)
  const ms = nextRun(trigger, from, zone)
  return ms === null ? null : localOf(zone, ms)
}

const once = (startAt: string, expiresAt: string | null = null): OnceTrigger => ({ kind: 'once', enabled: true, startAt, expiresAt })
const daily = (startAt: string, everyDays = 1, expiresAt: string | null = null): DailyTrigger => ({ kind: 'daily', enabled: true, startAt, expiresAt, everyDays })
const weekly = (startAt: string, daysOfWeek: WeeklyTrigger['daysOfWeek'], everyWeeks = 1): WeeklyTrigger => ({ kind: 'weekly', enabled: true, startAt, expiresAt: null, everyWeeks, daysOfWeek })
const monthly = (startAt: string, daysOfMonth: number[], months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], lastDay = false): MonthlyTrigger => ({ kind: 'monthly', enabled: true, startAt, expiresAt: null, months, daysOfMonth, lastDay })

describe('zones', () => {
  it('reads the wall-clock time of an instant', () => {
    // 2026-07-01 12:00 UTC is 08:00 in New York (EDT, UTC-4) and 14:00 in Berlin (CEST, UTC+2).
    const ms = Date.UTC(2026, 6, 1, 12, 0)
    expect(localOf(newYork, ms)).toBe('2026-07-01T08:00')
    expect(localOf(berlin, ms)).toBe('2026-07-01T14:00')
    expect(localOf(newYork, Date.UTC(2026, 0, 1, 12, 0))).toBe('2026-01-01T07:00')
  })

  it('parses only dates that exist', () => {
    expect(parseLocal('2026-02-28T23:59')).toEqual({ year: 2026, month: 2, day: 28, hour: 23, minute: 59 })
    expect(parseLocal('2026-02-30T10:00')).toBeNull()
    expect(parseLocal('2028-02-29T10:00')).not.toBeNull()
    expect(parseLocal('2026-13-01T10:00')).toBeNull()
    expect(parseLocal('2026-01-01T24:00')).toBeNull()
    expect(parseLocal('tomorrow')).toBeNull()
  })

  it('moves a time that does not exist (spring forward) to just after the gap', () => {
    // 2026-03-08: New York skips 02:00 to 03:00.
    const ms = toEpoch(newYork, { year: 2026, month: 3, day: 8, hour: 2, minute: 30 })
    expect(localOf(newYork, ms)).toBe('2026-03-08T03:30')
  })

  it('takes the first of a time that exists twice (fall back)', () => {
    // 2026-11-01: New York repeats 01:00 to 02:00. The first 01:30 is EDT, 05:30 UTC.
    const ms = toEpoch(newYork, { year: 2026, month: 11, day: 1, hour: 1, minute: 30 })
    expect(ms).toBe(Date.UTC(2026, 10, 1, 5, 30))
    expect(toWall(newYork, ms + 3_600_000)).toMatchObject({ hour: 1, minute: 30 })
  })
})

describe('one time', () => {
  it('fires once, at its time', () => {
    const t = once('2026-11-17T09:00')
    expect(nextLocal(t, '2026-11-17T08:59')).toBe('2026-11-17T09:00')
    expect(nextLocal(t, '2026-11-17T09:00')).toBeNull()
    expect(nextLocal(t, '2026-11-18T00:00')).toBeNull()
  })

  it('does not fire after it expired', () => {
    expect(nextLocal(once('2026-11-17T09:00', '2026-11-17T08:00'), '2026-11-01T00:00')).toBeNull()
  })
})

describe('daily', () => {
  it('fires at the time of the start on every day', () => {
    const t = daily('2026-11-17T09:30')
    expect(nextLocal(t, '2026-11-01T00:00')).toBe('2026-11-17T09:30')
    expect(nextLocal(t, '2026-11-17T09:29')).toBe('2026-11-17T09:30')
    expect(nextLocal(t, '2026-11-17T09:30')).toBe('2026-11-18T09:30')
    expect(nextLocal(t, '2026-12-31T10:00')).toBe('2027-01-01T09:30')
  })

  it('counts every N days from the start day', () => {
    const t = daily('2026-11-17T06:00', 3)
    expect(nextLocal(t, '2026-11-17T06:00')).toBe('2026-11-20T06:00')
    expect(nextLocal(t, '2026-11-20T06:00')).toBe('2026-11-23T06:00')
    expect(nextLocal(t, '2026-11-21T00:00')).toBe('2026-11-23T06:00')
    // Across a month and a year end: 17 Nov + 3k days.
    expect(nextLocal(t, '2026-12-28T07:00')).toBe('2026-12-29T06:00')
    expect(nextLocal(t, '2026-12-29T06:00')).toBe('2027-01-01T06:00')
  })

  it('stops at its expiration', () => {
    const t = daily('2026-11-17T09:00', 1, '2026-11-19T09:00')
    expect(nextLocal(t, '2026-11-18T09:00')).toBe('2026-11-19T09:00')
    expect(nextLocal(t, '2026-11-19T09:00')).toBeNull()
  })

  it('runs a time in the skipped hour just after the gap, and the next day at its own time', () => {
    const t = daily('2026-03-01T02:30')
    expect(nextLocal(t, '2026-03-07T03:00', newYork)).toBe('2026-03-08T03:30')
    expect(nextLocal(t, '2026-03-08T03:30', newYork)).toBe('2026-03-09T02:30')
  })

  it('runs a time in the repeated hour once', () => {
    const t = daily('2026-10-30T01:30')
    const first = epochOfLocal(newYork, '2026-10-31T01:30')!
    expect(nextRun(t, first, newYork)).toBe(toEpoch(newYork, { year: 2026, month: 11, day: 1, hour: 1, minute: 30 }))
    const afterFirst = nextRun(t, first, newYork)!
    // The second 01:30 of that night is not a run; the next one is the following day.
    expect(localOf(newYork, nextRun(t, afterFirst, newYork)!)).toBe('2026-11-02T01:30')
  })

  it('keeps the wall-clock time over a daylight saving change', () => {
    const t = daily('2026-11-01T09:00')
    const saturday = epochOfLocal(newYork, '2026-10-31T09:00')!
    const sunday = nextRun(t, saturday, newYork)!
    // Sunday is 25 hours later because the clocks went back, and it is still 09:00 on the wall.
    expect(sunday - saturday).toBe(25 * 3_600_000)
    expect(localOf(newYork, sunday)).toBe('2026-11-01T09:00')
  })
})

describe('weekly', () => {
  it('fires on the chosen days of each week', () => {
    // 2026-11-16 is a Monday. Monday and Friday at 08:30.
    const t = weekly('2026-11-16T08:30', [1, 5])
    expect(nextLocal(t, '2026-11-16T00:00')).toBe('2026-11-16T08:30')
    expect(nextLocal(t, '2026-11-16T08:30')).toBe('2026-11-20T08:30')
    expect(nextLocal(t, '2026-11-20T08:30')).toBe('2026-11-23T08:30')
  })

  it('does not fire on a chosen day before the start', () => {
    // Start on Wednesday 2026-11-18; Monday of that week is before the start.
    const t = weekly('2026-11-18T08:30', [1, 3])
    expect(nextLocal(t, '2026-11-01T00:00')).toBe('2026-11-18T08:30')
    expect(nextLocal(t, '2026-11-18T08:30')).toBe('2026-11-23T08:30')
  })

  it('counts every N weeks from the week of the start', () => {
    // Every 2 weeks on Tuesday, start Tuesday 2026-11-17.
    const t = weekly('2026-11-17T10:00', [2], 2)
    expect(nextLocal(t, '2026-11-17T10:00')).toBe('2026-12-01T10:00')
    expect(nextLocal(t, '2026-12-01T10:00')).toBe('2026-12-15T10:00')
    expect(nextLocal(t, '2026-11-20T00:00')).toBe('2026-12-01T10:00')
  })

  it('starts the week on Sunday', () => {
    // Every 2 weeks on Sunday and Monday, start Monday 2026-11-16. The week of the start began on Sunday 2026-11-15, so the
    // Sunday of that week is before the start and the next run is two weeks after that Sunday: Sunday 2026-11-29.
    const t = weekly('2026-11-16T10:00', [0, 1], 2)
    expect(nextLocal(t, '2026-11-16T10:00')).toBe('2026-11-29T10:00')
    expect(nextLocal(t, '2026-11-29T10:00')).toBe('2026-11-30T10:00')
    expect(nextLocal(t, '2026-11-30T10:00')).toBe('2026-12-13T10:00')
  })

  it('never fires without a day', () => {
    expect(nextLocal(weekly('2026-11-16T08:30', []), '2026-11-01T00:00')).toBeNull()
  })

  it('keeps the wall-clock time over the daylight saving change in Berlin', () => {
    // Berlin goes back on Sunday 2026-10-25. Sunday 10:00 stays 10:00 on the wall.
    const t = weekly('2026-10-04T10:00', [0])
    const before = epochOfLocal(berlin, '2026-10-18T10:00')!
    const next = nextRun(t, before, berlin)!
    expect(localOf(berlin, next)).toBe('2026-10-25T10:00')
    expect(next - before).toBe((7 * 24 + 1) * 3_600_000)
  })
})

describe('monthly', () => {
  const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  it('fires on the chosen days of the chosen months', () => {
    const t = monthly('2026-01-01T07:00', [1, 15], [3, 9])
    expect(nextLocal(t, '2026-01-01T00:00')).toBe('2026-03-01T07:00')
    expect(nextLocal(t, '2026-03-01T07:00')).toBe('2026-03-15T07:00')
    expect(nextLocal(t, '2026-03-15T07:00')).toBe('2026-09-01T07:00')
    expect(nextLocal(t, '2026-09-15T07:00')).toBe('2027-03-01T07:00')
  })

  it('skips a day that the month does not have', () => {
    // Day 31 runs in January, March, May, July, August, October and December only.
    const t = monthly('2026-01-01T07:00', [31], all)
    expect(nextLocal(t, '2026-01-31T07:00')).toBe('2026-03-31T07:00')
    expect(nextLocal(t, '2026-03-31T07:00')).toBe('2026-05-31T07:00')
    expect(nextLocal(t, '2026-08-31T07:00')).toBe('2026-10-31T07:00')
    expect(nextLocal(t, '2026-10-31T07:00')).toBe('2026-12-31T07:00')
  })

  it('runs day 30 in February never, day 29 only in leap years', () => {
    const feb = [2]
    expect(nextLocal(monthly('2026-01-01T07:00', [30], feb), '2026-01-01T00:00')).toBeNull()
    expect(nextLocal(monthly('2026-01-01T07:00', [29], feb), '2026-01-01T00:00')).toBe('2028-02-29T07:00')
    // 2100 is not a leap year: from 2096 the next 29 February is 2104.
    expect(nextLocal(monthly('2096-03-01T07:00', [29], feb), '2096-03-01T07:00')).toBe('2104-02-29T07:00')
  })

  it('runs on the last day of each month with lastDay', () => {
    const t = monthly('2026-01-01T07:00', [], all, true)
    expect(nextLocal(t, '2026-01-01T00:00')).toBe('2026-01-31T07:00')
    expect(nextLocal(t, '2026-01-31T07:00')).toBe('2026-02-28T07:00')
    expect(nextLocal(t, '2028-01-31T07:00')).toBe('2028-02-29T07:00')
    expect(nextLocal(t, '2026-04-30T07:00')).toBe('2026-05-31T07:00')
  })

  it('does not run twice in a month when day 28 and the last day are the same', () => {
    const t = monthly('2026-01-01T07:00', [28], [2], true)
    expect(nextLocal(t, '2026-02-28T06:00')).toBe('2026-02-28T07:00')
    expect(nextLocal(t, '2026-02-28T07:00')).toBe('2027-02-28T07:00')
  })

  it('does not fire before the start day of the month', () => {
    const t = monthly('2026-11-17T07:00', [1, 20])
    expect(nextLocal(t, '2026-01-01T00:00')).toBe('2026-11-20T07:00')
    expect(nextLocal(t, '2026-11-20T07:00')).toBe('2026-12-01T07:00')
  })

  it('never fires without a month or a day', () => {
    expect(nextLocal(monthly('2026-01-01T07:00', [1], []), '2026-01-01T00:00')).toBeNull()
    expect(nextLocal(monthly('2026-01-01T07:00', [], all), '2026-01-01T00:00')).toBeNull()
  })

  it('runs on a day that the spring gap hides just after the gap', () => {
    const t = monthly('2026-01-01T02:30', [8], [3])
    expect(nextLocal(t, '2026-03-01T00:00', newYork)).toBe('2026-03-08T03:30')
  })
})

describe('start-up and sets of triggers', () => {
  it('has no time of its own', () => {
    expect(nextRun({ kind: 'startup', enabled: true, delayMinutes: 5 }, 0, utc)).toBeNull()
  })

  it('takes the earliest enabled trigger', () => {
    const a = daily('2026-11-17T09:00')
    const b = once('2026-11-17T08:00')
    const off: TriggerDto = { ...once('2026-11-17T07:00'), enabled: false }
    const from = epochOfLocal(utc, '2026-11-17T06:00')!
    expect(localOf(utc, nextRunOfTriggers([a, b, off], from, utc)!)).toBe('2026-11-17T08:00')
    expect(nextRunOfTriggers([off], from, utc)).toBeNull()
    expect(nextRunOfTriggers([], from, utc)).toBeNull()
  })
})

describe('describing triggers', () => {
  it('writes one plain sentence for each kind', () => {
    expect(describeTrigger(once('2026-11-17T09:00'))).toBe('At 9:00 AM on 11/17/2026')
    expect(describeTrigger(daily('2026-11-17T13:05'))).toBe('At 1:05 PM every day')
    expect(describeTrigger(daily('2026-11-17T00:00', 3))).toBe('At 12:00 AM every 3 days')
    expect(describeTrigger(weekly('2026-11-17T08:30', [5, 1]))).toBe('At 8:30 AM on Monday and Friday, every week')
    expect(describeTrigger(weekly('2026-11-17T08:30', [1, 3, 5], 2))).toBe('At 8:30 AM on Monday, Wednesday and Friday, every 2 weeks')
    expect(describeTrigger(monthly('2026-11-17T08:30', [1, 15], [1, 7]))).toBe('At 8:30 AM on the 1st and 15th of January and July')
    expect(describeTrigger(monthly('2026-11-17T08:30', [2, 3, 11, 22], undefined, true))).toBe('At 8:30 AM on the 2nd, 3rd, 11th, 22nd and last day every month')
    expect(describeTrigger({ kind: 'startup', enabled: true, delayMinutes: 0 })).toBe('At AgentXP startup')
    expect(describeTrigger({ kind: 'startup', enabled: true, delayMinutes: 1 })).toBe('At AgentXP startup, after a delay of 1 minute')
  })
})

describe('new and invalid triggers', () => {
  const start = '2026-11-17T09:00' // a Tuesday

  it('starts each kind with usable values', () => {
    for (const kind of ['once', 'daily', 'weekly', 'monthly', 'startup'] as const) expect(triggerProblem(newTrigger(kind, start))).toBeNull()
    expect(newTrigger('weekly', start)).toMatchObject({ daysOfWeek: [2] })
    expect(newTrigger('monthly', '2026-11-31T09:00')).toMatchObject({ daysOfMonth: [1] })
    expect(newTrigger('monthly', '2026-11-30T09:00')).toMatchObject({ daysOfMonth: [28] })
  })

  it('says what is wrong', () => {
    expect(triggerProblem({ ...once(start), startAt: 'soon' })).toMatch(/start date/)
    expect(triggerProblem(once(start, '2026-11-17T08:00'))).toMatch(/expire after/)
    expect(triggerProblem({ ...daily(start), everyDays: 0 })).toMatch(/1 to 365/)
    expect(triggerProblem({ ...weekly(start, []), daysOfWeek: [] })).toMatch(/day of the week/)
    expect(triggerProblem({ ...weekly(start, [1]), everyWeeks: 60 })).toMatch(/1 to 52/)
    expect(triggerProblem(monthly(start, [1], []))).toMatch(/month/)
    expect(triggerProblem(monthly(start, []))).toMatch(/day of the month/)
    expect(triggerProblem({ kind: 'startup', enabled: true, delayMinutes: -1 })).toMatch(/delay/)
  })
})
