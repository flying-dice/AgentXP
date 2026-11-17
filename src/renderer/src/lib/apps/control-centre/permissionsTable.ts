/** The Control Center permissions page: the policy as table rows with human names. */
import type { PolicyDecision, ToolGroup, ToolPolicyDto } from '@shared/desktop'
import { DECISION_SENTENCES, PERMISSION_HINTS, PERMISSION_NAMES } from '@shared/permissionNames'

export type PolicyKey = Exclude<ToolGroup, 'shell'> | 'openApps'

export type PermissionGroupId = 'abilities' | 'apps'

export interface PermissionRow {
  key: PolicyKey
  group: PermissionGroupId
  label: string
  description: string
  /** The longer form of the name for the tooltip ("Run commands (Terminal)"); the name itself stays the same everywhere. */
  tooltip?: string
  decision: PolicyDecision
}

/** The two blocks of the page, in order. */
export const GROUP_TITLES: Record<PermissionGroupId, string> = {
  abilities: 'What the agent may do',
  apps: 'Apps the agent may use'
}

/** One row per tool group of `TOOL_GROUPS` (the always-on `shell` group is not gated), then the app-opening rule. */
const META: { key: PolicyKey; group: PermissionGroupId; label: string; description: string; tooltip?: string }[] = [
  { key: 'fs.read', group: 'abilities', label: PERMISSION_NAMES['fs.read'], description: 'Read and list files in the project folders (Explorer, Code)' },
  { key: 'fs.write', group: 'abilities', label: PERMISSION_NAMES['fs.write'], description: 'Create and change files in any app (Notepad, Code)' },
  { key: 'terminal', group: 'abilities', label: PERMISSION_NAMES['terminal'], tooltip: PERMISSION_HINTS.terminal, description: 'Run commands and read their output' },
  { key: 'code', group: 'apps', label: PERMISSION_NAMES['code'], description: 'Open files, reveal lines and show diffs in Code' },
  { key: 'notepad', group: 'apps', label: PERMISSION_NAMES['notepad'], description: 'Open and read documents. Saving a file uses Write files.' },
  { key: 'browser', group: 'apps', label: PERMISSION_NAMES['browser'], description: 'Go to web pages, read them and click in them' },
  { key: 'paint', group: 'apps', label: PERMISSION_NAMES['paint'], description: 'Draw on, read and resize the Agent Paint canvas' },
  { key: 'wordpad', group: 'apps', label: PERMISSION_NAMES['wordpad'], description: 'Open, read and write documents in WordPad' },
  { key: 'notes', group: 'apps', label: PERMISSION_NAMES['notes'], description: 'List, add, change and remove sticky notes' },
  { key: 'events', group: 'apps', label: PERMISSION_NAMES['events'], description: 'Search the Event Viewer log of messages' },
  { key: 'snip', group: 'apps', label: PERMISSION_NAMES['snip'], description: 'Take screenshots of the desktop with the Snipping Tool' },
  { key: 'recycle', group: 'apps', label: PERMISSION_NAMES['recycle'], description: 'List and restore deleted items' },
  { key: 'diagrams', group: 'apps', label: PERMISSION_NAMES['diagrams'], description: 'Draw, change, read and export diagrams in the Agent Diagrams window' },
  { key: 'board', group: 'apps', label: PERMISSION_NAMES['board'], description: 'Read and write Kanban boards, even while the Kanban window is closed' },
  { key: 'review', group: 'apps', label: PERMISSION_NAMES['review'], description: 'Comment on changes and give a verdict in a Code Review window' },
  { key: 'scheduler', group: 'apps', label: PERMISSION_NAMES['scheduler'], description: 'List, create, change, run and end scheduled tasks' },
  { key: 'teams', group: 'apps', label: PERMISSION_NAMES['teams'], description: 'List, create, change and remove profiles and teams' },
  { key: 'rooms', group: 'apps', label: PERMISSION_NAMES['rooms'], description: 'Open, read and post in team chat rooms' },
  { key: 'settings', group: 'apps', label: PERMISSION_NAMES['settings'], description: 'Read the settings. A change to permissions, agents, skills or MCP servers always asks you.' },
  { key: 'taskmgr', group: 'apps', label: PERMISSION_NAMES['taskmgr'], description: 'List chats, agent programs and terminals. Ending an agent program always asks you.' },
  { key: 'help', group: 'apps', label: PERMISSION_NAMES['help'], description: 'Search and read the manuals' },
  { key: 'openApps', group: 'apps', label: 'Agent may open apps', description: 'Let the agent open and close apps on this desktop' }
]

export const POLICY_KEYS: readonly PolicyKey[] = META.map((m) => m.key)

export const DECISION_ITEMS: { value: PolicyDecision; label: string }[] = [
  { value: 'allow', label: 'Allow' },
  { value: 'ask', label: 'Ask' },
  { value: 'deny', label: 'Deny' }
]

/** What the current setting of a row means, in one sentence: "Ask: asks you each time". */
export const decisionNote = (decision: PolicyDecision): string => `${DECISION_ITEMS.find((d) => d.value === decision)?.label}: ${DECISION_SENTENCES[decision]}`

export const decisionOf = (policy: ToolPolicyDto, key: PolicyKey): PolicyDecision =>
  key === 'openApps' ? policy.openApps : policy.groups[key]

export const permissionRows = (policy: ToolPolicyDto): PermissionRow[] => META.map((m) => ({ ...m, decision: decisionOf(policy, m.key) }))

/** Where an Ask request shows up (the help line of the page). */
export const ASK_HELP = 'Ask shows a request in the chat that wants to run something.'

/** The rows split into the two blocks of the page (rows keep their order inside a block). */
export const permissionGroups = (policy: ToolPolicyDto): { id: PermissionGroupId; title: string; rows: PermissionRow[] }[] => {
  const rows = permissionRows(policy)
  return (['abilities', 'apps'] as const).map((id) => ({ id, title: GROUP_TITLES[id], rows: rows.filter((r) => r.group === id) }))
}

/** Every permission set to one decision ("Set every permission to"). */
export const withAllDecisions = (policy: ToolPolicyDto, decision: PolicyDecision): ToolPolicyDto =>
  META.reduce((next, m) => withDecision(next, m.key, decision), policy)

/** The test id of a row's setting box: `permissions-setting-fs-read`. */
export const settingTestid = (key: PolicyKey): string => `permissions-setting-${key.replaceAll('.', '-')}`

/** How long the "Saved." line stays. */
export const SAVED_MS = 4000
export const SAVED_TEXT = 'Saved. New requests use these settings.'

export function withDecision(policy: ToolPolicyDto, key: PolicyKey, decision: PolicyDecision): ToolPolicyDto {
  return key === 'openApps' ? { ...policy, openApps: decision } : { ...policy, groups: { ...policy.groups, [key]: decision } }
}

export const policiesEqual = (a: ToolPolicyDto, b: ToolPolicyDto): boolean => META.every((m) => decisionOf(a, m.key) === decisionOf(b, m.key))

export const isDecision = (value: string): value is PolicyDecision => value === 'allow' || value === 'ask' || value === 'deny'

/** The help above the table. The last sentence names the top bar box the way the box itself does (UX-199). */
export const PERMISSIONS_HELP = `Each row is separate. The line under each name says what it covers. 'Write files' covers changing files in any app. 'Code' and 'Notepad' cover only what their rows list. ${ASK_HELP} These settings are always kept. The top bar box 'Ask before every action (this session only)' is different: all tools ask first until you click Resume, and it is not saved.`

/** Under this width the help shows its first two sentences with a "More" link (UX-198). */
export const NARROW_PAGE_PX = 520

/** True when the page is narrower than 520 px (a width of 0 means "not measured yet"). */
export const isNarrowPage = (widthPx: number): boolean => widthPx > 0 && widthPx < NARROW_PAGE_PX

/** The help as the page shows it: all of it, or in a narrow page its first two sentences until "More" is clicked. */
export function helpFor(narrow: boolean, expanded: boolean, full: string = PERMISSIONS_HELP): { text: string; collapsed: boolean } {
  if (!narrow || expanded) return { text: full, collapsed: false }
  const sentences = full.match(/[^.]+\.(?:\s+|$)/g) ?? [full]
  return { text: sentences.slice(0, 2).join('').trim(), collapsed: sentences.length > 2 }
}
