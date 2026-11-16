import type { FileChangeDto, FileChangeKind } from '@shared/models'

const KIND: Record<FileChangeKind, string> = { added: 'Added', modified: 'Modified', deleted: 'Deleted' }

export const changeKindLabel = (kind: FileChangeKind): string => KIND[kind]

export const linesLabel = (change: Pick<FileChangeDto, 'additions' | 'deletions'>): string => `+${change.additions} -${change.deletions}`

/** Joins a folder path and a relative change path with the separator the folder path uses. */
export function absolutePath(folderPath: string, relative: string): string {
  const sep = folderPath.includes('\\') && !folderPath.includes('/') ? '\\' : '/'
  const clean = relative.replace(/^[\\/]+/, '').replaceAll(sep === '\\' ? '/' : '\\', sep)
  return `${folderPath.replace(/[\\/]+$/, '')}${sep}${clean}`
}
