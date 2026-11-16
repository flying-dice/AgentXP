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
  { key: 'review', group: 'apps', label: PERMISSION_NAMES['review'], description: 'Comment on changes and give a verdict in a Code Review window' },
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
