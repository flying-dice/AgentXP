/** Pure rows of the Recycle Bin. */
import type { RecycledChangeDto } from '@shared/desktop'
import type { SessionDto } from '@shared/models'
import type { ListRow } from '../../kit/organisms/ListView'
import { baseName, parentOf, toWindowsPath } from '../paths'
import { formatDateTime } from '../shared/dates'

export function recycleRows(items: readonly RecycledChangeDto[], sessions: readonly Pick<SessionDto, 'id' | 'title'>[]): ListRow[] {
  return [...items]
    .sort((a, b) => b.revertedAt.localeCompare(a.revertedAt))
    .map((r): ListRow => ({
      id: String(r.id),
      icon: r.revertedText === null ? 'delete' : 'file-text',
      name: baseName(r.path),
      location: toWindowsPath(parentOf(r.path)),
      when: formatDateTime(r.revertedAt),
      chat: sessions.find((s) => s.id === r.sessionId)?.title ?? (r.sessionId === null ? '' : `Chat ${r.sessionId}`)
    }))
}

/** What restoring does, in one sentence for the preview header. */
export function restoreSummary(r: Pick<RecycledChangeDto, 'revertedText' | 'restoredText' | 'path'>): string {
  if (r.revertedText === null) return `Restoring deletes ${r.path} again, as the agent did.`
  if (r.restoredText === null) return `Restoring brings back ${r.path}, a file the agent added.`
  return `Restoring puts the agent's version of ${r.path} back.`
}
