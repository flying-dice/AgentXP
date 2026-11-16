import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KeyedDebouncer } from './debounce'

describe('KeyedDebouncer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs the latest value once after the delay', () => {
    const run = vi.fn()
    const d = new KeyedDebouncer<number, string>(300, run)
    d.push(1, 'a')
    vi.advanceTimersByTime(200)
    d.push(1, 'b')
    vi.advanceTimersByTime(200)
    expect(run).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(run).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenCalledWith(1, 'b')
  })
  it('debounces each key independently', () => {
    const run = vi.fn()
    const d = new KeyedDebouncer<number, string>(300, run)
    d.push(1, 'a')
    d.push(2, 'b')
    vi.advanceTimersByTime(300)
    expect(run).toHaveBeenCalledTimes(2)
  })
  it('flush runs now and cancel drops', () => {
    const run = vi.fn()
    const d = new KeyedDebouncer<number, string>(300, run)
    d.push(1, 'a')
    d.flush(1)
    expect(run).toHaveBeenCalledWith(1, 'a')
    d.push(2, 'b')
    d.cancel(2)
    vi.advanceTimersByTime(1000)
    expect(run).toHaveBeenCalledTimes(1)
  })
})
