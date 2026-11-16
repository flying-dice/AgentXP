import type { SessionStatus } from '@shared/models'

const LABELS: Record<SessionStatus, string> = {
  idle: 'Idle',
  connecting: 'Connecting',
  working: 'Working',
  awaiting_permission: 'Waiting for permission',
  error: 'Error',
  closed: 'Closed'
}

export const statusLabel = (status: SessionStatus): string => LABELS[status]

export type ConnectionLabel = 'Connected' | 'Disconnected' | 'Working…' | 'Waiting for permission'

/** The status strip's connection text for a session status. */
export function connectionLabel(status: SessionStatus | null): ConnectionLabel {
  switch (status) {
    case 'idle':
      return 'Connected'
    case 'connecting':
    case 'working':
      return 'Working…'
    case 'awaiting_permission':
      return 'Waiting for permission'
    default:
      return 'Disconnected'
  }
}

/** Context window usage in whole percent (0 when the size is unknown). */
export function contextPercent(used: number, size: number): number {
  return size > 0 ? Math.min(100, Math.round((used / size) * 100)) : 0
}

export const isBusy = (status: SessionStatus | null): boolean =>
  status === 'working' || status === 'connecting' || status === 'awaiting_permission'
