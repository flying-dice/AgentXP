import type { RecycledChangeDto } from '@shared/desktop'
import type { Id } from '@shared/models'
import type { RecycledChangeRecord, RecycledChangeRepository } from '../domain/repositories/recycled-change-repository'
import type { SessionRepository } from '../domain/repositories/session-repository'
import { required } from './errors'
import type { FileChangeRecorder } from './FileChangeRecorder'
import type { EventPublisher, HostFiles } from './ports'
import type { VirtualFileSystem } from './vfs/VirtualFileSystem'

/** The Recycle Bin: changes the user reverted, restorable until emptied. */
export class RecycleService {
  constructor(
    private readonly recycled: RecycledChangeRepository,
    private readonly sessions: SessionRepository,
    private readonly vfs: Pick<VirtualFileSystem, 'mountOfFolder'>,
    private readonly host: HostFiles,
    private readonly recorder: FileChangeRecorder,
    private readonly events: EventPublisher
  ) {}

  list(desktopId: Id): RecycledChangeDto[] {
    return this.recycled.list(desktopId)
  }

  get(id: Id): RecycledChangeRecord {
    return required(this.recycled.get(id), 'Recycled change')
  }

  /**
   * Re-applies what the revert threw away: writes `revertedText` back (or deletes the file when the agent
   * had deleted it). When the chat still exists the result is recorded as a new file change of that chat.
   * The file's drive must be plugged in.
   */
  async restore(id: Id): Promise<void> {
    const item = this.get(id)
    const { root, folderId } = this.vfs.mountOfFolder(item.desktopId, item.folderId)
    const sessionId = item.sessionId !== null && this.sessions.get(item.sessionId) ? item.sessionId : null
    const before = await this.host.readText(root, item.relativePath).catch(() => null)
    if (item.revertedText === null) await this.host.remove(root, item.relativePath)
    else await this.host.writeText(root, item.relativePath, item.revertedText)
    if (sessionId !== null) this.recorder.recordWrite(sessionId, folderId, item.relativePath, before, item.revertedText)
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
