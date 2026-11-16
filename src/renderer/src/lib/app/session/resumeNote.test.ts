import { describe, expect, it } from 'vitest'
import { AUTOMATIC_SENDER, CONTINUE_TEXT, RESUMED_NOTE, isContinueMessage, quotedRequest, resumedLine, stoppedLine } from './resumeNote'

describe('resume notes', () => {
  it('recognises the continue message, with or without surrounding space', () => {
    expect(isContinueMessage(CONTINUE_TEXT)).toBe(true)
    expect(isContinueMessage(`  ${CONTINUE_TEXT}\n`)).toBe(true)
    expect(isContinueMessage('Please continue')).toBe(false)
  })
  it('words the Action Center lines in plain words', () => {
    expect(stoppedLine('login-app')).toBe("In chat 'login-app': Paused. The step that was running was stopped. Resume agents and continue carries it on.")
    expect(resumedLine('login-app')).toBe(`In chat 'login-app': ${RESUMED_NOTE}`)
  })
  it('labels the message Resume sends as written by Agent7, not by the user', () => {
    expect(AUTOMATIC_SENDER).toBe('Agent7 (automatic)')
    expect(AUTOMATIC_SENDER).not.toMatch(/^You/)
  })
  it('quotes the request after a restart on one line, cut when long', () => {
    expect(quotedRequest('  fix the\n login   redirect ')).toBe('fix the login redirect')
    const long = quotedRequest('x'.repeat(500))
    expect(long.length).toBe(160)
    expect(long.endsWith('…')).toBe(true)
  })
})
