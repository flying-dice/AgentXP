import type { Id, SessionDto, SessionRole } from '@shared/models'
import type { VPath } from '@shared/vfs'
import type { AgentRepository } from '../../domain/repositories/agent-repository'
import type { SessionRepository } from '../../domain/repositories/session-repository'
import type { PromptTurnInput } from '../SessionService'
import type { StopReason } from '../ports'
import type { ActionRunInput, ActionRunResult, ActionRunner } from './ports'

/** What the runner needs from the chat lifecycle (satisfied by `SessionService`). */
export interface ActionChats {
  create(desktopId: Id, agentId: Id | undefined, cwd: VPath, role?: SessionRole): Promise<SessionDto>
  rename(id: Id, title: string): void
  promptTurn(input: PromptTurnInput): Promise<StopReason>
  cancel(id: Id): Promise<void>
}

export interface AgentActionRunnerDeps {
  chats: ActionChats
  sessions: Pick<SessionRepository, 'get'>
  agents: Pick<AgentRepository, 'get' | 'getDefault'>
}

const pad = (n: number): string => String(n).padStart(2, '0')

/** `Nightly review - 11/17 09:00`: the title of a chat that a scheduled task starts, so the chat list shows where it came from. */
export const scheduledChatTitle = (taskName: string, at: Date): string => `${taskName} - ${at.getMonth() + 1}/${at.getDate()} ${pad(at.getHours())}:${pad(at.getMinutes())}`

const STOP_TEXT: Record<Exclude<StopReason, 'end_turn' | 'cancelled'>, string> = {
  max_tokens: 'The agent stopped because its answer got too long.',
  max_turn_requests: 'The agent stopped because it reached its limit of steps.',
  refusal: 'The agent refused the request.'
}

const failed = (message: string, sessionId: Id | null = null): ActionRunResult => ({ result: 'failed', message, sessionId })
const stopped = (sessionId: Id | null): ActionRunResult => ({ result: 'stopped', message: 'The agent was stopped before it finished.', sessionId })
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/**
 * The action "Run an agent": the scheduler does what a person does in a Chat window. It starts a chat on the desktop in the
 * project (or takes the chat that the action names), sends the prompt as the first message of the turn and waits for the
 * turn to end. The chat stays in the chat list: it is the record of what the agent did. The chat has no window, so tools
 * work as the open apps of the desktop allow, and a request for permission waits for an answer in the Action Center.
 */
export class AgentActionRunner implements ActionRunner {
  constructor(private readonly deps: AgentActionRunnerDeps) {}

  async run(input: ActionRunInput): Promise<ActionRunResult> {
    const { action, signal } = input
    if (signal.aborted) return stopped(null)
    let sessionId: Id | null = null
    try {
      const session = action.session === 'new' ? await this.startChat(input) : this.existingChat(input)
      if (typeof session === 'string') return failed(session)
      sessionId = session.id
      input.onSession(session.id)
      const cancel = (): void => void this.deps.chats.cancel(session.id).catch(() => {})
      if (signal.aborted) return stopped(sessionId)
      signal.addEventListener('abort', cancel, { once: true })
      try {
        const reason = await this.deps.chats.promptTurn({ sessionId: session.id, text: action.prompt, attachments: [] })
        if (signal.aborted || reason === 'cancelled') return stopped(sessionId)
        return reason === 'end_turn' ? { result: 'success', message: 'The agent finished its turn.', sessionId } : failed(STOP_TEXT[reason], sessionId)
      } finally {
        signal.removeEventListener('abort', cancel)
      }
    } catch (error) {
      return signal.aborted ? stopped(sessionId) : failed(messageOf(error), sessionId)
    }
  }

  /** A new chat; a problem comes back as a sentence. */
  private async startChat({ desktopId, action, taskName, startedAt }: ActionRunInput): Promise<SessionDto | string> {
    const agent = action.agentId === null ? this.deps.agents.getDefault() : this.deps.agents.get(action.agentId)
    if (!agent) return action.agentId === null ? 'There is no default agent. Add an agent in Control Center.' : 'The agent of this task no longer exists.'
    const session = await this.deps.chats.create(desktopId, agent.id, action.cwd)
    this.deps.chats.rename(session.id, scheduledChatTitle(taskName, startedAt))
    return session
  }

  private existingChat({ desktopId, action }: ActionRunInput): SessionDto | string {
    const session = action.sessionId === null ? null : this.deps.sessions.get(action.sessionId)
    if (!session || session.desktopId !== desktopId) return 'The chat of this task no longer exists.'
    if (session.status === 'working' || session.status === 'awaiting_permission') return 'The chat is busy with another message.'
    return session
  }
}
