import type { SessionStatus } from '@shared/models'

const LABELS: Record<SessionStatus, string> = {
  idle: 'Idle',
  connecting: 'Connecting',
  working: 'Working',
  awaiting_permission: 'Waiting for permission',
  error: 'Error',
  closed: 'Closed'
}

/**
 * The status a chat shows. The status inside the AG-UI state is only kept fresh while a turn streams, so a "connecting"
 * or "error" seen there can be old (the agent started in the background and the state was read before it was ready).
 * For those the session row, which follows `session.changed`, is the truth.
 */
export function effectiveStatus(inState: SessionStatus | null | undefined, inRow: SessionStatus | null | undefined): SessionStatus | null {
  if (inState && inState !== 'closed' && inState !== 'connecting' && inState !== 'error') return inState
  return inRow ?? (inState && inState !== 'closed' ? inState : null)
}

export const statusLabel = (status: SessionStatus): string => LABELS[status]

export type ConnectionLabel = 'Ready' | 'Connecting…' | 'Connected' | 'Working…' | 'Waiting for permission' | 'Disconnected'

/**
 * The status strip's connection text for a session status. "Ready" until there is a session (nothing has failed yet),
 * "Connecting…" while its agent starts, "Disconnected" only after a failure (`error`). A chat whose agent went away
 * while idle (`closed`) is "Ready": the next message starts the agent again.
 */
export function connectionLabel(status: SessionStatus | null): ConnectionLabel {
  switch (status) {
    case 'idle':
      return 'Connected'
    case 'connecting':
      return 'Connecting…'
    case 'working':
      return 'Working…'
    case 'awaiting_permission':
      return 'Waiting for permission'
    case 'error':
      return 'Disconnected'
    default:
      return 'Ready'
  }
}

/** True after a failure: the agent stopped or could not start, and "Reconnect" makes sense. */
export const isDisconnected = (status: SessionStatus | null): boolean => status === 'error'

/** The agent program is starting: the chat takes typing, a sent message waits for it. */
export const isStarting = (status: SessionStatus | null): boolean => status === 'connecting'

/** Context window usage in whole percent (0 when the size is unknown). */
export function contextPercent(used: number, size: number): number {
  return size > 0 ? Math.min(100, Math.round((used / size) * 100)) : 0
}

export const isBusy = (status: SessionStatus | null): boolean =>
  status === 'working' || status === 'connecting' || status === 'awaiting_permission'
