import { describe, expect, it } from 'vitest'
import { connectionLabel, contextPercent, isBusy } from './sessionStatus'

describe('sessionStatus', () => {
  it('maps statuses to the status strip text', () => {
    expect(connectionLabel('idle')).toBe('Connected')
    expect(connectionLabel('working')).toBe('Working…')
    expect(connectionLabel('closed')).toBe('Disconnected')
    expect(connectionLabel(null)).toBe('Disconnected')
  })

  it('computes the context percentage', () => {
    expect(contextPercent(6, 100)).toBe(6)
    expect(contextPercent(10, 0)).toBe(0)
    expect(contextPercent(500, 100)).toBe(100)
  })

  it('knows busy statuses', () => {
    expect(isBusy('awaiting_permission')).toBe(true)
    expect(isBusy('idle')).toBe(false)
  })
})
