/** What the desktop says when a chat window is closed while the agent is still working in it (UX-136). */
import type { AppView } from '@shared/desktop'
import type { SessionStatus } from '@shared/models'

export const CLOSE_CHAT_TITLE = 'The chat is closed'
export const CLOSE_CHAT_TEXT = 'The agent keeps working. Open it again from Chats on the desktop.'
export const CLOSE_CHAT_ACTION = 'Open Task Manager'

/** True while a turn runs or waits for an answer. */
const RUNNING: readonly SessionStatus[] = ['working', 'awaiting_permission']

/** True while a turn runs or waits for an answer. */
export const isTurnRunning = (status: SessionStatus | undefined): boolean => !!status && RUNNING.includes(status)

/** The balloon to show after a chat window closes, or null: the window is no chat, or its turn is not running. */
export function closeChatBalloon(view: AppView | undefined, status: SessionStatus | undefined): { title: string; text: string; action: string } | null {
  if (view?.app !== 'chat' || !isTurnRunning(status)) return null
  return { title: CLOSE_CHAT_TITLE, text: CLOSE_CHAT_TEXT, action: CLOSE_CHAT_ACTION }
}
