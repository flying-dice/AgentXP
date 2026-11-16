/**
 * The Explorer's "Agent status" column: what the agents of this desktop did to each file, derived
 * from the file changes of the chats on the desktop and from their file tool calls.
 */
import type { AguiToolCallState } from '@shared/agui-state'
import type { FileChangeDto } from '@shared/models'
import { normalizePath } from '../paths'

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

/** `path` relative to the workspace folder, or null when it lies outside (or `path` is already relative). */
export function relativeToFolder(folderPath: string, path: string): string | null {
  const folder = folderPath.replaceAll('\\', '/').replace(/\/+$/, '')
  const target = path.replaceAll('\\', '/')
  const isAbsolute = /^([a-z]:)?\//i.test(target)
  if (!isAbsolute) return normalizePath(target)
  const windows = /^[a-z]:/i.test(folder)
  const same = (a: string, b: string): boolean => (windows ? a.toLowerCase() === b.toLowerCase() : a === b)
  if (target.length >= folder.length && same(target.slice(0, folder.length), folder) && (target.length === folder.length || target[folder.length] === '/')) {
    return normalizePath(target.slice(folder.length))
  }
  return null
}

export interface StatusInput {
  folderPath: string
  changes: readonly Pick<FileChangeDto, 'path' | 'kind'>[]
  toolCalls: readonly Pick<AguiToolCallState, 'kind' | 'status' | 'locations'>[]
}

/** Status per workspace-relative file path. */
export function deriveAgentStatus({ folderPath, changes, toolCalls }: StatusInput): Map<string, AgentFileStatus> {
  const map = new Map<string, AgentFileStatus>()
  const set = (path: string | null, status: AgentFileStatus): void => {
    if (path) map.set(path, stronger(map.get(path), status))
  }
  for (const change of changes) {
    const path = relativeToFolder(folderPath, change.path)
    set(path, change.kind === 'added' ? 'created' : change.kind === 'deleted' ? 'deleted' : 'changed')
  }
  for (const call of toolCalls) {
    if (call.status === 'failed' || call.status === 'cancelled') continue
    for (const location of call.locations) {
      const path = relativeToFolder(folderPath, location.path)
      if (call.kind === 'read') set(path, 'read')
      else if (call.kind === 'edit') set(path, call.status === 'completed' ? 'changed' : 'editing')
    }
  }
  return map
}

/** The cell text for an entry; a folder reports the strongest change below it as "Contains changes". */
export function statusLabelFor(map: ReadonlyMap<string, AgentFileStatus>, path: string, isDirectory: boolean): string {
  const own = map.get(path)
  if (own) return STATUS_LABELS[own]
  if (!isDirectory) return ''
  const prefix = path === '' ? '' : `${path}/`
  for (const [key, status] of map) {
    if (key.startsWith(prefix) && status !== 'read') return 'Contains changes'
  }
  return ''
}
