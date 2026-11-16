import type { Id, ToolCallContentDto } from '@shared/models'
import type { ToolCallPatch } from '../../domain/agent/AgentSessionEvent'
import type { VirtualFileSystem } from './VirtualFileSystem'

type DiffContent = Extract<ToolCallContentDto, { kind: 'diff' }>

const isOpenDiff = (c: ToolCallContentDto): c is DiffContent => c.kind === 'diff' && c.oldText === null

/**
 * Gives a permission request the real change. An agent that proposes a new text for a file without saying what it
 * replaces would otherwise show "all lines added" for a file that exists. Before the request is stored, the current
 * text of that file is read and becomes the diff's old text. A file that does not exist yet gets an empty old text
 * (a new file). A file that cannot be read keeps `null` and carries the error kind (`oldTextError`), so the box says
 * that it cannot show the change instead of claiming a whole-file replacement.
 */
export class ToolCallDiffs {
  constructor(
    private readonly vfs: Pick<VirtualFileSystem, 'readFile' | 'stat'>,
    private readonly desktopOf: (sessionId: Id) => Id | null | undefined
  ) {}

  /** True when `patch` has a change whose old text is unknown. */
  needsText(patch: ToolCallPatch): boolean {
    return (patch.contents ?? []).some(isOpenDiff)
  }

  async complete(sessionId: Id, patch: ToolCallPatch): Promise<ToolCallPatch> {
    const desktopId = this.desktopOf(sessionId)
    if (desktopId == null || !patch.contents) return patch
    const contents = await Promise.all(patch.contents.map((c) => (isOpenDiff(c) ? this.fill(desktopId, c) : c)))
    return { ...patch, contents }
  }

  private async fill(desktopId: Id, diff: DiffContent): Promise<DiffContent> {
    try {
      const entry = await this.vfs.stat(desktopId, diff.path)
      if (!entry) return { ...diff, oldText: '' }
      if (entry.kind === 'directory') return { ...diff, oldTextError: 'unreadable' }
      return { ...diff, oldText: await this.vfs.readFile(desktopId, diff.path) }
    } catch {
      return { ...diff, oldTextError: 'unreadable' }
    }
  }
}
