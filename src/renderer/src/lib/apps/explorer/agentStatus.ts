/**
 * The Explorer's "Agent status" column: what the agents of this desktop did to each file, derived
 * from the file changes of the chats on the desktop and from their file tool calls.
 */
import type { AguiToolCallState } from '@shared/agui-state'
import type { FileChangeDto } from '@shared/models'
import { normaliseVPath, type VPath } from '@shared/vfs'

export type AgentFileStatus = 'read' | 'editing' | 'changed' | 'created' | 'deleted'

export const STATUS_LABELS: Record<AgentFileStatus, string> = {
  read: 'Read',
  editing: 'Editing...',
  changed: 'Changed',
  created: 'Created this desktop',
  deleted: 'Deleted'
}

/** Strongest first: what the user most wants to see wins when a file has several. */
const RANK: AgentFileStatus[] = ['created', 'deleted', 'editing', 'changed', 'read']

const stronger = (a: AgentFileStatus | undefined, b: AgentFileStatus): AgentFileStatus =>
  a === undefined || RANK.indexOf(b) < RANK.indexOf(a) ? b : a

export interface StatusInput {
  changes: readonly Pick<FileChangeDto, 'path' | 'kind'>[]
  toolCalls: readonly Pick<AguiToolCallState, 'kind' | 'status' | 'locations'>[]
}

/** Status per file, keyed by normalised VPath (`E:\\src\\a.ts`). Paths that are not valid VPaths are ignored. */
export function deriveAgentStatus({ changes, toolCalls }: StatusInput): Map<VPath, AgentFileStatus> {
  const map = new Map<VPath, AgentFileStatus>()
  const set = (path: string, status: AgentFileStatus): void => {
    const key = normaliseVPath(path)
    if (key) map.set(key, stronger(map.get(key), status))
  }
  for (const change of changes) set(change.path, change.kind === 'added' ? 'created' : change.kind === 'deleted' ? 'deleted' : 'changed')
  for (const call of toolCalls) {
    if (call.status === 'failed' || call.status === 'cancelled') continue
    for (const location of call.locations) {
      if (call.kind === 'read') set(location.path, 'read')
      else if (call.kind === 'edit') set(location.path, call.status === 'completed' ? 'changed' : 'editing')
    }
  }
  return map
}

/** The cell text for an entry (`path` a VPath); a folder reports the strongest change below it as "Contains changes". */
export function statusLabelFor(map: ReadonlyMap<VPath, AgentFileStatus>, path: VPath, isDirectory: boolean): string {
  const own = map.get(path)
  if (own) return STATUS_LABELS[own]
  if (!isDirectory) return ''
  const prefix = path.endsWith('\\') ? path : `${path}\\`
  for (const [key, status] of map) {
    if (key.startsWith(prefix) && status !== 'read') return 'Contains changes'
  }
  return ''
}
