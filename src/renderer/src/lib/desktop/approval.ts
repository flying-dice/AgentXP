/** Pure helpers behind the Action Center and the UAC-style approval dialog. */
import type { Interrupt } from '@ag-ui/core'
import type { AguiSessionState, AguiToolCallState } from '@shared/agui-state'
import type { PermissionOptionDto, ToolKind } from '@shared/models'
import type { PolicyDecision, ToolGroup, ToolPolicyDto } from '@shared/desktop'
import { permissionMetadata } from '../app/session/permissionOptions'
import { approvalTitle, toolLabel, type ToolTitleInput } from '../app/session/toolTitles'

export interface PendingApproval {
  /** `<sessionId>:<interruptId>`, unique across the desktop. */
  key: string
  sessionId: number
  interruptId: string
  chatTitle: string
  title: string
  toolKind: ToolKind | null
  options: PermissionOptionDto[]
  toolCall?: AguiToolCallState
}

/** Builds the pending approval of an interrupt, or null when it is not a tool permission request. */
export function approvalFromInterrupt(sessionId: number, interrupt: Interrupt | null, state: AguiSessionState | null): PendingApproval | null {
  if (!interrupt) return null
  const meta = permissionMetadata(interrupt.metadata)
  if (!meta) return null
  return {
    key: `${sessionId}:${interrupt.id}`,
    sessionId,
    interruptId: interrupt.id,
    chatTitle: state?.session.title || 'New chat',
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

/** "Allow the agent to change src/auth/redirect.ts?": no tool name, command or JSON. */
export const approvalQuestion = (approval: PendingApproval): string => approvalTitle(titleInput(approval))

/** "Change src/auth/redirect.ts": the first line of an Action Center row. */
export const approvalLabel = (approval: PendingApproval): string => toolLabel(titleInput(approval))

const SHORT_TITLE = 28

/** "In chat 'Fix the login redirect bug...' (started 10:42)": the second line of an Action Center row. */
export function approvalOrigin(chatTitle: string, startedAt?: string): string {
  const title = chatTitle.length > SHORT_TITLE ? `${chatTitle.slice(0, SHORT_TITLE).trimEnd()}...` : chatTitle
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

const GROUP_ACTION: Record<Exclude<ToolGroup, 'shell'>, string> = {
  'fs.read': 'Reading files',
  'fs.write': 'Writing files',
  terminal: 'Running commands',
  browser: 'Using the browser',
  notepad: 'Using Notepad',
  code: 'Using Code',
  paint: 'Drawing in Agent Paint',
  wordpad: 'Writing in WordPad',
  notes: 'Using Sticky Notes',
  events: 'Reading the Event Viewer',
  snip: 'Capturing the screen',
  recycle: 'Restoring from the Recycle Bin',
  review: 'Reviewing code'
}

export const approvalGroup = (kind: ToolKind | null): Exclude<ToolGroup, 'shell'> | null => (kind ? (KIND_GROUP[kind] ?? null) : null)

/** The reason line of the UAC dialog (shown after "Reason:"): the policy that caused the question when it is known. */
export function approvalReason(kind: ToolKind | null, policy: ToolPolicyDto | null, userInControl: boolean): string {
  if (userInControl) return 'Ask before every action is on, so every action needs your approval.'
  const group = approvalGroup(kind)
  const decision: PolicyDecision | undefined = group && policy ? policy.groups[group] : undefined
  if (group && decision === 'ask') return `${GROUP_ACTION[group]} is set to Ask in Control Center.`
  return 'The agent asked for your permission.'
}
