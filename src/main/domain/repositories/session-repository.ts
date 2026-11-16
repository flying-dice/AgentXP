import type {
  AvailableCommandDto,
  Id,
  SessionDto,
  SessionModeDto,
  SessionModelDto,
  SessionStatus
} from '@shared/models'

export interface NewSession {
  agentId: Id
  title: string
  desktopId?: Id | null
  /** Working directory (VPath); default `AGENT_HOME`. */
  cwd?: string
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
  setStatus(id: Id, status: SessionStatus): void
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
