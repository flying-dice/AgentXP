import { basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { PromptInput } from '@shared/ipc'
import type { ContentBlockDto, Id, SessionDto } from '@shared/models'
import type { A2uiSurfaceRepository } from '../domain/repositories/a2ui-surface-repository'
import type { AgentRepository } from '../domain/repositories/agent-repository'
import type { FolderRepository } from '../domain/repositories/folder-repository'
import type { PermissionRepository } from '../domain/repositories/permission-repository'
import type { SessionRepository } from '../domain/repositories/session-repository'
import type { TranscriptRepository } from '../domain/repositories/transcript-repository'
import type { AgentConnectionPool } from './AgentConnectionPool'
import { AppError, required } from './errors'
import type { EventPublisher, StopReason } from './ports'
import type { SessionBroadcaster } from './SessionBroadcaster'
import type { SessionRuntime } from './SessionRuntime'

export const DEFAULT_SESSION_TITLE = 'New session'
const TITLE_MAX_LENGTH = 40

export interface SessionServiceDeps {
  sessions: SessionRepository
  agents: AgentRepository
  folders: FolderRepository
  transcripts: TranscriptRepository
  surfaces: A2uiSurfaceRepository
  permissions: PermissionRepository
  pool: AgentConnectionPool
  runtime: SessionRuntime
  broadcaster: SessionBroadcaster
  events: EventPublisher
}

/** A short single-line title taken from the start of a prompt. */
export function titleFromPrompt(text: string): string {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length <= TITLE_MAX_LENGTH ? line : `${line.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`
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

  async create(folderId: Id, agentId?: Id): Promise<SessionDto> {
    const { sessions, folders, runtime, events } = this.deps
    const folder = required(folders.get(folderId), 'Folder')
    const agent = required(agentId === undefined ? this.deps.agents.getDefault() : this.deps.agents.get(agentId), 'Agent')
    const session = sessions.create({ folderId: folder.id, agentId: agent.id, title: DEFAULT_SESSION_TITLE })
    folders.touch(folder.id)
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
  async promptTurn(input: PromptInput): Promise<StopReason> {
    const session = this.requireSession(input.sessionId)
    const blocks = toBlocks(input)
    if (blocks.length === 0) throw new AppError('Nothing to send')
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
    if (session.title !== DEFAULT_SESSION_TITLE || !title) return
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
      broadcaster.setStatus(sessionId, 'error')
      throw error
    }
  }
}
