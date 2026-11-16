import { describe, expect, it } from 'vitest'
import { CANCELLED_TEXT, END_PROGRAM_LINE, stopNoticeLines } from './stopNotice'

describe('stopNoticeLines (UX-200)', () => {
  it('says one thing after the user stopped the reply, and where to end the program while it runs', () => {
    expect(stopNoticeLines('cancelled')).toEqual([CANCELLED_TEXT, END_PROGRAM_LINE])
    expect(CANCELLED_TEXT).toBe('You stopped this reply. The agent waits for your next message.')
    expect(END_PROGRAM_LINE).toBe('To end the agent program, use File > End the agent program.')
  })
  it('adds no second line when the agent program is not running', () => {
    expect(stopNoticeLines('cancelled', false)).toEqual([CANCELLED_TEXT])
  })
  it('keeps the sentence of any other reason', () => {
    expect(stopNoticeLines('refusal')).toEqual(['The agent declined to continue.'])
  })
  it('never mixes the three ways of stopping in one notice', () => {
    expect(stopNoticeLines('cancelled').join(' ')).not.toMatch(/Pause all agents|Task Manager|Processes/)
  })
})
