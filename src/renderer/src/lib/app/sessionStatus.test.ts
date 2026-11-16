import { describe, expect, it } from 'vitest'
import { connectionLabel, contextPercent, effectiveStatus, isBusy, isDisconnected, isStarting } from './sessionStatus'

describe('sessionStatus', () => {
  it('maps statuses to the status strip text', () => {
    expect(connectionLabel('idle')).toBe('Connected')
    expect(connectionLabel('working')).toBe('Working…')
    expect(connectionLabel('connecting')).toBe('Connecting…')
    expect(connectionLabel('awaiting_permission')).toBe('Waiting for permission')
  })

  it('says Ready before a chat exists and after an idle agent went away, Disconnected only after a failure', () => {
    expect(connectionLabel(null)).toBe('Ready')
    expect(connectionLabel('closed')).toBe('Ready')
    expect(connectionLabel('error')).toBe('Disconnected')
    expect(isDisconnected('error')).toBe(true)
    expect(isDisconnected('closed')).toBe(false)
    expect(isStarting('connecting')).toBe(true)
    expect(isStarting('idle')).toBe(false)
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

describe('effectiveStatus', () => {
  it('trusts a working or idle state, and the session row for the states that go stale', () => {
    expect(effectiveStatus('working', 'idle')).toBe('working')
    expect(effectiveStatus('idle', 'idle')).toBe('idle')
    expect(effectiveStatus('connecting', 'idle')).toBe('idle')
    expect(effectiveStatus('error', 'idle')).toBe('idle')
    expect(effectiveStatus('closed', 'closed')).toBe('closed')
  })
  it('falls back to what it has', () => {
    expect(effectiveStatus('connecting', null)).toBe('connecting')
    expect(effectiveStatus(undefined, undefined)).toBeNull()
  })
})
