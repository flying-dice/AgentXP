import type {
  AvailableCommandDto,
  Id,
  SessionDto,
  SessionModeDto,
  SessionModelDto,
  SessionRole,
  SessionStatus
} from '@shared/models'

export interface NewSession {
  agentId: Id
  title: string
  desktopId?: Id | null
  /** Working directory (VPath); default `AGENT_HOME`. */
  cwd?: string
  /** Default `chat`. */
  role?: SessionRole
}

export interface SessionRepository {
  /** Newest activity first; optionally restricted to one desktop. */
  list(desktopId?: Id): SessionDto[]
  get(id: Id): SessionDto | null
  getByAcpSessionId(agentId: Id, acpSessionId: string): SessionDto | null
  /** Chats of a desktop, newest activity first. */
  listByDesktop(desktopId: Id): SessionDto[]
  create(input: NewSession): SessionDto
  rename(id: Id, title: string): void
  /** Changes what the session is for: a chat pane conversation that is kept becomes a `chat` (it outlives its window). */
  setRole(id: Id, role: SessionRole): void
  setStatus(id: Id, status: SessionStatus): void
  /** Moves the chat to another agent program ("Try again with <agent>"): the old agent's ACP session, mode and model are forgotten. */
  setAgent(id: Id, agentId: Id): void
  setAcpSessionId(id: Id, acpSessionId: string | null): void
  setCurrentMode(id: Id, modeId: string | null): void
  setCurrentModel(id: Id, modelId: string | null): void
  replaceModes(id: Id, modes: SessionModeDto[]): void
  replaceModels(id: Id, models: SessionModelDto[]): void
  replaceCommands(id: Id, commands: AvailableCommandDto[]): void
  setUsage(id: Id, contextUsed: number, contextSize: number): void
  /** Bumps `updatedAt`. */
  touch(id: Id): void
  remove(id: Id): boolean
}
