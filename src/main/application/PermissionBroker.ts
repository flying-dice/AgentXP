import type { Id, PermissionRequestDto } from '@shared/models'
import type { PermissionDecision, PermissionPrompt, PermissionPrompter } from '../domain/agent/PermissionPrompter'
import type { PermissionRepository } from '../domain/repositories/permission-repository'
import type { TranscriptRepository } from '../domain/repositories/transcript-repository'
import { required } from './errors'
import type { EventPublisher } from './ports'
import type { SessionBroadcaster } from './SessionBroadcaster'

export interface PermissionChange {
  kind: 'requested' | 'resolved'
  request: PermissionRequestDto
}

export type PermissionObserver = (change: PermissionChange) => void

interface PendingRequest {
  sessionId: Id
  toolCallId: string
  resolve(decision: PermissionDecision): void
}

/** Turns agent permission prompts into persisted requests the user answers via `respond`. */
export class PermissionBroker {
  private readonly pending = new Map<Id, PendingRequest>()
  private readonly observers = new Set<PermissionObserver>()

  constructor(
    private readonly permissions: PermissionRepository,
    private readonly transcripts: TranscriptRepository,
    private readonly events: EventPublisher,
    private readonly broadcaster: SessionBroadcaster,
    /** Rewrites the tool call of a prompt before it is stored (host paths to virtual paths). */
    private readonly mapToolCall: (sessionId: Id, toolCall: PermissionPrompt['toolCall']) => PermissionPrompt['toolCall'] = (_id, toolCall) => toolCall
  ) {}

  /** Observes requests as they open and close; returns an unsubscribe function. */
  observe(observer: PermissionObserver): () => void {
    this.observers.add(observer)
    return () => this.observers.delete(observer)
  }

  /** Requests still waiting for an answer (optionally of one session). */
  pendingRequests(sessionId?: Id): PermissionRequestDto[] {
    return this.permissions.listPending(sessionId)
  }

  /** A prompter for one connection: every prompt it receives belongs to `sessionId`. */
  forSession(sessionId: Id): PermissionPrompter {
    return { prompt: (request) => this.prompt(sessionId, request) }
  }

  prompt(sessionId: Id, request: PermissionPrompt): Promise<PermissionDecision> {
    if (request.signal.aborted) return Promise.resolve({ outcome: 'cancelled' })
    this.transcripts.upsertToolCall(sessionId, { toolCallId: request.toolCallId, ...this.mapToolCall(sessionId, request.toolCall) })
    const stored = this.permissions.create(sessionId, request.toolCallId, request.options)
    this.broadcaster.setStatus(sessionId, 'awaiting_permission')
    this.publishToolCall(sessionId, request.toolCallId)
    this.notify('requested', stored.id)
    return new Promise((resolve) => {
      this.pending.set(stored.id, { sessionId, toolCallId: request.toolCallId, resolve })
      request.signal.addEventListener('abort', () => this.dismiss(stored.id), { once: true })
    })
  }

  /** The user's answer; `optionId` null dismisses the request. */
  respond(requestId: Id, optionId: string | null): void {
    required(this.permissions.get(requestId), 'Permission request')
    required(this.permissions.resolve(requestId, optionId), 'Permission option')
    this.complete(requestId, optionId)
  }

  private dismiss(requestId: Id): void {
    if (!this.pending.has(requestId)) return
    this.permissions.resolve(requestId, null)
    this.complete(requestId, null)
  }

  private complete(requestId: Id, optionId: string | null): void {
    const request = this.pending.get(requestId)
    if (!request) return
    this.pending.delete(requestId)
    this.notify('resolved', requestId)
    this.publishToolCall(request.sessionId, request.toolCallId)
    if (!this.hasPending(request.sessionId)) this.broadcaster.setStatus(request.sessionId, 'working')
    request.resolve(optionId === null ? { outcome: 'cancelled' } : { outcome: 'selected', optionId })
  }

  private notify(kind: PermissionChange['kind'], requestId: Id): void {
    const request = this.permissions.get(requestId)
    if (request) this.observers.forEach((observe) => observe({ kind, request }))
  }

  private hasPending(sessionId: Id): boolean {
    return [...this.pending.values()].some((p) => p.sessionId === sessionId)
  }

  private publishToolCall(sessionId: Id, toolCallId: string): void {
    const entry = this.transcripts.findToolCall(sessionId, toolCallId)
    if (entry) this.events.publish('transcript.upserted', { sessionId, entry })
  }
}
