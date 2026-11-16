import type { Id } from '@shared/models'
import type { DesktopRepository } from '../domain/repositories/desktop-repository'
import type { FileChangeRepository } from '../domain/repositories/file-change-repository'
import type { FolderRepository } from '../domain/repositories/folder-repository'
import type { RecycledChangeRepository } from '../domain/repositories/recycled-change-repository'
import type { SessionRepository } from '../domain/repositories/session-repository'
import { required } from './errors'
import type { FileChangeRecorder } from './FileChangeRecorder'
import type { EventPublisher, WorkspaceFileSystem } from './ports'

/**
 * Undoes a recorded file change: restores the original text, or deletes a file the agent added.
 * What the revert throws away goes to the desktop's Recycle Bin, where it can be restored.
 */
export class ChangeReverter {
  constructor(
    private readonly changes: FileChangeRepository,
    private readonly sessions: SessionRepository,
    private readonly folders: FolderRepository,
    private readonly fileSystem: WorkspaceFileSystem,
    private readonly recorder: FileChangeRecorder,
    private readonly recycled: RecycledChangeRepository,
    private readonly desktops: Pick<DesktopRepository, 'findByFolder'>,
    private readonly events: EventPublisher
  ) {}

  async revert(changeId: Id): Promise<void> {
    const change = required(this.changes.get(changeId), 'File change')
    const session = required(this.sessions.get(change.sessionId), 'Session')
    const root = required(this.folders.get(session.folderId), 'Folder').path
    if (change.originalText === null) await this.fileSystem.remove(root, change.path)
    else await this.fileSystem.access(root).writeTextFile(change.path, change.originalText)
    const desktopId = session.desktopId ?? this.desktops.findByFolder(session.folderId)?.id ?? null
    if (desktopId !== null) {
      this.recycled.add({ desktopId, sessionId: session.id, path: change.path, revertedText: change.currentText, restoredText: change.originalText })
      this.events.publish('recycle.changed', { desktopId })
    }
    this.changes.remove(changeId)
    this.recorder.publish(change.sessionId)
  }
}
