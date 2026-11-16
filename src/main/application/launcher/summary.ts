import type { DesktopRunState } from '@shared/vfs'
import type { SessionStatus } from '@shared/models'

/**
 * What the launcher shows for a desktop's agents: waiting for the user first, then busy, then failed, else idle.
 * `pendingApprovals` counts permission requests that still wait for an answer.
 */
export function deriveRunState(statuses: readonly SessionStatus[], pendingApprovals: number): DesktopRunState {
  if (pendingApprovals > 0 || statuses.includes('awaiting_permission')) return 'awaiting_approval'
  if (statuses.some((s) => s === 'working' || s === 'connecting')) return 'working'
  if (statuses.includes('error')) return 'error'
  return 'idle'
}
