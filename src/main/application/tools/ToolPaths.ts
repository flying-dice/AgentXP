import type { VPath } from '@shared/vfs'
import type { SessionRepository } from '../../domain/repositories/session-repository'
import { required } from '../errors'
import type { VirtualFileSystem } from '../vfs/VirtualFileSystem'
import type { ToolContext } from './types'

/** Turns the path arguments of tools into VPaths: relative to the chat's working directory, or a full path. */
export class ToolPaths {
  constructor(
    private readonly vfs: Pick<VirtualFileSystem, 'resolveInput'>,
    private readonly sessions: Pick<SessionRepository, 'get'>
  ) {}

  /** The chat's working directory. */
  cwd(context: ToolContext): VPath {
    return required(this.sessions.get(context.sessionId), 'Session').cwd
  }

  /**
   * A normalised VPath on a drive that is plugged in now (`DriveUnavailableError` otherwise). `input` is a full path
   * (`E:\src\a.ts`), a real absolute path inside a drive, or relative to the chat's cwd; omitted means the cwd.
   */
  resolve(context: ToolContext, input?: string): VPath {
    const cwd = this.cwd(context)
    return input === undefined || input.trim() === '' ? this.vfs.resolveInput(context.desktopId, cwd, cwd) : this.vfs.resolveInput(context.desktopId, cwd, input)
  }
}
