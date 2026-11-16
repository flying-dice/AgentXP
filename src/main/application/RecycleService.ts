import { resolve } from 'node:path'
import type { RecycledChangeDto } from '@shared/desktop'
import type { Id } from '@shared/models'
import type { DesktopRepository } from '../domain/repositories/desktop-repository'
import type { FolderRepository } from '../domain/repositories/folder-repository'
import type { RecycledChangeRepository } from '../domain/repositories/recycled-change-repository'
import type { SessionRepository } from '../domain/repositories/session-repository'
import { required } from './errors'
import type { FileChangeRecorder } from './FileChangeRecorder'
import type { EventPublisher, WorkspaceFileSystem } from './ports'

/** The Recycle Bin: changes the user reverted, restorable until emptied. */
export class RecycleService {
  constructor(
    private readonly recycled: RecycledChangeRepository,
    private readonly desktops: Pick<DesktopRepository, 'get'>,
    private readonly folders: FolderRepository,
    private readonly sessions: SessionRepository,
    private readonly fileSystem: WorkspaceFileSystem,
    private readonly recorder: FileChangeRecorder,
    private readonly events: EventPublisher
  ) {}

  list(desktopId: Id): RecycledChangeDto[] {
    return this.recycled.list(desktopId)
  }

  get(id: Id): RecycledChangeDto {
    return required(this.recycled.get(id), 'Recycled change')
  }

  /**
   * Re-applies what the revert threw away: writes `revertedText` back (or deletes the file when the agent
   * had deleted it). When the chat still exists the result is recorded as a new file change of that chat.
   */
  async restore(id: Id): Promise<void> {
    const item = this.get(id)
    const desktop = required(this.desktops.get(item.desktopId), 'Desktop')
    const root = required(this.folders.get(desktop.folderId), 'Folder').path
    const sessionId = item.sessionId !== null && this.sessions.get(item.sessionId) ? item.sessionId : null
    const onWrite = sessionId === null ? undefined : (path: string, before: string | null, after: string): void => this.recorder.recordWrite(sessionId, root, path, before, after)
    const access = this.fileSystem.access(root, onWrite)
    if (item.revertedText === null) {
      const before = await access.readTextFile(item.path).catch(() => null)
      await this.fileSystem.remove(root, item.path)
      if (sessionId !== null) this.recorder.recordWrite(sessionId, root, resolve(root, item.path), before, null)
    } else {
      await access.writeTextFile(item.path, item.revertedText)
    }
    this.recycled.remove(id)
    this.publish(item.desktopId)
  }

  remove(id: Id): void {
    const item = this.get(id)
    this.recycled.remove(id)
    this.publish(item.desktopId)
  }

  empty(desktopId: Id): void {
    this.recycled.removeAll(desktopId)
    this.publish(desktopId)
  }

  private publish(desktopId: Id): void {
    this.events.publish('recycle.changed', { desktopId })
  }
}
