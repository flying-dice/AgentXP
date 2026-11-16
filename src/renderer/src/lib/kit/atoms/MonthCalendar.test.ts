import { describe, expect, it } from 'vitest'
import {
  addMonths,
  buildMonthGrid,
  clampDate,
  daysInMonth,
  formatLongDate,
  formatShortDate,
  formatTime,
  isSameDay,
  weekdayHeaders,
  yearBlockStart
} from './MonthCalendar'

describe('MonthCalendar helpers', () => {
  it('counts days in month including leap years', () => {
    expect(daysInMonth(2024, 1)).toBe(29)
    expect(daysInMonth(2025, 1)).toBe(28)
    expect(daysInMonth(2026, 10)).toBe(30)
  })

  it('builds a 42-cell grid starting on the configured weekday', () => {
    const grid = buildMonthGrid(2026, 10, 0) // Nov 2026 starts on Sunday
    expect(grid).toHaveLength(42)
    expect(grid[0].date.getDate()).toBe(1)
    expect(grid[0].inMonth).toBe(true)
    const monday = buildMonthGrid(2026, 10, 1)
    expect(monday[0].date.getDate()).toBe(26) // trailing Oct days
    expect(monday[0].inMonth).toBe(false)
    expect(monday.filter((c) => c.inMonth)).toHaveLength(30)
  })

  it('clamps the day when adding months', () => {
    expect(addMonths(new Date(2026, 0, 31), 1).getDate()).toBe(28)
    expect(addMonths(new Date(2026, 11, 15), 1).getFullYear()).toBe(2027)
    expect(addMonths(new Date(2026, 0, 15), -1).getMonth()).toBe(11)
  })

  it('compares days ignoring time', () => {
    expect(isSameDay(new Date(2026, 1, 1, 3), new Date(2026, 1, 1, 22))).toBe(true)
    expect(isSameDay(new Date(2026, 1, 1), null)).toBe(false)
  })

  it('formats dates', () => {
    const d = new Date(2026, 10, 6, 7, 5, 9)
    expect(formatShortDate(d)).toBe('06/11/2026')
    expect(formatLongDate(d)).toBe('Friday, 6 November 2026')
    expect(formatTime(d)).toBe('07:05:09')
  })

  it('rotates weekday headers', () => {
    expect(weekdayHeaders(0)[0]).toBe('Su')
    expect(weekdayHeaders(1)[0]).toBe('Mo')
  })

  it('computes year blocks and clamps', () => {
    expect(yearBlockStart(2026)).toBe(2019)
    const min = new Date(2026, 0, 1)
    expect(clampDate(new Date(2025, 0, 1), min, null)).toBe(min)
  })
})
