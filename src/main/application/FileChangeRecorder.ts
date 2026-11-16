import type { Id } from '@shared/models'
import type { FileChangeRepository } from '../domain/repositories/file-change-repository'
import type { EventPublisher } from './ports'

/** Records agent file writes for the Changes pane: where (folder or C:, relative path) and what changed. */
export class FileChangeRecorder {
  constructor(
    private readonly changes: FileChangeRepository,
    private readonly events: EventPublisher
  ) {}

  /** `folderId` null is the desktop's C: disk; `relativePath` is relative to that root (`/`-separated). */
  recordWrite(sessionId: Id, folderId: Id | null, relativePath: string, before: string | null, after: string | null): void {
    this.changes.record({ sessionId, folderId, path: relativePath, previousText: before, newText: after })
    this.publish(sessionId)
  }

  publish(sessionId: Id): void {
    this.events.publish('changes.changed', { sessionId, changes: this.changes.list(sessionId) })
  }
}
