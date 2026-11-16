/** Pure helpers behind the Action Center and the UAC-style approval dialog. */
import type { Interrupt } from '@ag-ui/core'
import type { AguiSessionState, AguiToolCallState } from '@shared/agui-state'
import type { PermissionOptionDto, ToolKind } from '@shared/models'
import type { PolicyDecision, ToolGroup, ToolPolicyDto } from '@shared/desktop'
import { asPredicate, permissionMetadata } from '../app/session/permissionOptions'

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

/** "Do you want to allow the agent to edit src/a.ts?" */
export const approvalQuestion = (title: string): string => `Do you want to allow the agent to ${asPredicate(title)}?`

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
  recycle: 'Restoring from the Recycle Bin'
}

export const approvalGroup = (kind: ToolKind | null): Exclude<ToolGroup, 'shell'> | null => (kind ? (KIND_GROUP[kind] ?? null) : null)

/** The reason line of the UAC dialog: the policy that caused the question when it is known, else the tool kind. */
export function approvalReason(kind: ToolKind | null, policy: ToolPolicyDto | null, userInControl: boolean): string {
  if (userInControl) return 'You are in control of this desktop, so every action needs your approval.'
  const group = approvalGroup(kind)
  const decision: PolicyDecision | undefined = group && policy ? policy.groups[group] : undefined
  if (group && decision === 'ask') return `${GROUP_ACTION[group]} is set to Ask in Control Centre.`
  return `Tool kind: ${kind ?? 'other'}.`
}
