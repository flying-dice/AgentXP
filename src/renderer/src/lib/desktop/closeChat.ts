/** What the desktop says when a chat window is closed while the agent is still working in it (UX-136). */
import type { AppView } from '@shared/desktop'
import type { SessionStatus } from '@shared/models'

export const CLOSE_CHAT_TITLE = 'The chat is closed'
export const CLOSE_CHAT_TEXT = 'The agent keeps working. Open it again from the Task Manager.'

/** True while a turn runs or waits for an answer. */
const RUNNING: readonly SessionStatus[] = ['working', 'awaiting_permission']

/** The balloon to show after a chat window closes, or null: the window is no chat, or its turn is not running. */
export function closeChatBalloon(view: AppView | undefined, status: SessionStatus | undefined): { title: string; text: string } | null {
  if (view?.app !== 'chat' || !status || !RUNNING.includes(status)) return null
  return { title: CLOSE_CHAT_TITLE, text: CLOSE_CHAT_TEXT }
}
