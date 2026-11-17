/** Pure helpers behind the Action Center and the UAC-style approval dialog. */
import type { Interrupt } from '@ag-ui/core'
import type { AguiSessionState, AguiToolCallState } from '@shared/agui-state'
import type { PermissionOptionDto, ToolKind } from '@shared/models'
import type { PolicyDecision, ToolGroup, ToolPolicyDto } from '@shared/desktop'
import { PERMISSION_NAMES } from '@shared/permissionNames'
import { permissionMetadata } from '../app/session/permissionOptions'
import { approvalTitle, toolLabel, toolPredicate, type ToolTitleInput } from '../app/session/toolTitles'

export interface PendingApproval {
  /** `<sessionId>:<interruptId>`, unique across the desktop. */
  key: string
  sessionId: number
  interruptId: string
  chatTitle: string
  /** The team chat room when a member of one asks (`chatTitle` is then the member's name); null for a chat. */
  room: string | null
  title: string
  toolKind: ToolKind | null
  options: PermissionOptionDto[]
  toolCall?: AguiToolCallState
}

/** Builds the pending approval of an interrupt, or null when it is not a tool permission request. */
export function approvalFromInterrupt(sessionId: number, interrupt: Interrupt | null, state: AguiSessionState | null, room: string | null = null): PendingApproval | null {
  if (!interrupt) return null
  const meta = permissionMetadata(interrupt.metadata)
  if (!meta) return null
  return {
    key: `${sessionId}:${interrupt.id}`,
    sessionId,
    interruptId: interrupt.id,
    chatTitle: state?.session.title || 'New chat',
    room,
    title: meta.title,
    toolKind: meta.toolKind,
    options: meta.options,
    toolCall: interrupt.toolCallId ? state?.toolCalls[interrupt.toolCallId] : undefined
  }
}

/** The file a request works on: the path of its diff, else its first location. */
export function approvalPath(approval: Pick<PendingApproval, 'toolCall'>): string | null {
  const calls = approval.toolCall
  const diff = calls?.contents.find((c) => c.kind === 'diff')
  return (diff?.kind === 'diff' ? diff.path : calls?.locations[0]?.path) ?? null
}

const titleInput = (approval: PendingApproval): ToolTitleInput => ({ title: approval.title, toolKind: approval.toolKind, path: approvalPath(approval) })

/** "Allow the agent to change src/auth/redirect.ts?" ("Allow Tester to ..." for a room member): no tool name, command or JSON. */
export const approvalQuestion = (approval: PendingApproval): string => approvalTitle(titleInput(approval), approval.room ? approval.chatTitle : 'the agent')

/** "Change src/auth/redirect.ts": the first line of an Action Center row. */
export const approvalLabel = (approval: PendingApproval): string => toolLabel(titleInput(approval))

const SHORT_TITLE = 28

const shortTitle = (chatTitle: string): string => (chatTitle.length > SHORT_TITLE ? `${chatTitle.slice(0, SHORT_TITLE).trimEnd()}...` : chatTitle)

/** "In chat 'Fix the login redirect bug...' (started 10:42)": the second line of an Action Center row. */
export function approvalOrigin(chatTitle: string, startedAt?: string, room: string | null = null): string {
  const title = shortTitle(chatTitle)
  if (room) return `${title} in the room '${shortTitle(room)}'`
  const date = startedAt ? new Date(startedAt) : null
  const time = date && !Number.isNaN(date.getTime()) ? ` (started ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')})` : ''
  return `In chat '${title}'${time}`
}

/** What each choice does, as the second line of its command link. */
export function optionDescription(kind: PermissionOptionDto['kind']): string {
  switch (kind) {
    case 'allow_once':
      return 'The agent goes ahead, then keeps working.'
    case 'allow_always':
      return 'The agent goes ahead and does not ask again for this kind of action.'
    case 'reject_once':
      return 'Nothing changes. You can tell the agent what to do instead.'
    case 'reject_always':
      return 'Nothing changes. The agent cannot do this kind of action.'
  }
}

const KIND_GROUP: Partial<Record<ToolKind, Exclude<ToolGroup, 'shell'>>> = {
  read: 'fs.read',
  search: 'fs.read',
  edit: 'fs.write',
  delete: 'fs.write',
  move: 'fs.write',
  execute: 'terminal',
  fetch: 'browser'
}

export const approvalGroup = (kind: ToolKind | null): Exclude<ToolGroup, 'shell'> | null => (kind ? (KIND_GROUP[kind] ?? null) : null)

/** The reason line of the UAC dialog (shown after "Reason:"): the policy that caused the question when it is known. */
export function approvalReason(kind: ToolKind | null, policy: ToolPolicyDto | null, userInControl: boolean): string {
  if (userInControl) return 'Ask before every action is on, so every action needs your approval.'
  const group = approvalGroup(kind)
  const decision: PolicyDecision | undefined = group && policy ? policy.groups[group] : undefined
  if (group && decision === 'ask') return `${PERMISSION_NAMES[group]} is set to Ask in Control Center.`
  return 'The agent asked for your permission.'
}

// ---- the queue of waiting requests (UX-138) ---------------------------------------------------------------------

/** The requests in the order the user answers them: the oldest first (`pending` lists the newest chat first). */
export const oldestFirst = (pending: readonly PendingApproval[]): PendingApproval[] => [...pending].reverse()

/** The request the "waiting" link opens: the oldest one, or null when nothing waits. */
export const nextApproval = (pending: readonly PendingApproval[]): PendingApproval | null => pending.at(-1) ?? null

/** Where the request of a chat stands among the waiting ones, or null when that chat has none or it is the only one. */
export function waitingPosition(pending: readonly PendingApproval[], sessionId: number): { position: number; total: number } | null {
  const queue = oldestFirst(pending)
  const at = queue.findIndex((a) => a.sessionId === sessionId)
  return at < 0 || queue.length < 2 ? null : { position: at + 1, total: queue.length }
}

/** "1 of 2 waiting": the line in the approval box when more than one request waits. */
export const waitingOfText = ({ position, total }: { position: number; total: number }): string => `${position} of ${total} waiting`

/**
 * The words of the "waiting" link of the top bar, with the chat named: "Fix login redirect is waiting: run a command",
 * and "(1 of 2 waiting)" after it when more than one request waits. Null when nothing waits.
 */
export function waitingLinkText(pending: readonly PendingApproval[]): string | null {
  const next = nextApproval(pending)
  if (!next) return null
  const line = `${shortTitle(next.chatTitle)} is waiting: ${toolPredicate(titleInput(next))}`
  return pending.length > 1 ? `${line} (${waitingOfText({ position: 1, total: pending.length })})` : line
}
