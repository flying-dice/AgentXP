import { describe, expect, it } from 'vitest'
import { CONTINUE_TEXT, RESUMED_NOTE, isContinueMessage, resumedLine, stoppedLine } from './resumeNote'

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
})
