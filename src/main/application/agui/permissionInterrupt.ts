import type { Interrupt, ResumeEntry } from '@ag-ui/core'
import {
  PERMISSION_INTERRUPT_REASON,
  type AguiToolCallState,
  type PermissionInterruptMetadata
} from '@shared/agui-state'
import type { PermissionRequestDto } from '@shared/models'
import { AppError } from '../errors'

/** The AG-UI interrupt for an open permission request (the interrupt id is the request id). */
export function permissionInterrupt(request: PermissionRequestDto, toolCall: AguiToolCallState | undefined): Interrupt {
  const title = toolCall?.title || request.toolCallId
  const metadata: PermissionInterruptMetadata = {
    requestId: request.id,
    title,
    toolKind: toolCall?.kind ?? null,
    options: request.options
  }
  return {
    id: String(request.id),
    reason: PERMISSION_INTERRUPT_REASON,
    message: `Allow "${title}"?`,
    toolCallId: request.toolCallId,
    responseSchema: {
      type: 'object',
      required: ['optionId'],
      properties: { optionId: { type: 'string', enum: request.options.map((o) => o.optionId) } }
    },
    metadata: { ...metadata }
  }
}

/** The broker answer of a resume entry: the chosen option id, or null (dismissed) when cancelled. */
export function resumeOptionId(entry: ResumeEntry): string | null {
  if (entry.status === 'cancelled') return null
  const payload: unknown = entry.payload
  const optionId = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>)['optionId'] : undefined
  if (typeof optionId !== 'string') throw new AppError(`Resume entry for interrupt ${entry.interruptId} has no optionId`)
  return optionId
}
