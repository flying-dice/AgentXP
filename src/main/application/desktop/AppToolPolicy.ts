import { closedAppMessage, isWindowToolGroup, type DesktopState, type PolicyDecision, type ToolGroup, type ToolPolicyDto } from '@shared/desktop'
import type { GatedToolGroup } from '../../domain/agent/ToolGate'

export const PAUSED_MESSAGE = 'AgentXP is paused by the user.'

export type ToolAccess =
  | { kind: 'allow' }
  /** The user must approve this call. `reason` is shown with the request. */
  | { kind: 'ask'; reason: string }
  | { kind: 'refuse'; message: string }

const GROUP_LABELS: Record<GatedToolGroup, string> = {
  'fs.read': 'Reading files',
  'fs.write': 'Writing files',
  notepad: 'Notepad tools',
  code: 'Code tools',
  terminal: 'Running commands',
  browser: 'Browser tools',
  paint: 'Agent Paint tools',
  wordpad: 'WordPad tools',
  notes: 'Sticky Notes tools',
  events: 'Event Viewer tools',
  snip: 'Screen capture',
  recycle: 'Recycle Bin tools',
  board: 'Kanban board tools',
  diagrams: 'Agent Diagrams tools',
  review: 'Code review tools',
  scheduler: 'Task Scheduler tools',
  teams: 'Teams tools',
  rooms: 'Team chat tools',
  settings: 'Control Center tools',
  taskmgr: 'Task Manager tools',
  help: 'Help tools'
}

export const groupLabel = (group: GatedToolGroup): string => GROUP_LABELS[group]

/** The decision the Control Center stored for a group (`deny` / `ask` / `allow`). */
export const decisionFor = (policy: ToolPolicyDto, group: ToolGroup): PolicyDecision =>
  group === 'shell' ? 'allow' : policy.groups[group]

/**
 * AppToolPolicy, call side: may the agent of this desktop use a tool of `group` right now?
 * Order: paused, output app closed (only for tools that need its window), policy deny, then approval (policy ask or
 * user in control). Pure: no I/O. (Which groups are enabled is `enabledToolGroups` in shared.)
 */
export function evaluateToolAccess(input: {
  state: Pick<DesktopState, 'tools' | 'paused' | 'userInControl'>
  group: GatedToolGroup
  policy: ToolPolicyDto
}): ToolAccess {
  const { state, group, policy } = input
  if (state.paused) return { kind: 'refuse', message: PAUSED_MESSAGE }
  if (isWindowToolGroup(group) && !state.tools.includes(group)) return { kind: 'refuse', message: closedAppMessage(group) }
  const decision = decisionFor(policy, group)
  if (decision === 'deny') return { kind: 'refuse', message: `${groupLabel(group)} is blocked by the permission policy in Control Center.` }
  if (decision === 'ask') return { kind: 'ask', reason: `${groupLabel(group)} is set to Ask in Control Center` }
  if (state.userInControl) return { kind: 'ask', reason: 'You are in control of this desktop' }
  return { kind: 'allow' }
}
