import type { Id, PermissionOptionDto, PermissionRequestDto } from '@shared/models'

export interface PermissionRepository {
  /** Opens a pending request for an existing tool call entry (by ACP tool call id). */
  create(sessionId: Id, toolCallId: string, options: PermissionOptionDto[]): PermissionRequestDto
  get(id: Id): PermissionRequestDto | null
  listPending(sessionId?: Id): PermissionRequestDto[]
  /** `optionId` null means cancelled. Returns null when missing or the option is unknown. */
  resolve(id: Id, optionId: string | null): PermissionRequestDto | null
  /** Marks every pending request of the session as cancelled (e.g. on prompt cancel). */
  cancelPending(sessionId: Id): number
}
