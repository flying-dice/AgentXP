import { randomUUID } from 'node:crypto'
import { EventType, type ResumeEntry, type RunAgentInput } from '@ag-ui/core'
import type { Id, PermissionRequestDto } from '@shared/models'
import type { A2uiClientEvent } from '@shared/a2ui'
import type { AppEventMessage } from '../FanOutEventPublisher'
import type { PermissionChange } from '../PermissionBroker'
import type { SessionEventListener } from '../SessionEventBus'
import { AppError } from '../errors'
import type { PromptTurnInput } from '../SessionService'
import { surfaceSnapshotEvent } from './a2uiActivity'
import type { AguiEvent } from './AgentEventTranslator'
import { AguiThread, type RunAttachment } from './AguiThread'
import type { AguiQueries } from './buildSessionState'
import { resumeOptionId } from './permissionInterrupt'
import { classifyRun, type RunIntent } from './runIntent'
import { TranscriptMessageBuilder } from './transcriptMessages'

const ABORT_SETTLE_TIMEOUT_MS = 3000

/** The services the coordinator drives (all satisfied by the application services). */
export interface AguiRunCoordinatorDeps {
  queries: AguiQueries
  sessions: {
    promptTurn(input: PromptTurnInput): Promise<string>
    cancel(id: Id): Promise<void>
  }
  a2ui: { dispatch(event: A2uiClientEvent): Promise<void> }
  broker: {
    observe(observer: (change: PermissionChange) => void): () => void
    pendingRequests(sessionId?: Id): PermissionRequestDto[]
    respond(requestId: Id, optionId: string | null): void
  }
  /** Agent events of every session. */
  events: { subscribe(listener: SessionEventListener): () => void }
  /** Application events (session row, tasks, changes, terminals, surfaces...). */
  appEvents: { subscribe(listener: (message: AppEventMessage) => void): () => void }
  newId?: () => string
}

/** The seam the IPC transport talks to. */
export interface AguiRunner {
  run(input: RunAgentInput): AsyncGenerator<AguiEvent>
  abort(threadId: string, runId: string): Promise<void>
}

function parseThreadId(threadId: string): Id {
  if (!/^\d+$/.test(threadId)) throw new AppError(`Unknown thread "${threadId}": a thread id is a session id`)
  return Number(threadId)
}

/**
 * The AG-UI backend: one thread per session, one run = one view on the session. A run is one of
 *
 * - **prompt**: the input ends with a new user message; starts the turn, streams it until it ends or needs permission;
 * - **resume**: answers the permission interrupts of the previous run (broker `respond`) and keeps streaming the same turn;
 * - **a2ui action**: `forwardedProps.a2uiAction` is delivered to the agent as a (hidden) turn;
 * - **connect**: nothing of the above; sends MESSAGES_SNAPSHOT + STATE_SNAPSHOT from the persisted session, then ends
 *   (or, when a turn is still running, keeps streaming it / reports its pending interrupt).
 *
 * Translation of agent events lives in `AgentEventTranslator`; transport (IPC) is not its concern.
 */
export class AguiRunCoordinator implements AguiRunner {
  private readonly threads = new Map<Id, AguiThread>()
  private readonly unsubscribe: (() => void)[]
  private readonly newId: () => string

  constructor(private readonly deps: AguiRunCoordinatorDeps) {
    this.newId = deps.newId ?? randomUUID
    this.unsubscribe = [
      deps.events.subscribe((sessionId, event) => this.threads.get(sessionId)?.onAgentEvent(event)),
      deps.appEvents.subscribe((message) => this.route(message)),
      deps.broker.observe((change) => {
        if (change.kind === 'requested') this.threads.get(change.request.sessionId)?.onPermissionRequested()
      })
    ]
  }

  dispose(): void {
    this.unsubscribe.forEach((off) => off())
    this.threads.clear()
  }

  async *run(input: RunAgentInput): AsyncGenerator<AguiEvent> {
    yield { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId }
    let attached: { thread: AguiThread; attachment: RunAttachment } | null = null
    try {
      const thread = this.threadFor(parseThreadId(input.threadId))
      const intent = classifyRun(input, thread.handledMessageIds)
      if ((intent.kind === 'prompt' || intent.kind === 'a2ui') && thread.turnActive) {
        throw new AppError('The agent is still working on the previous turn')
      }
      attached = { thread, attachment: thread.attach(input.runId, intent.kind === 'connect' || intent.kind === 'resume') }
      try {
        await this.begin(thread, intent)
      } catch (error) {
        thread.fail(error)
      }
      yield* attached.attachment.queue
    } catch (error) {
      yield { type: EventType.RUN_ERROR, message: error instanceof Error ? error.message : String(error) }
    } finally {
      attached?.thread.detach(attached.attachment)
    }
  }

  /** Cancels the turn of the session `threadId` and waits (briefly) until it has ended. */
  async abort(threadId: string, _runId: string): Promise<void> {
    const sessionId = parseThreadId(threadId)
    const thread = this.threads.get(sessionId)
    if (!thread?.turnActive) return
    await this.deps.sessions.cancel(sessionId)
    await Promise.race([thread.turnSettled(), new Promise((resolve) => setTimeout(resolve, ABORT_SETTLE_TIMEOUT_MS))])
  }

  // ---- internals ------------------------------------------------------------------------------------

  private threadFor(sessionId: Id): AguiThread {
    let thread = this.threads.get(sessionId)
    if (!thread) {
      thread = new AguiThread(sessionId, {
        queries: this.deps.queries,
        pendingPermissions: (id) => this.deps.broker.pendingRequests(id),
        newId: this.newId
      })
      this.threads.set(sessionId, thread)
    }
    return thread
  }

  private route(message: AppEventMessage): void {
    switch (message.name) {
      case 'session.removed': {
        const thread = this.threads.get(message.payload.id)
        thread?.fail(new AppError('The session was removed'))
        this.threads.delete(message.payload.id)
        return
      }
      case 'session.changed':
        return this.threads.get(message.payload.id)?.onAppEvent(message)
      case 'desktop.changed':
        for (const thread of this.threads.values()) {
          if (thread.model.current().desktop?.desktopId === message.payload.desktopId) thread.onAppEvent(message)
        }
        return
      case 'surface.changed':
      case 'terminal.changed':
        return this.threads.get(message.payload.sessionId)?.onAppEvent(message)
      case 'tasks.changed':
      case 'changes.changed':
      case 'surface.removed':
      case 'transcript.cleared':
        return this.threads.get(message.payload.sessionId)?.onAppEvent(message)
      default:
        return
    }
  }

  private async begin(thread: AguiThread, intent: RunIntent): Promise<void> {
    switch (intent.kind) {
      case 'connect':
        return this.connect(thread)
      case 'resume':
        return this.resume(thread, intent.entries)
      case 'prompt':
        thread.handledMessageIds.add(intent.messageId)
        thread.pushStateSnapshot()
        thread.startTurn(() =>
          this.deps.sessions.promptTurn({
            sessionId: thread.sessionId,
            text: intent.text,
            attachments: intent.attachments,
            desktopContext: intent.desktopContext
          })
        )
        return
      case 'a2ui':
        thread.pushStateSnapshot()
        thread.startTurn(() => this.deps.a2ui.dispatch({ ...intent.event, sessionId: thread.sessionId }))
        return
    }
  }

  /** MESSAGES_SNAPSHOT + STATE_SNAPSHOT from the persisted session; then end, or follow the running turn. */
  private connect(thread: AguiThread): void {
    const { queries } = this.deps
    const transcript = queries.transcript(thread.sessionId)
    thread.resyncState(transcript)
    const surfaces = new Map(queries.surfacesOf(thread.sessionId).map((s) => [s.surfaceId, s]))
    const { messages, placedSurfaces } = new TranscriptMessageBuilder(thread.model.current(), surfaces).build(transcript)
    thread.push({ type: EventType.MESSAGES_SNAPSHOT, messages })
    thread.pushStateSnapshot()
    for (const surface of surfaces.values()) {
      if (!placedSurfaces.has(surface.surfaceId)) thread.push(surfaceSnapshotEvent(surface))
    }
    this.followTurn(thread)
  }

  private resume(thread: AguiThread, entries: ResumeEntry[]): void {
    thread.pushStateSnapshot()
    const pending = new Map(this.deps.broker.pendingRequests(thread.sessionId).map((r) => [String(r.id), r]))
    const answers = entries.filter((entry) => pending.has(entry.interruptId))
    for (const entry of answers) this.deps.broker.respond(Number(entry.interruptId), resumeOptionId(entry))
    // Stale interrupts (the turn ended or was cancelled meanwhile): behave like a connect so the client resyncs.
    if (answers.length === 0 && !thread.turnActive) return this.connect(thread)
    this.followTurn(thread)
  }

  /** After the opening events: nothing running ends the run, open permission requests interrupt it, else keep streaming. */
  private followTurn(thread: AguiThread): void {
    if (!thread.turnActive) return thread.finish({ type: 'success' })
    thread.forgetOpenElements()
    if (this.deps.broker.pendingRequests(thread.sessionId).length > 0) thread.finishWithInterrupts()
  }
}
