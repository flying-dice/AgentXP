import { isAbsolute, resolve } from 'node:path'
import { parseVPath, type VPath } from '@shared/vfs'
import type { Id } from '@shared/models'
import type { FileAccess, FileAccessProvider } from '../domain/agent/FileAccess'
import type { SessionRepository } from '../domain/repositories/session-repository'
import { AppError, required } from './errors'
import type { FileChangeRecorder } from './FileChangeRecorder'
import type { HostFiles } from './ports'
import { OutsideDrivesError } from './vfs/errors'
import type { Located, VirtualFileSystem } from './vfs/VirtualFileSystem'

const sliceLines = (text: string, line?: number, limit?: number): string => {
  if (line === undefined && limit === undefined) return text
  const lines = text.split('\n')
  const start = Math.max((line ?? 1) - 1, 0)
  return lines.slice(start, limit === undefined ? undefined : start + Math.max(limit, 0)).join('\n')
}

/**
 * File access on behalf of the agent of one chat. Real absolute paths (what ACP agents use, derived from the
 * chat's `cwd`) are allowed iff they resolve inside C: or a drive that is plugged in right now, so an
 * ejected drive refuses on the very next call. Writes are recorded as the chat's file changes.
 */
export class SessionFiles {
  constructor(
    private readonly deps: {
      vfs: VirtualFileSystem
      host: HostFiles
      sessions: Pick<SessionRepository, 'get'>
      recorder: FileChangeRecorder
    }
  ) {}

  forSession(sessionId: Id): FileAccessProvider {
    const access: FileAccess = {
      readTextFile: (path, line, limit) => this.read(sessionId, path, line, limit),
      writeTextFile: async (path, content) => this.write(sessionId, this.locateAgentPath(sessionId, path), content),
      resolveCwd: (cwd) => this.resolveCwd(sessionId, cwd)
    }
    return { forSession: () => access }
  }

  /** Writes `text` to a VPath for a tool (wordpad_write) and records it as a change of the chat. */
  async writeVPath(sessionId: Id, path: VPath, text: string): Promise<void> {
    const desktopId = this.desktopOf(sessionId)
    await this.write(sessionId, this.deps.vfs.locate(desktopId, path), text)
  }

  private async read(sessionId: Id, path: string, line?: number, limit?: number): Promise<string> {
    const { mount, relativePath } = this.locateAgentPath(sessionId, path)
    return sliceLines(await this.deps.host.readText(mount.root, relativePath), line, limit)
  }

  private async write(sessionId: Id, { mount, relativePath }: Located, content: string): Promise<void> {
    if (relativePath === '') throw new AppError('A drive root is not a file.')
    const before = await this.deps.host.readText(mount.root, relativePath).catch(() => null)
    await this.deps.host.writeText(mount.root, relativePath, content)
    this.deps.recorder.recordWrite(sessionId, mount.folderId, relativePath, before, content)
  }

  private async resolveCwd(sessionId: Id, cwd?: string): Promise<string> {
    const { vfs, host } = this.deps
    if (cwd === undefined) return vfs.realPath(this.desktopOf(sessionId), this.cwdOf(sessionId))
    const { mount, relativePath } = this.locateAgentPath(sessionId, cwd)
    return host.resolveInside(mount.root, relativePath)
  }

  /**
   * The drive and root-relative path of a path the agent gave: a real absolute path first, then a VPath, then a
   * path relative to the chat's cwd. Throws a refusal naming the ejected drive when the chat's drive is gone.
   */
  private locateAgentPath(sessionId: Id, path: string): Located {
    const { vfs } = this.deps
    const desktopId = this.desktopOf(sessionId)
    if (isAbsolute(path)) {
      const real = vfs.locateReal(desktopId, path)
      if (real) return real
    }
    if (parseVPath(path)) return vfs.locate(desktopId, path)
    if (!isAbsolute(path)) return vfs.locate(desktopId, vfs.resolveInput(desktopId, this.cwdOf(sessionId), path))
    // Not on any drive: when the chat works on a drive that has been ejected, that is the reason.
    const cwd = parseVPath(this.cwdOf(sessionId))
    if (cwd && !vfs.mounts(desktopId).some((m) => m.letter === cwd.drive)) throw vfs.unavailable(desktopId, cwd.drive)
    throw new OutsideDrivesError(resolve(path))
  }

  private cwdOf(sessionId: Id): VPath {
    return required(this.deps.sessions.get(sessionId), 'Session').cwd
  }

  private desktopOf(sessionId: Id): Id {
    const desktopId = required(this.deps.sessions.get(sessionId), 'Session').desktopId
    if (desktopId === null || desktopId === undefined) throw new AppError('This chat is not on a desktop.')
    return desktopId
  }
}
