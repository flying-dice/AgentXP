import type { Id } from '@shared/models'
import type { FileChangeRepository } from '../domain/repositories/file-change-repository'
import type { RecycledChangeRepository } from '../domain/repositories/recycled-change-repository'
import type { SessionRepository } from '../domain/repositories/session-repository'
import { AppError, required } from './errors'
import type { FileChangeRecorder } from './FileChangeRecorder'
import type { EventPublisher, HostFiles } from './ports'
import type { VirtualFileSystem } from './vfs/VirtualFileSystem'

/**
 * Undoes a recorded file change: restores the original text, or deletes a file the agent added.
 * What the revert throws away goes to the desktop's Recycle Bin, where it can be restored.
 * The change's drive must be plugged in (its project folder is what gets written).
 */
export class ChangeReverter {
  constructor(
    private readonly changes: FileChangeRepository,
    private readonly sessions: SessionRepository,
    private readonly vfs: Pick<VirtualFileSystem, 'mountOfFolder'>,
    private readonly host: HostFiles,
    private readonly recorder: FileChangeRecorder,
    private readonly recycled: RecycledChangeRepository,
    private readonly events: EventPublisher
  ) {}

  async revert(changeId: Id): Promise<void> {
    const change = required(this.changes.get(changeId), 'File change')
    const session = required(this.sessions.get(change.sessionId), 'Session')
    const desktopId = session.desktopId
    if (desktopId === null || desktopId === undefined) throw new AppError('This chat is not on a desktop.')
    const { root } = this.vfs.mountOfFolder(desktopId, change.folderId)
    if (change.originalText === null) await this.host.remove(root, change.relativePath)
    else await this.host.writeText(root, change.relativePath, change.originalText)
    this.recycled.add({
      desktopId,
      sessionId: session.id,
      folderId: change.folderId,
      path: change.relativePath,
      revertedText: change.currentText,
      restoredText: change.originalText
    })
    this.events.publish('recycle.changed', { desktopId })
    this.changes.remove(changeId)
    this.recorder.publish(change.sessionId)
  }
}
