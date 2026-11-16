import { buildResumeArray, randomUUID, type AgentSubscriber } from '@ag-ui/client'
import type { Context, ContentPart, Interrupt, Message, UserMessage } from '@ag-ui/core'
import type { A2uiClientEvent } from '@shared/a2ui'
import { emptyAguiState, type AguiSessionState } from '@shared/agui-state'
import type { AguiApi } from '@shared/ipc'
import { surfacesOf, type SurfaceActivity } from './activities'
import { pathToFileUrl } from './fileUrl'
import { IpcAgent } from './IpcAgent'

type ResumeResponses = Parameters<typeof buildResumeArray>[1]

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error))

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

  constructor(sessionId: number, api: AguiApi = window.agent7.agui) {
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

  /** Loads the persisted messages and state (and follows a turn that is still running). */
  async connect(): Promise<void> {
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
    this.agent.setMessages([])
    this.messages = []
    this.interrupts = []
    this.answers = {}
    await this.connect()
  }

  /** Sends a prompt; attachments are absolute paths. Ignored while a run streams or a permission request is open. */
  async send(text: string, attachments: string[] = []): Promise<void> {
    if (this.running || this.interrupts.length > 0) return
    const message: UserMessage = { id: randomUUID(), role: 'user', content: userContent(text, attachments) }
    this.agent.addMessage(message)
    this.messages = [...this.agent.messages]
    await this.run()
  }

  /**
   * Answers an open permission request with the chosen option id, or dismisses it with `null`.
   * Once every open interrupt is answered the run resumes and streams the rest of the turn.
   */
  async resolveInterrupt(optionId: string | null, interruptId: string | undefined = this.pendingInterrupt?.id): Promise<void> {
    if (interruptId === undefined || this.running) return
    this.answers = {
      ...this.answers,
      [interruptId]: optionId === null ? { status: 'cancelled' } : { status: 'resolved', payload: { optionId } }
    }
    if (this.interrupts.some((i) => !(i.id in this.answers))) return
    const resume = buildResumeArray(this.interrupts, this.answers)
    this.interrupts = []
    await this.run({ resume })
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
