import { buildResumeArray, randomUUID, type AgentSubscriber } from '@ag-ui/client'
import type { Context, ContentPart, Interrupt, Message, UserMessage } from '@ag-ui/core'
import type { A2uiClientEvent } from '@shared/a2ui'
import { emptyAguiState, type AguiSessionState } from '@shared/agui-state'
import type { AgentXPApi, AguiApi } from '@shared/ipc'
import { surfacesOf, type SurfaceActivity } from './activities'
import { decisionText, isAllow, permissionMetadata, requestLabel } from '../app/session/permissionOptions'
import { pathToFileUrl } from './fileUrl'
import { IpcAgent } from './IpcAgent'

/** The calls of the sessions API the store makes besides AG-UI (taking back a failed send, restarting the agent). */
export type SessionsRetryApi = Pick<AgentXPApi['sessions'], 'retry' | 'restartAgent'>

/** A send that did not go through: kept so the message can be sent again (and the composer gets its draft back). */
export interface FailedSend {
  messageId: string
  text: string
  /** Absolute paths attached to the message. */
  attachments: string[]
  /** True when the agent never answered it at all (it can be replaced); false when the turn stopped halfway. */
  unanswered: boolean
}

type ResumeResponses = Parameters<typeof buildResumeArray>[1]

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error))

const sameFiles = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((p, i) => p === b[i])

function userContent(text: string, attachments: string[]): string | ContentPart[] {
  if (attachments.length === 0) return text
  const files: ContentPart[] = attachments.map((path) => ({
    type: 'document',
    source: { type: 'url', value: pathToFileUrl(path) }
  }))
  return [...(text.trim() ? [{ type: 'text' as const, text }] : []), ...files]
}

/**
 * The renderer's view of one session: an AG-UI client (`IpcAgent`, thread id = session id) with its
 * messages, shared state, A2UI surfaces and pending permission interrupt exposed as Svelte state.
 * Message and state application is AbstractAgent's own; this class only mirrors the results.
 *
 * Usage: `await store.connect()` when the session is shown (and again after the transcript was
 * cleared), `store.send(...)` for prompts, `store.resolveInterrupt(optionId | null)` to answer a
 * permission request, `store.sendA2uiAction(event)` for clicks on surfaces, `store.cancel()` to stop.
 */
export class SessionAgentStore {
  readonly sessionId: number
  /** All messages of the thread (user, assistant incl. tool calls, tool, reasoning and activity messages). */
  messages = $state.raw<Message[]>([])
  /** The shared state: session info, tasks, changes, tool call details, terminals. */
  state = $state.raw<AguiSessionState>(emptyAguiState())
  /** True while a run (a prompt, a resume, a connect...) is streaming. */
  running = $state(false)
  error = $state<string | null>(null)
  /** The last send that failed (set with `error`), until it is sent again or the user sends something else. */
  failedSend = $state.raw<FailedSend | null>(null)
  /** Tool calls whose permission request the user denied (they show "Denied by you", not "Failed"). */
  deniedToolCalls = $state.raw<ReadonlySet<string>>(new Set())
  /** What the user answered to the last permission request ("You allowed: Change NOTE.md."), until the next message. */
  lastDecision = $state.raw<{ allowed: boolean; text: string } | null>(null)
  /** The user pressed Stop and the turn ended: the transcript says so until the next message. */
  stoppedByUser = $state(false)
  /** The user started a new chat with the text of a failed message: this chat says "Continued in a new chat" until it runs again (UX-201). */
  continued = $state(false)
  /** The failed request that a Reconnect did not send again (the chat offers "Send it again"); null when there is none (UX-195). */
  notResent = $state<string | null>(null)
  /** Messages of a cut-off turn that were sent again: the first shows "Stopped" and the repeat "Sent again", once each (UX-201). */
  stoppedIds = $state.raw<ReadonlySet<string>>(new Set())
  resentIds = $state.raw<ReadonlySet<string>>(new Set())
  /** The id of the cut-off message that the next `send` repeats. */
  private resendOf: string | null = null
  /** Interrupts of the last run that still wait for an answer. */
  interrupts = $state.raw<Interrupt[]>([])
  /** The first interrupt that has no answer yet (a tool permission request), or null. */
  pendingInterrupt = $derived(this.interrupts.find((i) => !(i.id in this.answers)) ?? null)
  /** A2UI surfaces by surface id, with the A2UI messages that build them. */
  activities = $derived<Map<string, SurfaceActivity>>(surfacesOf(this.messages))

  private answers = $state.raw<ResumeResponses>({})
  private readonly agent: IpcAgent
  private readonly subscription: { unsubscribe(): void }

  /** AG-UI context entries sent with every run; the desktop apps set it to the desktop state. */
  contextProvider: (() => Context[]) | undefined

  constructor(
    sessionId: number,
    api: AguiApi = window.agentxp.agui,
    private readonly sessionsApi: () => SessionsRetryApi = () => window.agentxp.sessions
  ) {
    this.sessionId = sessionId
    this.agent = new IpcAgent(api, { threadId: String(sessionId) })
    const subscriber: AgentSubscriber = {
      onMessagesChanged: ({ messages }) => {
        this.messages = [...messages]
      },
      onStateChanged: ({ state }) => {
        this.state = state as AguiSessionState
      },
      onRunInitialized: () => {
        this.running = true
      },
      onRunErrorEvent: ({ event }) => {
        this.error = event.message
      },
      onRunFailed: ({ error }) => {
        this.error = error.message
      },
      onRunFinalized: () => this.syncRunState()
    }
    this.subscription = this.agent.subscribe(subscriber)
  }

  private connection: Promise<void> = Promise.resolve()

  /** Loads the persisted messages and state (and follows a turn that is still running). */
  connect(): Promise<void> {
    const connecting = this.load()
    this.connection = connecting
    return connecting
  }

  /** Resolves when the latest `connect` has loaded the persisted transcript (at once when none is running). */
  whenConnected(): Promise<void> {
    return this.connection
  }

  private async load(): Promise<void> {
    this.error = null
    try {
      await this.agent.connectAgent()
    } catch (error) {
      this.error = messageOf(error)
    }
    this.syncRunState()
  }

  /**
   * Forgets the local transcript (after `sessions.clearTranscript`): messages, answers and interrupts go,
   * then the persisted (empty) messages and state are loaded, so no tool card stays "Running...".
   */
  async reload(): Promise<void> {
    this.failedSend = null
    this.stoppedByUser = false
    this.continued = false
    this.notResent = null
    this.stoppedIds = new Set()
    this.resentIds = new Set()
    this.deniedToolCalls = new Set()
    this.agent.setMessages([])
    this.messages = []
    this.interrupts = []
    this.answers = {}
    await this.connect()
  }

  /**
   * Sends a prompt; attachments are absolute paths. Ignored while a run streams or a permission request is open.
   * Resolves true when the turn went through, false when it was ignored or failed (see `failedSend`).
   */
  async send(text: string, attachments: string[] = []): Promise<boolean> {
    if (this.running || this.interrupts.length > 0) return false
    const previous = this.failedSend
    const repeatOf = this.resendOf
    this.resendOf = null
    this.failedSend = null
    this.stoppedByUser = false
    this.continued = false
    this.notResent = null
    this.lastDecision = null
    // The same text again after a failure ("Press Send to try again", also after Reconnect): the failed copy is taken back first,
    // so the message is in the transcript once (UX-162).
    if (previous?.unanswered && previous.text === text && sameFiles(previous.attachments, attachments)) {
      try {
        await this.withdraw(previous)
      } catch (error) {
        this.failedSend = previous
        this.error = messageOf(error)
        return false
      }
    }
    const message: UserMessage = { id: randomUUID(), role: 'user', content: userContent(text, attachments) }
    this.agent.addMessage(message)
    this.messages = [...this.agent.messages]
    if (repeatOf) {
      this.stoppedIds = new Set([...this.stoppedIds, repeatOf])
      this.resentIds = new Set([...this.resentIds, message.id])
    }
    await this.run()
    if (!this.error) return true
    const later = this.agent.messages.slice(this.agent.messages.findIndex((m) => m.id === message.id) + 1)
    this.failedSend = { messageId: message.id, text, attachments, unanswered: later.length === 0 }
    return false
  }

  /**
   * Sends the failed message again. An unanswered one is taken back first (here and in the transcript), so it is not
   * there twice; one that the agent had started to answer stays, and the new copy follows it. `restart` starts a fresh
   * agent program first ("Restart and send again").
   */
  async resend({ restart = false }: { restart?: boolean } = {}): Promise<boolean> {
    const failed = this.failedSend
    if (!failed || this.running) return false
    this.error = null
    try {
      if (restart) await this.sessionsApi().restartAgent(this.sessionId)
      await this.withdraw(failed)
    } catch (error) {
      this.error = messageOf(error)
      return false
    }
    this.failedSend = null
    // A turn that was cut off stays in the transcript: the repeat is marked, so the request is not listed twice without a word.
    this.resendOf = failed.unanswered ? null : failed.messageId
    return this.send(failed.text, failed.attachments)
  }

  /**
   * "Edit": takes the failed message back (it leaves the transcript) and returns it, so the composer can hold it
   * again. Null when there is no failed send or the agent already started on it.
   */
  async takeBack(): Promise<FailedSend | null> {
    const failed = this.failedSend
    if (!failed || !failed.unanswered || this.running) return null
    try {
      await this.withdraw(failed)
    } catch (error) {
      this.error = messageOf(error)
      return null
    }
    this.failedSend = null
    this.error = null
    return failed
  }

  /** Removes an unanswered message here and in the transcript. */
  private async withdraw(failed: FailedSend): Promise<void> {
    if (!failed.unanswered) return
    await this.sessionsApi().retry(this.sessionId)
    // A Reconnect loads the transcript again, so the copy may carry another id: the unanswered last message with the same text goes too.
    const content = JSON.stringify(userContent(failed.text, failed.attachments))
    const last = this.agent.messages.at(-1)
    this.agent.setMessages(this.agent.messages.filter((m) => m.id !== failed.messageId && !(m === last && m.role === 'user' && JSON.stringify(m.content) === content)))
    this.messages = [...this.agent.messages]
  }

  /**
   * Starts a fresh agent program for this chat ("Reconnect") and loads the chat again. A failed request is not sent by it: the chat
   * says so (`notResent`) unless `announce` is false (the user ended the program on purpose; nothing is owed).
   */
  async reconnect({ announce = true }: { announce?: boolean } = {}): Promise<void> {
    this.error = null
    try {
      await this.sessionsApi().restartAgent(this.sessionId)
    } catch (error) {
      this.error = messageOf(error)
      return
    }
    await this.connect()
    // The request that failed is not sent by a Reconnect: the chat says so and offers the button (UX-195).
    this.notResent = announce && !this.error ? (this.failedSend?.text ?? null) : null
  }

  /** "Start a new chat with your text": this chat keeps its history and says it went on elsewhere (UX-201). */
  markContinued(): void {
    this.continued = true
  }

  /**
   * Answers an open permission request with the chosen option id, or dismisses it with `null`.
   * Once every open interrupt is answered the run resumes and streams the rest of the turn.
   */
  async resolveInterrupt(optionId: string | null, interruptId: string | undefined = this.pendingInterrupt?.id): Promise<void> {
    if (interruptId === undefined || this.running) return
    this.noteDenial(interruptId, optionId)
    this.noteDecision(interruptId, optionId)
    this.answers = {
      ...this.answers,
      [interruptId]: optionId === null ? { status: 'cancelled' } : { status: 'resolved', payload: { optionId } }
    }
    if (this.interrupts.some((i) => !(i.id in this.answers))) return
    const resume = buildResumeArray(this.interrupts, this.answers)
    this.interrupts = []
    await this.run({ resume })
  }

  /** Remembers what the user answered, for the line the chat shows ("You allowed: ..."). A dismissed request counts as denied. */
  private noteDecision(interruptId: string, optionId: string | null): void {
    const interrupt = this.interrupts.find((i) => i.id === interruptId)
    const meta = interrupt ? permissionMetadata(interrupt.metadata) : null
    if (!interrupt || !meta) return
    const option = meta.options.find((o) => o.optionId === optionId)
    const allowed = option ? isAllow(option.kind) : false
    this.lastDecision = { allowed, text: decisionText(allowed, requestLabel(meta, interrupt.toolCallId ? this.state.toolCalls[interrupt.toolCallId] : undefined)) }
  }

  /** Remembers that the user denied the tool call this interrupt asked about (a dismissed request counts as denied). */
  private noteDenial(interruptId: string, optionId: string | null): void {
    const interrupt = this.interrupts.find((i) => i.id === interruptId)
    const toolCallId = interrupt?.toolCallId
    if (!toolCallId) return
    const option = permissionMetadata(interrupt.metadata)?.options.find((o) => o.optionId === optionId)
    const denied = optionId === null || option?.kind === 'reject_once' || option?.kind === 'reject_always'
    if (denied) this.deniedToolCalls = new Set([...this.deniedToolCalls, toolCallId])
  }

  /** Delivers a user action on an A2UI surface to the agent. */
  async sendA2uiAction(event: A2uiClientEvent): Promise<void> {
    if (this.running || this.interrupts.length > 0) return
    await this.run({ forwardedProps: { a2uiAction: event } })
  }

  /** Cancels the turn. When it was suspended on a permission request no run is streaming, so resync afterwards. */
  async cancel(): Promise<void> {
    const suspended = !this.running && this.interrupts.length > 0
    try {
      await this.agent.abort()
    } catch (error) {
      this.error = messageOf(error)
      return
    }
    this.stoppedByUser = true
    if (suspended) await this.connect()
  }

  /** Stops listening (the turn itself keeps going in main). */
  dispose(): void {
    this.subscription.unsubscribe()
    void this.agent.detachActiveRun()
  }

  private async run(parameters?: Parameters<IpcAgent['runAgent']>[0]): Promise<void> {
    this.error = null
    try {
      const context = this.contextProvider?.()
      await this.agent.runAgent(context ? { ...parameters, context } : parameters)
    } catch (error) {
      this.error = this.error ?? messageOf(error)
    }
    this.syncRunState()
  }

  private syncRunState(): void {
    this.running = false
    this.interrupts = [...this.agent.pendingInterrupts]
    this.answers = {}
  }
}
