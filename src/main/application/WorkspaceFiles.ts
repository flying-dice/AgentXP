import type { Id } from '@shared/models'
import type { FileAccessProvider } from '../domain/agent/FileAccess'
import type { FileChangeRecorder } from './FileChangeRecorder'
import type { WorkspaceFileSystem } from './ports'

/** File access for one session: sandboxed to its folder, every write recorded as a change. */
export class WorkspaceFiles {
  constructor(
    private readonly fileSystem: WorkspaceFileSystem,
    private readonly recorder: FileChangeRecorder
  ) {}

  forSession(sessionId: Id, root: string): FileAccessProvider {
    const access = this.fileSystem.access(root, (path, before, after) =>
      this.recorder.recordWrite(sessionId, root, path, before, after)
    )
    return { forSession: () => access }
  }
}
