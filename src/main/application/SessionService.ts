import { basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { PromptInput } from '@shared/ipc'
import { AGENT_HOME, normaliseVPath, vpathName, type VPath } from '@shared/vfs'
import type { ContentBlockDto, Id, SessionDto, SessionRole } from '@shared/models'
import type { A2uiSurfaceRepository } from '../domain/repositories/a2ui-surface-repository'
import type { AgentRepository } from '../domain/repositories/agent-repository'
import type { PermissionRepository } from '../domain/repositories/permission-repository'
import type { SessionRepository } from '../domain/repositories/session-repository'
import type { TranscriptRepository } from '../domain/repositories/transcript-repository'
import type { AgentConnectionPool } from './AgentConnectionPool'
import { desktopBlock } from './desktop/desktopBlock'
import { isConnectionLoss, stoppedUnexpectedly } from './agentProblems'
import { AppError, required } from './errors'
import type { EventPublisher, StopReason } from './ports'
import type { SessionBroadcaster } from './SessionBroadcaster'
import type { SessionProblems } from './SessionProblems'
import type { SessionRuntime } from './SessionRuntime'
import type { VirtualFileSystem } from './vfs/VirtualFileSystem'

export const DEFAULT_SESSION_TITLE = 'New chat'
/** The title chats got before they were called "New chat"; such a chat is still untitled. */
const LEGACY_DEFAULT_TITLE = 'New session'
const TITLE_MAX_LENGTH = 40

export interface SessionServiceDeps {
  sessions: SessionRepository
  agents: AgentRepository
  /** Validates a chat's working directory (its drive is plugged in and the folder exists). */
  vfs: Pick<VirtualFileSystem, 'stat'>
  transcripts: TranscriptRepository
  surfaces: A2uiSurfaceRepository
  permissions: PermissionRepository
  pool: AgentConnectionPool
  runtime: SessionRuntime
  broadcaster: SessionBroadcaster
  events: EventPublisher
  /** Where problems of the agent program are kept for the UI (see `SessionProblems`). */
  problems?: SessionProblems
  /** The desktop state of a chat as JSON, for the prompt's desktop resource block. */
  desktopContext?: { contextOfSession(sessionId: Id): string | null }
}

/** A short single-line title taken from the start of a prompt. */
export function titleFromPrompt(text: string): string {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length <= TITLE_MAX_LENGTH ? line : `${line.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`
}

/** A prompt, plus the desktop state the AG-UI client sent with it (`RunAgentInput.context`). */
export interface PromptTurnInput extends PromptInput {
  desktopContext?: string | null
}

const toBlocks = ({ text, attachments }: PromptInput): ContentBlockDto[] => [
  ...(text.trim() ? [{ kind: 'text' as const, text }] : []),
  ...attachments.map((path) => ({
    kind: 'resource_link' as const,
    uri: pathToFileURL(path).href,
    name: basename(path),
    mimeType: null
  }))
]

/** Session lifecycle and conversation turns. */
export class SessionService {
  constructor(private readonly deps: SessionServiceDeps) {}

  /**
   * Starts a chat on a desktop. `cwd` (a VPath on C: or a plugged-in drive) defaults to `AGENT_HOME`. `role` is
   * `review` for the reviewer of a Code Review window and `aside` for an embedded chat panel (default `chat`).
   *
   * With `options.background` the agent starts after this returns (the row is `connecting`): a Chat window can open and
   * take typing at once, and an agent that fails to start leaves the chat in place with its problem (`SessionDto.problem`)
   * instead of removing it. Without it the agent is up (or the call throws and the row is gone) when this returns.
   */
  async create(
    desktopId: Id,
    agentId?: Id,
    cwd: VPath = AGENT_HOME,
    role: SessionRole = 'chat',
    options: { background?: boolean } = {}
  ): Promise<SessionDto> {
    const { sessions, runtime, events } = this.deps
    const agent = required(agentId === undefined ? this.deps.agents.getDefault() : this.deps.agents.get(agentId), 'Agent')
    const workingDirectory = normaliseVPath(cwd)
    if (!workingDirectory) throw new AppError(`Not a valid working directory: ${cwd}`)
    const folder = await this.deps.vfs.stat(desktopId, workingDirectory)
    if (folder?.kind !== 'directory') throw new AppError(`The working directory ${workingDirectory} does not exist.`)
    const title = role === 'review' ? `Review of ${vpathName(workingDirectory)}` : DEFAULT_SESSION_TITLE
    const session = sessions.create({ agentId: agent.id, desktopId, cwd: workingDirectory, title, role })
    if (options.background) {
      this.deps.broadcaster.setStatus(session.id, 'connecting')
      void runtime.ensureConnected(session.id).catch(() => {}) // the failure is the session's problem, shown in its window
      return required(sessions.get(session.id), 'Session')
    }
    try {
      await runtime.ensureConnected(session.id)
    } catch (error) {
      sessions.remove(session.id)
      events.publish('session.removed', { id: session.id })
      throw error
    }
    return required(sessions.get(session.id), 'Session')
  }

  rename(id: Id, title: string): void {
    const trimmed = title.trim()
    if (!trimmed) throw new AppError('The session needs a title')
    this.requireSession(id)
    this.deps.sessions.rename(id, trimmed)
    this.deps.broadcaster.refresh(id)
  }

  async remove(id: Id): Promise<void> {
    this.requireSession(id)
    await this.deps.pool.dispose(id)
    this.deps.sessions.remove(id)
    this.deps.events.publish('session.removed', { id })
  }

  /** Persists the user's message, then runs the turn until the agent stops. */
  async prompt(input: PromptInput): Promise<void> {
    await this.promptTurn(input)
  }

  /** Like `prompt`, but resolves with the stop reason when the turn ends (one run = one turn). */
  async promptTurn(input: PromptTurnInput): Promise<StopReason> {
    const session = this.requireSession(input.sessionId)
    const userBlocks = toBlocks(input)
    if (userBlocks.length === 0) throw new AppError('Nothing to send')
    // Main is the truth about the desktop: what the client sent is used, otherwise the current state.
    const desktop = input.desktopContext ?? this.deps.desktopContext?.contextOfSession(session.id) ?? null
    const blocks = desktop ? [desktopBlock(desktop), ...userBlocks] : userBlocks
    const entry = this.deps.transcripts.appendMessage(session.id, 'user', blocks)
    this.deps.events.publish('transcript.upserted', { sessionId: session.id, entry })
    this.autoTitle(session, input.text)
    return this.runTurn(session.id, blocks)
  }

  /** Runs a turn for an input the user did not type (e.g. an A2UI action); nothing is added to the transcript. */
  async sendHidden(sessionId: Id, text: string): Promise<void> {
    this.requireSession(sessionId)
    await this.runTurn(sessionId, [{ kind: 'text', text }])
  }

  /**
   * Takes back the message of a send that never got an answer (the connection dropped before the agent replied), so
   * that sending it again does not leave it in the transcript twice. False when the last entry is not such a message.
   */
  retry(id: Id): boolean {
    this.requireSession(id)
    return this.deps.transcripts.removeLastUserMessage(id)
  }

  /** Ends the agent program of a chat (if it runs) and starts a fresh one: "Reconnect" and "Restart". */
  async restartAgent(id: Id): Promise<void> {
    const { pool, problems, broadcaster, runtime } = this.deps
    this.requireSession(id)
    await pool.dispose(id)
    problems?.clear(id)
    broadcaster.setStatus(id, 'closed')
    await runtime.ensureConnected(id).catch(() => {}) // a failed start is the session's problem again
  }

  async cancel(id: Id): Promise<void> {
    const live = this.deps.pool.get(this.requireSession(id).id)
    await live?.connection.cancel(live.acpSessionId)
  }

  async setMode(id: Id, modeId: string): Promise<void> {
    const live = await this.deps.runtime.ensureConnected(this.requireSession(id).id)
    await live.connection.setMode(live.acpSessionId, modeId)
    this.deps.sessions.setCurrentMode(id, modeId)
    this.deps.broadcaster.refresh(id)
  }

  async setModel(id: Id, modelId: string): Promise<void> {
    const live = await this.deps.runtime.ensureConnected(this.requireSession(id).id)
    await live.connection.setModel(live.acpSessionId, modelId)
    this.deps.sessions.setCurrentModel(id, modelId)
    this.deps.broadcaster.refresh(id)
  }

  clearTranscript(id: Id): void {
    const { surfaces, transcripts, events } = this.deps
    this.requireSession(id)
    const surfaceIds = surfaces.list(id).map((s) => s.surfaceId)
    transcripts.clear(id)
    surfaceIds.forEach((surfaceId) => events.publish('surface.removed', { sessionId: id, surfaceId }))
    events.publish('transcript.cleared', { sessionId: id })
  }

  /** Marks sessions left over from a previous run as closed; they reconnect lazily on next use. */
  recoverAfterRestart(): void {
    const { sessions, permissions, broadcaster } = this.deps
    for (const session of sessions.list()) {
      permissions.cancelPending(session.id)
      if (session.status !== 'closed') broadcaster.setStatus(session.id, 'closed')
    }
  }

  private requireSession(id: Id): SessionDto {
    return required(this.deps.sessions.get(id), 'Session')
  }

  private autoTitle(session: SessionDto, text: string): void {
    const title = titleFromPrompt(text)
    if ((session.title !== DEFAULT_SESSION_TITLE && session.title !== LEGACY_DEFAULT_TITLE) || !title) return
    this.deps.sessions.rename(session.id, title)
  }

  private async runTurn(sessionId: Id, blocks: ContentBlockDto[]): Promise<StopReason> {
    const { runtime, broadcaster, sessions } = this.deps
    try {
      const live = await runtime.ensureConnected(sessionId)
      broadcaster.setStatus(sessionId, 'working')
      const stopReason = await live.connection.prompt(live.acpSessionId, blocks)
      sessions.touch(sessionId)
      broadcaster.setStatus(sessionId, 'idle')
      return stopReason
    } catch (error) {
      if (isConnectionLoss(error)) this.deps.problems?.set(sessionId, stoppedUnexpectedly(error))
      broadcaster.setStatus(sessionId, 'error')
      throw error
    }
  }
}
