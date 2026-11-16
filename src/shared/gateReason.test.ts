import { describe, expect, it } from 'vitest'
import { gateRawInput, gateReasonOf } from './gateReason'

describe('gate reason', () => {
  it('round-trips as a sentence', () => {
    expect(gateReasonOf(gateRawInput('Run commands is set to Ask in Control Center'))).toBe('Run commands is set to Ask in Control Center.')
  })
  it('is null for requests of the agent and for bad input', () => {
    expect(gateReasonOf(JSON.stringify({ command: 'npm test' }))).toBeNull()
    expect(gateReasonOf('not json')).toBeNull()
    expect(gateReasonOf(null)).toBeNull()
  })
})
