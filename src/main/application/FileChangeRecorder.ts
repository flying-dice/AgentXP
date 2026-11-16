import { relative } from 'node:path'
import type { Id } from '@shared/models'
import type { FileChangeRepository } from '../domain/repositories/file-change-repository'
import type { EventPublisher } from './ports'

/** Records agent file writes (paths relative to the folder) for the Changes pane. */
export class FileChangeRecorder {
  constructor(
    private readonly changes: FileChangeRepository,
    private readonly events: EventPublisher
  ) {}

  recordWrite(sessionId: Id, root: string, absolutePath: string, before: string | null, after: string | null): void {
    this.changes.record({ sessionId, path: relative(root, absolutePath), previousText: before, newText: after })
    this.publish(sessionId)
  }

  publish(sessionId: Id): void {
    this.events.publish('changes.changed', { sessionId, changes: this.changes.list(sessionId) })
  }
}
