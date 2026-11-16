import { describe, expect, it } from 'vitest'
import { formatIsoDate, parseIsoDate } from './dates'

describe('dates', () => {
  it('parses date-only strings as local dates', () => {
    const d = parseIsoDate('2026-11-16')!
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 16])
  })
  it('rejects garbage', () => expect(parseIsoDate('nope')).toBeUndefined())
  it('keeps the shape of the previous value', () => {
    const d = new Date(2026, 0, 5)
    expect(formatIsoDate(d, '2025-01-01')).toBe('2026-01-05')
    expect(formatIsoDate(d, '2025-01-01T10:00:00Z')).toBe(d.toISOString())
  })
})
