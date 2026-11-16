import type { DesktopRunState } from '@shared/vfs'
import type { SessionStatus } from '@shared/models'

/**
 * What the launcher shows for a desktop's agents: waiting for the user first, then busy, then failed, else idle.
 * `pendingApprovals` counts permission requests that still wait for an answer; `startFailed` is a desktop whose last
 * attempt to start an agent failed (no chat exists to carry the error).
 */
export function deriveRunState(statuses: readonly SessionStatus[], pendingApprovals: number, startFailed = false): DesktopRunState {
  if (pendingApprovals > 0 || statuses.includes('awaiting_permission')) return 'awaiting_approval'
  if (statuses.some((s) => s === 'working' || s === 'connecting')) return 'working'
  if (startFailed || statuses.includes('error')) return 'error'
  return 'idle'
}
