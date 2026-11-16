import type { ToolCallStatus } from '@shared/models'

export type ToolStatusKind = 'running' | 'done' | 'waiting' | 'failed' | 'cancelled'

export interface ToolStatusView {
  kind: ToolStatusKind
  label: string
}

const LABELS: Record<ToolStatusKind, string> = {
  running: 'Running…',
  done: 'Done',
  waiting: 'Waiting for permission',
  failed: 'Failed',
  cancelled: 'Cancelled'
}

/** Maps an ACP tool call status (undefined while the shared state has not caught up) to the card's status. */
export function toolStatusView(status: ToolCallStatus | undefined, waitingForPermission = false): ToolStatusView {
  const kind: ToolStatusKind = waitingForPermission
    ? 'waiting'
    : status === 'completed'
      ? 'done'
      : status === 'failed'
        ? 'failed'
        : status === 'cancelled'
          ? 'cancelled'
          : 'running'
  return { kind, label: LABELS[kind] }
}
