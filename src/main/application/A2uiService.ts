import type { A2uiClientEvent, A2uiComponent, A2uiServerMessage } from '@shared/a2ui'
import { surfaceTitle } from '@shared/a2ui/messages'
import { A2uiMessageValidator } from '@shared/a2ui/validation'
import type { Id } from '@shared/models'
import type { A2uiMessageSink, A2uiSinkResult } from '../domain/a2ui/ports'
import type { A2uiSurfaceRepository } from '../domain/repositories/a2ui-surface-repository'
import type { SessionRepository } from '../domain/repositories/session-repository'
import type { TranscriptRepository } from '../domain/repositories/transcript-repository'
import { AppError } from './errors'
import type { EventPublisher } from './ports'

/** Lets the dispatcher send an input to the agent without recording it as a user message. */
export interface HiddenPrompter {
  sendHidden(sessionId: Id, text: string): Promise<void>
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
    private readonly validator: A2uiMessageValidator = new A2uiMessageValidator()
  ) {}

  async apply(sessionKey: string, messages: A2uiServerMessage[]): Promise<A2uiSinkResult> {
    const sessionId = sessionIdFromKey(sessionKey)
    if (sessionId === null || !this.sessions.get(sessionId)) return { ok: false, errors: [`unknown session: ${sessionKey}`] }
    // web_core replays the session's surfaces and applies the batch first: nothing is stored unless all of it is valid.
    const errors = this.validator.validateAgainst(this.surfaces.list(sessionId), messages)
    if (errors.length > 0) return { ok: false, errors }
    const failures = messages.flatMap((message) => this.applyOne(sessionId, message))
    return failures.length === 0 ? { ok: true } : { ok: false, errors: failures }
  }

  async dispatch(event: A2uiClientEvent): Promise<void> {
    await this.prompter.sendHidden(this.resolveSession(event), describeClientEvent(event))
  }

  private applyOne(sessionId: Id, message: A2uiServerMessage): string[] {
    if ('createSurface' in message) {
      const { surfaceId, catalogId, theme } = message.createSurface
      return this.create(sessionId, { surfaceId, catalogId, title: surfaceTitle({ theme }) })
    }
    if ('updateComponents' in message) {
      const { surfaceId, components } = message.updateComponents
      return this.publish(surfaceId, this.surfaces.upsertComponents(sessionId, surfaceId, components as A2uiComponent[]))
    }
    if ('updateDataModel' in message) {
      const { surfaceId, path, value } = message.updateDataModel
      // Omitting the value removes the key; at the root that leaves an empty model.
      const next = value === undefined && !path ? {} : value
      return this.publish(surfaceId, this.surfaces.updateDataModel(sessionId, surfaceId, path, next))
    }
    return this.remove(sessionId, message.deleteSurface.surfaceId)
  }

  private create(sessionId: Id, input: { surfaceId: string; catalogId: string; title: string | null }): string[] {
    const surface = this.surfaces.create(sessionId, input)
    this.publishTranscriptEntry(sessionId, input.surfaceId)
    this.events.publish('surface.changed', surface)
    return []
  }

  private publish(surfaceId: string, surface: ReturnType<A2uiSurfaceRepository['get']>): string[] {
    if (!surface) return [`unknown surface: ${surfaceId}`]
    this.events.publish('surface.changed', surface)
    return []
  }

  private remove(sessionId: Id, surfaceId: string): string[] {
    if (!this.surfaces.delete(sessionId, surfaceId)) return [`unknown surface: ${surfaceId}`]
    this.events.publish('surface.removed', { sessionId, surfaceId })
    return []
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
