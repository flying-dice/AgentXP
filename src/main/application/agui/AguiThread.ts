import { EventType, type Interrupt, type RunFinishedOutcome } from '@ag-ui/core'
import { isNoticeableStopReason, STOP_NOTICE_ACTIVITY_TYPE, type StopNoticeActivity } from '@shared/agui-state'
import type { Id, PermissionRequestDto } from '@shared/models'
import type { AgentSessionEvent } from '../../domain/agent/AgentSessionEvent'
import type { AppEventMessage } from '../FanOutEventPublisher'
import { AppError } from '../errors'
import { AgentEventTranslator, type AguiEvent } from './AgentEventTranslator'
import { AsyncQueue } from './AsyncQueue'
import { buildSessionState, type AguiQueries } from './buildSessionState'
import { permissionInterrupt } from './permissionInterrupt'
import { SessionStateModel } from './SessionStateModel'
import { surfaceRemovedEvent, surfaceSnapshotEvent } from './a2uiActivity'

/** The run currently streaming this thread's events to a client. */
export interface RunAttachment {
  runId: string
  queue: AsyncQueue<AguiEvent>
}

export interface AguiThreadDeps {
  queries: AguiQueries
  pendingPermissions(sessionId: Id): PermissionRequestDto[]
  newId(): string
}

/**
 * One AG-UI thread = one session. It owns the shared state and the translator, and routes what
 * happens in the session to the attached run (if any). The agent turn is independent of runs:
 * it survives a run that ended with an interrupt, and the next run attaches to it again.
 * While no run is attached the state keeps being tracked (the next run starts with a STATE_SNAPSHOT)
 * and messages are not translated (the next connect reads them from the transcript).
 */
export class AguiThread {
  readonly threadId: string
  /** User messages already turned into prompts (see `classifyRun`). */
  readonly handledMessageIds = new Set<string>()
  readonly model: SessionStateModel
  private readonly translator: AgentEventTranslator
  private attachment: RunAttachment | null = null
  private turn: Promise<void> | null = null

  constructor(
    readonly sessionId: Id,
    private readonly deps: AguiThreadDeps
  ) {
    this.threadId = String(sessionId)
    this.model = new SessionStateModel(buildSessionState(deps.queries, sessionId))
    this.translator = new AgentEventTranslator({
      newId: deps.newId,
      toolCall: (id) => this.model.current().toolCalls[id],
      terminal: (id) => this.model.current().terminals[id]
    })
  }

  get turnActive(): boolean {
    return this.turn !== null
  }

  /** Resolves when the running turn has ended (immediately when none runs). */
  turnSettled(): Promise<void> {
    return this.turn ?? Promise.resolve()
  }

  // ---- run attachment -------------------------------------------------------------------------------

  /** `takeover` replaces a run that is still attached (its stream just ends); otherwise that is an error. */
  attach(runId: string, takeover: boolean): RunAttachment {
    if (this.attachment) {
      if (!takeover) throw new AppError('Another run is already streaming this session')
      this.attachment.queue.close()
    }
    this.attachment = { runId, queue: new AsyncQueue<AguiEvent>() }
    return this.attachment
  }

  /** Ends the attachment (no-op when it was already replaced); open elements are forgotten, not closed. */
  detach(attachment: RunAttachment): void {
    attachment.queue.close()
    if (this.attachment !== attachment) return
    this.attachment = null
    this.translator.reset()
  }

  push(...events: AguiEvent[]): void {
    for (const event of events) this.attachment?.queue.push(event)
  }

  pushStateSnapshot(): void {
    this.push({ type: EventType.STATE_SNAPSHOT, snapshot: this.model.snapshot() })
  }

  /** Rebuilds the shared state from the persisted data. */
  resyncState(transcript?: Parameters<typeof buildSessionState>[2]): void {
    this.model.reset(buildSessionState(this.deps.queries, this.sessionId, transcript))
  }

  forgetOpenElements(): void {
    this.translator.reset()
  }

  // ---- turns ----------------------------------------------------------------------------------------

  /** Runs a turn in the background; the attached run (if any) is finished when it ends. */
  startTurn(work: () => Promise<string | void>): void {
    this.turn = (async () => work())().then(
      (stopReason) => {
        this.turn = null
        this.finishTurn(stopReason)
      },
      (error: unknown) => {
        this.turn = null
        this.fail(error)
      }
    )
  }

  /**
   * The turn ended with `stopReason`. Besides the outcome, a reason the user should know about (refusal,
   * output limit...) travels as `RUN_FINISHED.result` and as a stop-notice activity message in the transcript.
   */
  private finishTurn(stopReason: string | void): void {
    if (stopReason === 'cancelled') return this.finish({ type: 'cancelled' })
    if (!isNoticeableStopReason(stopReason)) return this.finish({ type: 'success' })
    const notice: AguiEvent = {
      type: EventType.ACTIVITY_SNAPSHOT,
      messageId: `stop:${this.deps.newId()}`,
      activityType: STOP_NOTICE_ACTIVITY_TYPE,
      content: { reason: stopReason } satisfies StopNoticeActivity,
      replace: true
    }
    this.finish({ type: 'success' }, { result: { stopReason }, before: [notice] })
  }

  // ---- finishing the attached run ---------------------------------------------------------------------

  /** RUN_FINISHED with outcome success (or cancelled); flushes open elements and pending state first. */
  finish(outcome: RunFinishedOutcome, extra: { result?: unknown; before?: AguiEvent[] } = {}): void {
    this.closeRun(
      { type: EventType.RUN_FINISHED, threadId: this.threadId, runId: this.attachment?.runId ?? '', outcome, ...(extra.result === undefined ? {} : { result: extra.result }) },
      extra.before
    )
  }

  /** RUN_FINISHED with the open permission requests as interrupts (the turn stays suspended). */
  finishWithInterrupts(): void {
    const interrupts: Interrupt[] = this.deps
      .pendingPermissions(this.sessionId)
      .map((request) => permissionInterrupt(request, this.model.current().toolCalls[request.toolCallId]))
    this.finish({ type: 'interrupt', interrupts })
  }

  fail(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    this.closeRun({ type: EventType.RUN_ERROR, message })
  }

  private closeRun(terminal: AguiEvent, before: AguiEvent[] = []): void {
    const attachment = this.attachment
    if (!attachment) return
    this.push(...this.translator.flush())
    this.pushStateDelta()
    this.push(...before, terminal)
    this.detach(attachment)
  }

  // ---- what happens in the session --------------------------------------------------------------------

  onAgentEvent(event: AgentSessionEvent): void {
    if (event.type === 'tool_call_created') this.model.toolCallCreated(event)
    else if (event.type === 'tool_call_updated') this.model.toolCallUpdated(event.toolCallId, event.patch)
    if (!this.attachment) return
    this.pushStateDelta()
    this.push(...this.translator.translate(event))
  }

  /** Applies a published app event of this session; returns nothing, pushes to the attached run. */
  onAppEvent(message: AppEventMessage): void {
    switch (message.name) {
      case 'session.changed':
        return this.updateState(() => this.model.setSession(message.payload))
      case 'desktop.changed':
        return this.updateState(() => this.model.setDesktop(message.payload))
      case 'tasks.changed':
        return this.updateState(() => this.model.setTasks(message.payload.tasks))
      case 'changes.changed':
        return this.updateState(() => this.model.setChanges(message.payload.changes))
      case 'terminal.changed':
        return this.updateState(() => this.model.setTerminal(message.payload))
      case 'surface.changed':
        return this.pushInterleaved(surfaceSnapshotEvent(message.payload))
      case 'surface.removed':
        return this.pushInterleaved(surfaceRemovedEvent(message.payload.surfaceId))
      case 'transcript.upserted': {
        // The permission broker completes a change (the file's current text) after the agent's event: the box reads this state.
        const { entry } = message.payload
        if (entry.kind === 'tool_call') this.updateState(() => this.model.setToolCallContents(entry.toolCallId, entry.contents))
        return
      }
      case 'transcript.cleared':
        return this.onTranscriptCleared()
      default:
        return
    }
  }

  private onTranscriptCleared(): void {
    this.resyncState()
    if (!this.attachment) return
    this.push(...this.translator.flush(), { type: EventType.MESSAGES_SNAPSHOT, messages: [] })
    this.pushStateSnapshot()
  }

  /** A permission request opened: the attached run ends with the interrupt. */
  onPermissionRequested(): void {
    if (this.attachment) this.finishWithInterrupts()
  }

  private updateState(change: () => void): void {
    change()
    if (this.attachment) this.pushStateDelta()
  }

  private pushStateDelta(): void {
    if (!this.attachment) return
    const delta = this.model.flush()
    if (delta.length > 0) this.push({ type: EventType.STATE_DELTA, delta })
  }

  /** An event of another kind than messages: open messages end before it. */
  private pushInterleaved(event: AguiEvent): void {
    if (!this.attachment) return
    this.push(...this.translator.closeOpenMessage(), event)
  }
}
