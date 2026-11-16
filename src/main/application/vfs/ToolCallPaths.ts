import type { Id, ToolCallContentDto, ToolCallLocationDto } from '@shared/models'
import type { AgentSessionEvent } from '../../domain/agent/AgentSessionEvent'
import type { ToolCallPatch } from '../../domain/agent/AgentSessionEvent'
import type { Mount } from './VirtualFileSystem'

/** What the mapper needs of the virtual file system. */
export interface PathMapping {
  mounts(desktopId: Id): Mount[]
  toVPath(desktopId: Id, realPath: string): string | null
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Shows tool calls with the paths the agent's user knows: host paths (`/home/me/project/src/x.ts`) in titles,
 * locations and diffs become virtual paths (`E:\src\x.ts`) of the desktop the chat lives on. Agents work on real
 * folders and report real paths; the transcript, the Code app and Explorer's "Agent status" only know VPaths.
 * Text that is not a path of a plugged-in drive stays as it is.
 */
export class ToolCallPaths {
  constructor(
    private readonly vfs: PathMapping,
    private readonly desktopOf: (sessionId: Id) => Id | null | undefined
  ) {}

  /** The event with its paths mapped (the same object when there is nothing to map). */
  event(sessionId: Id, event: AgentSessionEvent): AgentSessionEvent {
    switch (event.type) {
      case 'tool_call_created': {
        const desktopId = this.desktopOf(sessionId)
        if (desktopId == null) return event
        return { ...event, ...this.mapFields(desktopId, event) }
      }
      case 'tool_call_updated': {
        const patch = this.patch(sessionId, event.patch)
        return patch === event.patch ? event : { ...event, patch }
      }
      default:
        return event
    }
  }

  patch<T extends ToolCallPatch>(sessionId: Id, patch: T): T {
    const desktopId = this.desktopOf(sessionId)
    if (desktopId == null) return patch
    return { ...patch, ...this.mapFields(desktopId, patch) }
  }

  private mapFields(desktopId: Id, fields: { title?: string; locations?: ToolCallLocationDto[]; contents?: ToolCallContentDto[] }): Partial<ToolCallPatch> {
    const mapped: Partial<ToolCallPatch> = {}
    if (fields.title !== undefined) mapped.title = this.text(desktopId, fields.title)
    if (fields.locations) mapped.locations = fields.locations.map((l) => ({ ...l, path: this.path(desktopId, l.path) }))
    if (fields.contents) mapped.contents = fields.contents.map((c) => (c.kind === 'diff' ? { ...c, path: this.path(desktopId, c.path) } : c))
    return mapped
  }

  private path(desktopId: Id, path: string): string {
    return this.vfs.toVPath(desktopId, path) ?? path
  }

  /** Replaces every host path under a drive root inside free text (a tool title such as "Read /x/y.ts"). */
  private text(desktopId: Id, text: string): string {
    let result = text
    const mounts = [...this.vfs.mounts(desktopId)].sort((a, b) => b.root.length - a.root.length)
    for (const mount of mounts) {
      const pattern = new RegExp(`${escapeRegExp(mount.root)}(?![\\w.-])((?:[\\\\/][^\\s"'\`<>|*?:]*)?)`, process.platform === 'win32' ? 'gi' : 'g')
      result = result.replace(pattern, (_all, tail: string) => `${mount.letter}:${tail.replaceAll('/', '\\') || '\\'}`)
    }
    return result
  }
}
