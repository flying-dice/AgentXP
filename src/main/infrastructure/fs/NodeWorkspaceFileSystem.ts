import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { FileAccess } from '../../domain/agent/FileAccess'
import type { WorkspaceFileSystem } from '../../application/ports'
import { WorkspaceFileAccess, type WriteListener } from '../acp/WorkspaceFileAccess'
import { resolveInsideRoot } from './sandbox'

export class NodeWorkspaceFileSystem implements WorkspaceFileSystem {
  access(root: string, onWrite?: WriteListener): FileAccess {
    return new WorkspaceFileAccess(root, onWrite)
  }

  async remove(root: string, relativePath: string): Promise<void> {
    await rm(await resolveInsideRoot(resolve(root), relativePath), { force: true })
  }
}
