import type { Id, ToolCallContentDto } from '@shared/models'
import type { ToolCallPatch } from '../../domain/agent/AgentSessionEvent'
import type { VirtualFileSystem } from './VirtualFileSystem'

type DiffContent = Extract<ToolCallContentDto, { kind: 'diff' }>

/** Error codes of a file another program holds (a locked file on Windows, a file without access). */
const IN_USE_CODES = new Set(['EBUSY', 'EPERM', 'EACCES'])

const isOpenDiff = (c: ToolCallContentDto): c is DiffContent => c.kind === 'diff' && c.oldText === null

/**
 * Gives a permission request the real change. An agent that proposes a new text for a file without saying what it
 * replaces would otherwise show "all lines added" for a file that exists. Before the request is stored, the current
 * text of that file is read and becomes the diff's old text. The diff may arrive in the request or only in the earlier
 * tool call update of the same call (`stored`): `withStoredChange` joins the two before the read. A file that does not exist yet gets an empty old text
 * (a new file). A file that cannot be read keeps `null` and carries the error kind (`oldTextError`: `in_use` when another program holds it), so the box says
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

  /**
   * The request's tool call with the changes of the stored tool call of the same call id, when the request carries no
   * diff of its own (the agent sent the change as an update and then asked with a title only). A diff in the request wins.
   */
  withStoredChange(patch: ToolCallPatch, stored: Pick<ToolCallPatch, 'contents'> | null | undefined): ToolCallPatch {
    const hasDiff = (p: Pick<ToolCallPatch, 'contents'> | null | undefined) => (p?.contents ?? []).some((c) => c.kind === 'diff')
    if (hasDiff(patch) || !hasDiff(stored)) return patch
    return { ...patch, contents: [...(patch.contents ?? []), ...(stored?.contents ?? []).filter((c) => c.kind === 'diff')] }
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
    } catch (error) {
      return { ...diff, oldTextError: IN_USE_CODES.has((error as NodeJS.ErrnoException | null)?.code ?? '') ? 'in_use' : 'unreadable' }
    }
  }
}
