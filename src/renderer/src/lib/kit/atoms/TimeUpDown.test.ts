import { describe, expect, it } from 'vitest'
import { clampMinutes, formatTime, parseTime, segmentAt, segmentRange, splitMinutes, stepTime } from './TimeUpDown'

describe('formatTime', () => {
  it('shows a 12-hour clock with AM and PM', () => {
    expect(formatTime(0)).toBe('12:00 AM')
    expect(formatTime(9 * 60)).toBe('9:00 AM')
    expect(formatTime(12 * 60 + 5)).toBe('12:05 PM')
    expect(formatTime(23 * 60 + 59)).toBe('11:59 PM')
  })
  it('keeps the value inside the day', () => {
    expect(formatTime(-5)).toBe('12:00 AM')
    expect(formatTime(5000)).toBe('11:59 PM')
    expect(clampMinutes(30.4)).toBe(30)
  })
})

describe('parseTime', () => {
  it('reads 12-hour times with a period', () => {
    expect(parseTime('9:30 AM')).toBe(570)
    expect(parseTime('9:30am')).toBe(570)
    expect(parseTime('12 am')).toBe(0)
    expect(parseTime('12:15 PM')).toBe(12 * 60 + 15)
    expect(parseTime('11 p.m.')).toBe(23 * 60)
  })
  it('reads 24-hour times and plain digits', () => {
    expect(parseTime('21:15')).toBe(21 * 60 + 15)
    expect(parseTime('0915')).toBe(9 * 60 + 15)
    expect(parseTime('930')).toBe(9 * 60 + 30)
    expect(parseTime('7')).toBe(420)
  })
  it('refuses what is not a time', () => {
    for (const text of ['', 'noon', '25:00', '9:75', '13 pm', '0 am', '9:3']) expect(parseTime(text), text).toBeNull()
  })
})

describe('segments', () => {
  it('finds the segment of the caret and its range', () => {
    const text = '9:30 AM'
    expect(segmentAt(text, 0)).toBe('hour')
    expect(segmentAt(text, 1)).toBe('hour')
    expect(segmentAt(text, 3)).toBe('minute')
    expect(segmentAt(text, 4)).toBe('minute')
    expect(segmentAt(text, 6)).toBe('period')
    expect(segmentAt('nonsense', 3)).toBe('hour')
    expect(segmentRange(text, 'hour')).toEqual([0, 1])
    expect(segmentRange(text, 'minute')).toEqual([2, 4])
    expect(segmentRange(text, 'period')).toEqual([5, 7])
  })
})

describe('stepTime', () => {
  it('cycles the hours inside AM and inside PM', () => {
    expect(stepTime(11 * 60 + 30, 'hour', 1)).toBe(30) // 11:30 AM -> 12:30 AM
    expect(stepTime(30, 'hour', 1)).toBe(60 + 30) // 12:30 AM -> 1:30 AM
    expect(stepTime(60 + 30, 'hour', -1)).toBe(30)
    expect(stepTime(30, 'hour', -1)).toBe(11 * 60 + 30)
    expect(stepTime(23 * 60, 'hour', 1)).toBe(12 * 60) // 11 PM -> 12 PM
  })
  it('cycles the minutes inside the hour', () => {
    expect(stepTime(9 * 60 + 59, 'minute', 1)).toBe(9 * 60)
    expect(stepTime(9 * 60, 'minute', -1)).toBe(9 * 60 + 59)
    expect(stepTime(9 * 60, 'minute', 1, 15)).toBe(9 * 60 + 15)
  })
  it('moves the time by 12 hours with the period', () => {
    expect(stepTime(9 * 60, 'period', 1)).toBe(21 * 60)
    expect(stepTime(21 * 60, 'period', -1)).toBe(9 * 60)
  })
  it('splits a time of day', () => {
    expect(splitMinutes(21 * 60 + 5)).toEqual({ hour: 21, minute: 5 })
  })
})
