import type { PendingApproval } from './approval'
import { waitingOfText, waitingPosition } from './approval'
import { getDesktopContext } from './context'

/**
 * "1 of 2 waiting" for the request of a chat: the box in the chat says where it stands among the requests of the desktop.
 * Outside a desktop page (stories, tests) there is no queue and the text is null. Call during component initialisation;
 * the returned function reads reactive state, so call it inside `$derived`.
 */
export function useWaitingText(sessionId: () => number): () => string | null {
  let pending: () => readonly PendingApproval[]
  try {
    const { inbox } = getDesktopContext()
    pending = () => inbox.pending
  } catch {
    return () => null
  }
  return () => {
    const place = waitingPosition(pending(), sessionId())
    return place ? waitingOfText(place) : null
  }
}
