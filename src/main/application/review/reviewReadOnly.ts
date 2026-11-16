import type { ToolKind } from '@shared/models'
import type { PermissionDecision, PermissionPrompt, PermissionPrompter } from '../../domain/agent/PermissionPrompter'
import { ToolRefusedError, type ToolGate, type ToolGateRequest } from '../../domain/agent/ToolGate'

/** What the reviewer is told when it asks for something that changes files. */
export const NOT_ALLOWED_IN_REVIEW = 'Not allowed during a review.'

/** Tool groups a reviewer may not use: every one that writes, runs commands or changes the desktop's apps. */
const REFUSED_GROUPS: ReadonlySet<ToolGateRequest['group']> = new Set(['fs.write', 'terminal', 'notepad', 'wordpad', 'paint', 'notes', 'recycle'])

/** Agent tool kinds that change something. */
const WRITING_KINDS: ReadonlySet<ToolKind> = new Set(['edit', 'delete', 'move', 'execute'])

/** A gate for the reviewer session: reads and the `review_*` tools pass, everything that writes is refused without asking the user. */
export function readOnlyGate(inner: ToolGate): ToolGate {
  return {
    check: (acpSessionId, request) => (REFUSED_GROUPS.has(request.group) ? Promise.reject(new ToolRefusedError(NOT_ALLOWED_IN_REVIEW)) : inner.check(acpSessionId, request))
  }
}

/**
 * A prompter for the reviewer session: a permission request for a writing tool is answered "reject" at once (and
 * `onRefused` shows why in the chat); other requests go to the user as usual.
 */
export function readOnlyPrompter(inner: PermissionPrompter, onRefused: (request: PermissionPrompt) => void): PermissionPrompter {
  return {
    prompt(request: PermissionPrompt): Promise<PermissionDecision> {
      const kind = request.toolCall.toolKind
      if (kind === undefined || !WRITING_KINDS.has(kind)) return inner.prompt(request)
      onRefused(request)
      const reject = request.options.find((o) => o.kind === 'reject_once') ?? request.options.find((o) => o.kind === 'reject_always')
      return Promise.resolve(reject ? { outcome: 'selected', optionId: reject.optionId } : { outcome: 'cancelled' })
    }
  }
}
