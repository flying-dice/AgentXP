import { describe, expect, it } from 'vitest'
import { NOT_RESPONDING_MS, showNotResponding } from './notResponding'

describe('showNotResponding (UX-176)', () => {
  it('shows after 20 seconds of work, not before', () => {
    expect(showNotResponding(NOT_RESPONDING_MS - 1, false)).toBe(false)
    expect(showNotResponding(NOT_RESPONDING_MS, false)).toBe(true)
  })
  it('does not show while a request waits for the user', () => {
    expect(showNotResponding(60_000, true)).toBe(false)
  })
})
