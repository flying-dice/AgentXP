import type { ToolCallStatus } from '@shared/models'

export type ToolStatusKind = 'running' | 'done' | 'waiting' | 'failed' | 'cancelled' | 'denied'

export interface ToolStatusView {
  kind: ToolStatusKind
  label: string
}

const LABELS: Record<ToolStatusKind, string> = {
  running: 'Running…',
  done: 'Done',
  waiting: 'Waiting for permission',
  failed: 'Failed',
  cancelled: 'Cancelled',
  denied: 'Denied by you'
}

/** What the card says under a request the user denied. */
export const DENIED_NOTE = 'You denied this request, so the agent did not do it.'

/**
 * Maps an ACP tool call status (undefined while the shared state has not caught up) to the card's status. A request the
 * user denied is "Denied by you" whatever the agent reports afterwards: it is a decision, not a failure.
 */
export function toolStatusView(status: ToolCallStatus | undefined, waitingForPermission = false, denied = false): ToolStatusView {
  const kind = ((): ToolStatusKind => {
    if (waitingForPermission) return 'waiting'
    if (denied) return 'denied'
    if (status === 'completed') return 'done'
    if (status === 'failed') return 'failed'
    if (status === 'cancelled') return 'cancelled'
    return 'running'
  })()
  return { kind, label: LABELS[kind] }
}
