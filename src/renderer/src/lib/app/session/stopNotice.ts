import { stopNoticeText } from '@shared/agui-state'

/** The notice after the user's own Stop: one thing, what the agent does now (UX-200). */
export const CANCELLED_TEXT = 'You stopped this reply. The agent waits for your next message.'

/** The second line, only while the agent program is still running: where to end it. */
export const END_PROGRAM_LINE = 'To end the agent program, use File > End the agent program.'

/**
 * The lines of a stop notice. After the user's Stop it is one sentence, plus the way to end the agent program while that program is
 * still running; any other reason keeps the sentence for that reason.
 */
export function stopNoticeLines(reason: string, programRunning = true): string[] {
  if (reason !== 'cancelled') return [stopNoticeText(reason)]
  return programRunning ? [CANCELLED_TEXT, END_PROGRAM_LINE] : [CANCELLED_TEXT]
}
