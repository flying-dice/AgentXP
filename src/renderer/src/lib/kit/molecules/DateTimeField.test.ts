import { describe, expect, it } from 'vitest'
import { joinLocal, splitLocal } from './DateTimeField'

describe('splitLocal and joinLocal', () => {
  it('round-trips a wall-clock text', () => {
    const parts = splitLocal('2026-11-17T09:30')
    expect(parts?.minutes).toBe(570)
    expect(parts && [parts.date.getFullYear(), parts.date.getMonth(), parts.date.getDate()]).toEqual([2026, 10, 17])
    expect(parts && joinLocal(parts.date, parts.minutes)).toBe('2026-11-17T09:30')
  })
  it('refuses text that is not a date and time', () => {
    for (const text of ['', '2026-11-17', '2026-02-30T10:00', '2026-11-17T24:00', '2026-11-17T09:60', '17/11/2026 09:30']) expect(splitLocal(text), text).toBeNull()
  })
  it('pads years and numbers', () => {
    expect(joinLocal(new Date(2026, 0, 5), 5)).toBe('2026-01-05T00:05')
  })
})
