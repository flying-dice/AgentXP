import type { A2uiClientEvent, A2uiComponent, A2uiServerMessage, A2uiSurfaceDto, A2uiSurfaceTarget } from '@shared/a2ui'
import { surfaceSizeHint, surfaceTitle } from '@shared/a2ui/messages'
import { SURFACE_FALLBACK_TITLE } from '@shared/desktop-views'
import { A2uiMessageValidator } from '@shared/a2ui/validation'
import type { Id } from '@shared/models'
import type { A2uiApplyOptions, A2uiMessageSink, A2uiSinkResult } from '../domain/a2ui/ports'
import type { A2uiSurfaceRepository } from '../domain/repositories/a2ui-surface-repository'
import type { SessionRepository } from '../domain/repositories/session-repository'
import type { TranscriptRepository } from '../domain/repositories/transcript-repository'
import { AppError } from './errors'
import type { EventPublisher } from './ports'

/** Lets the dispatcher send an input to the agent without recording it as a user message. */
export interface HiddenPrompter {
  sendHidden(sessionId: Id, text: string): Promise<void>
}

/** The desktop windows of surfaces (satisfied by `DesktopService`). */
export interface SurfaceWindows {
  /** Opens or focuses the window of a surface; false when the chat has no desktop. */
  open(sessionId: Id, surfaceId: string, by: 'user' | 'agent', size?: { width?: number; height?: number }): boolean
  /** Closes the window of a surface; the surface stays. */
  close(sessionId: Id, surfaceId: string): void
  isOpen(sessionId: Id, surfaceId: string): boolean
  /** The desktop state changed outside the window rows (a sidebar tab, a title); republish it. */
  refresh(sessionId: Id): void
}

/** Parses the session key the MCP server was started with (the session row id). */
const sessionIdFromKey = (key: string): Id | null => (/^\d+$/.test(key) ? Number(key) : null)

export function describeClientEvent(event: A2uiClientEvent): string {
  return [
    `The user triggered the action "${event.action.name}" on component "${event.sourceComponentId}" of surface "${event.surfaceId}".`,
    '',
    '```json',
    JSON.stringify(event, null, 2),
    '```'
  ].join('\n')
}

/** Applies agent-drawn A2UI surfaces and routes user actions on them back to the agent. */
export class A2uiService implements A2uiMessageSink {
  constructor(
    private readonly surfaces: A2uiSurfaceRepository,
    private readonly transcripts: TranscriptRepository,
    private readonly sessions: SessionRepository,
    private readonly events: EventPublisher,
    private readonly prompter: HiddenPrompter,
    private readonly validator: A2uiMessageValidator = new A2uiMessageValidator(),
    private windows: SurfaceWindows | null = null
  ) {}

  /** Connects the desktop (built after this service). Without it every surface is inline. */
  attachWindows(windows: SurfaceWindows): void {
    this.windows = windows
  }

  async apply(sessionKey: string, messages: A2uiServerMessage[], options: A2uiApplyOptions = {}): Promise<A2uiSinkResult> {
    const sessionId = sessionIdFromKey(sessionKey)
    if (sessionId === null || !this.sessions.get(sessionId)) return { ok: false, errors: [`unknown session: ${sessionKey}`] }
    // web_core replays the session's surfaces and applies the batch first: nothing is stored unless all of it is valid.
    const errors = this.validator.validateAgainst(this.surfaces.list(sessionId), messages)
    if (errors.length > 0) return { ok: false, errors }
    const notes = new Set<string>()
    const failures = messages.flatMap((message) => this.applyOne(sessionId, message, options, notes))
    if (failures.length > 0) return { ok: false, errors: failures }
    return notes.size > 0 ? { ok: true, notes: [...notes] } : { ok: true }
  }

  // ---- the user's own actions on a surface (the chat row's buttons) ------------------------------

  /** Deletes a surface like the agent's `a2ui_delete_surface` (its window closes with it). */
  deleteSurface(sessionId: Id, surfaceId: string): void {
    const failures = this.remove(sessionId, surfaceId)
    if (failures.length > 0) throw new AppError(failures.join('\n'))
  }

  /**
   * Relocates a surface. To `window` the window opens (focused: the user asked for it); away from `window`
   * the window closes; to `sidebar` the tab is shown again. Needs a desktop for `sidebar` and `window`.
   */
  moveSurface(sessionId: Id, surfaceId: string, target: A2uiSurfaceTarget): void {
    this.require(sessionId, surfaceId)
    if (target !== 'inline' && (!this.windows || !this.hasDesktop(sessionId))) throw new AppError('This chat is not on a desktop, so its surfaces can only be inline')
    if (target !== 'window') this.windows?.close(sessionId, surfaceId)
    const surface = this.require(sessionId, surfaceId, this.surfaces.setTarget(sessionId, surfaceId, target))
    if (target === 'window') this.windows?.open(sessionId, surfaceId, 'user')
    this.windows?.refresh(sessionId)
    this.events.publish('surface.changed', surface)
  }

  /** Shows or hides the sidebar tab of a surface. */
  setSidebarHidden(sessionId: Id, surfaceId: string, hidden: boolean): void {
    const surface = this.require(sessionId, surfaceId, this.surfaces.setHidden(sessionId, surfaceId, hidden))
    this.windows?.refresh(sessionId)
    this.events.publish('surface.changed', surface)
  }

  async dispatch(event: A2uiClientEvent): Promise<void> {
    await this.prompter.sendHidden(this.resolveSession(event), describeClientEvent(event))
  }

  private applyOne(sessionId: Id, message: A2uiServerMessage, options: A2uiApplyOptions, notes: Set<string>): string[] {
    if ('createSurface' in message) {
      const { surfaceId, catalogId, theme } = message.createSurface
      return this.create(sessionId, { surfaceId, catalogId, title: surfaceTitle({ theme }), target: options.target ?? 'inline' }, surfaceSizeHint({ theme }), notes)
    }
    if ('updateComponents' in message) {
      const { surfaceId, components } = message.updateComponents
      return this.publish(surfaceId, this.surfaces.upsertComponents(sessionId, surfaceId, components as A2uiComponent[]), notes)
    }
    if ('updateDataModel' in message) {
      const { surfaceId, path, value } = message.updateDataModel
      // Omitting the value removes the key; at the root that leaves an empty model.
      const next = value === undefined && !path ? {} : value
      return this.publish(surfaceId, this.surfaces.updateDataModel(sessionId, surfaceId, path, next), notes)
    }
    return this.remove(sessionId, message.deleteSurface.surfaceId)
  }

  private create(
    sessionId: Id,
    input: { surfaceId: string; catalogId: string; title: string | null; target: A2uiSurfaceTarget },
    size: { width?: number; height?: number },
    notes: Set<string>
  ): string[] {
    const existed = this.surfaces.get(sessionId, input.surfaceId) !== null
    // Without a desktop (no window host, or a chat that is on none) every surface is inline.
    const target = input.target !== 'inline' && this.windows && this.hasDesktop(sessionId) ? input.target : 'inline'
    const surface = this.surfaces.create(sessionId, { ...input, target })
    this.publishTranscriptEntry(sessionId, input.surfaceId)
    if (!existed && surface.target === 'window') this.windows?.open(sessionId, input.surfaceId, 'agent', size)
    this.events.publish('surface.changed', surface)
    this.windows?.refresh(sessionId) // the window title follows the surface title
    this.note(surface, notes, !existed)
    return []
  }

  private publish(surfaceId: string, surface: A2uiSurfaceDto | null, notes: Set<string>): string[] {
    if (!surface) return [`unknown surface: ${surfaceId}`]
    this.events.publish('surface.changed', surface)
    this.note(surface, notes, false)
    return []
  }

  /** Tells the agent where the surface is (and that the user closed it, which the agent must not undo). */
  private note(surface: A2uiSurfaceDto, notes: Set<string>, created: boolean): void {
    const title = surface.title ?? SURFACE_FALLBACK_TITLE
    const { surfaceId, sessionId } = surface
    if (surface.target === 'window') {
      if (this.windows?.isOpen(sessionId, surfaceId)) {
        if (created) notes.add(`Shown in its own window "${title}" (surface "${surfaceId}"). The user can close and reopen it.`)
      } else notes.add(`Surface "${surfaceId}": The user closed this window; it updates in the background.`)
    } else if (surface.target === 'sidebar') {
      if (surface.hidden) notes.add(`Surface "${surfaceId}": The user closed this sidebar tab; it updates in the background.`)
      else if (created) notes.add(`Shown in the chat's sidebar as "${title}" (surface "${surfaceId}"). The user can close and reopen it.`)
    }
  }

  private hasDesktop(sessionId: Id): boolean {
    return this.sessions.get(sessionId)?.desktopId != null
  }

  private remove(sessionId: Id, surfaceId: string): string[] {
    if (!this.surfaces.get(sessionId, surfaceId)) return [`unknown surface: ${surfaceId}`]
    this.windows?.close(sessionId, surfaceId) // the window row is not owned by the surface: close it first
    if (!this.surfaces.delete(sessionId, surfaceId)) return [`unknown surface: ${surfaceId}`]
    this.events.publish('surface.removed', { sessionId, surfaceId })
    this.windows?.refresh(sessionId)
    return []
  }

  private require(sessionId: Id, surfaceId: string, surface: A2uiSurfaceDto | null = this.surfaces.get(sessionId, surfaceId)): A2uiSurfaceDto {
    if (!surface) throw new AppError(`Unknown surface "${surfaceId}" in session ${sessionId}`)
    return surface
  }

  private publishTranscriptEntry(sessionId: Id, surfaceId: string): void {
    const entry = this.transcripts
      .list(sessionId)
      .findLast((e) => e.kind === 'a2ui' && e.surfaceId === surfaceId)
    if (entry) this.events.publish('transcript.upserted', { sessionId, entry })
  }

  /** The session an action belongs to: the event's own, else the newest session showing that surface. */
  private resolveSession(event: A2uiClientEvent): Id {
    if (event.sessionId !== undefined) return event.sessionId
    const owner = this.sessions.list().find((s) => this.surfaces.get(s.id, event.surfaceId))
    if (!owner) throw new AppError(`No session shows the surface "${event.surfaceId}"`)
    return owner.id
  }
}
