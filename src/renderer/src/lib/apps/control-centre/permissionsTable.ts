/** The Control Centre permissions page: the policy as table rows with human names. */
import type { PolicyDecision, ToolGroup, ToolPolicyDto } from '@shared/desktop'

export type PolicyKey = Exclude<ToolGroup, 'shell'> | 'openApps'

export interface PermissionRow {
  key: PolicyKey
  label: string
  description: string
  decision: PolicyDecision
}

/** One row per tool group of `TOOL_GROUPS` (the always-on `shell` group is not gated), then the app-opening rule. */
const META: { key: PolicyKey; label: string; description: string }[] = [
  { key: 'fs.read', label: 'Read files', description: 'Read and list files in the workspace (Explorer, Code)' },
  { key: 'fs.write', label: 'Write files', description: 'Create and change files (Notepad, Code)' },
  { key: 'notepad', label: 'Notepad', description: 'Open and read documents in Notepad' },
  { key: 'code', label: 'Code', description: 'Open files, reveal lines and show diffs in Code' },
  { key: 'terminal', label: 'Terminal', description: 'Run commands and read their output' },
  { key: 'browser', label: 'Browser', description: 'Navigate, read and click in web pages' },
  { key: 'paint', label: 'Paint', description: 'Draw on, read and resize the Paint canvas' },
  { key: 'wordpad', label: 'WordPad', description: 'Open, read and write documents in WordPad' },
  { key: 'notes', label: 'Notes', description: 'List, add, change and remove Sticky Notes' },
  { key: 'events', label: 'Events', description: 'Search the Event Viewer log of protocol messages' },
  { key: 'snip', label: 'Screen capture', description: 'Take screenshots of the desktop with the Snipping Tool' },
  { key: 'recycle', label: 'Recycle Bin', description: 'List and restore deleted items' },
  { key: 'openApps', label: 'Agent may open apps', description: 'Let the agent open and close apps on this desktop' }
]

export const POLICY_KEYS: readonly PolicyKey[] = META.map((m) => m.key)

export const DECISION_ITEMS: { value: PolicyDecision; label: string }[] = [
  { value: 'allow', label: 'Allow' },
  { value: 'ask', label: 'Ask' },
  { value: 'deny', label: 'Deny' }
]

export const decisionOf = (policy: ToolPolicyDto, key: PolicyKey): PolicyDecision =>
  key === 'openApps' ? policy.openApps : policy.groups[key]

export const permissionRows = (policy: ToolPolicyDto): PermissionRow[] => META.map((m) => ({ ...m, decision: decisionOf(policy, m.key) }))

export function withDecision(policy: ToolPolicyDto, key: PolicyKey, decision: PolicyDecision): ToolPolicyDto {
  return key === 'openApps' ? { ...policy, openApps: decision } : { ...policy, groups: { ...policy.groups, [key]: decision } }
}

export const policiesEqual = (a: ToolPolicyDto, b: ToolPolicyDto): boolean => META.every((m) => decisionOf(a, m.key) === decisionOf(b, m.key))

export const isDecision = (value: string): value is PolicyDecision => value === 'allow' || value === 'ask' || value === 'deny'
