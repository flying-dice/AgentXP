import { setValue, signal } from '@a2ui/web_core/v0_9'
import { describe, expect, it, vi } from 'vitest'
import { subscribeSignal } from './signals'

describe('subscribeSignal', () => {
  it('skips the current value and reports later changes', () => {
    const s = signal(1)
    const seen = vi.fn()
    subscribeSignal(s, seen)
    expect(seen).not.toHaveBeenCalled()
    setValue(s, 2)
    setValue(s, 3)
    expect(seen.mock.calls).toEqual([[2], [3]])
  })

  it('stops reporting after unsubscribe', () => {
    const s = signal('a')
    const seen = vi.fn()
    const off = subscribeSignal(s, seen)
    off()
    setValue(s, 'b')
    expect(seen).not.toHaveBeenCalled()
  })
})
