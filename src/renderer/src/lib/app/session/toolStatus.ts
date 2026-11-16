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

/** What the card says under a failed step, in plain words; the link "Show in Event Viewer" follows it. */
export const FAILED_NOTE = 'The agent could not finish this step.'
export const SHOW_EVENT_LABEL = 'Show in Event Viewer'

/** Every failed step offers the link to its event; a denied or cancelled one does not (nothing went wrong). */
export const offersEventLink = (kind: ToolStatusKind): boolean => kind === 'failed'

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
