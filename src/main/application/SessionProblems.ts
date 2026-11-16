import type {
  AvailableCommandDto,
  Id,
  SessionDto,
  SessionModeDto,
  SessionModelDto,
  SessionProblemDto,
  SessionStatus
} from '@shared/models'
import type { NewSession, SessionRepository } from '../domain/repositories/session-repository'

/**
 * What is wrong with a chat's agent right now (could not start, stopped, ended), by session. In memory on purpose:
 * a problem describes the live agent program, and the next successful start clears it. `ProblemAwareSessions` lets
 * every reader of the session row (the renderer's `session.changed`, `sessions.get`, the AG-UI state) see it
 * without a stored column.
 */
export class SessionProblems {
  private readonly problems = new Map<Id, SessionProblemDto>()

  get(sessionId: Id): SessionProblemDto | null {
    return this.problems.get(sessionId) ?? null
  }

  set(sessionId: Id, problem: SessionProblemDto): void {
    this.problems.set(sessionId, problem)
  }

  clear(sessionId: Id): void {
    this.problems.delete(sessionId)
  }

  /** The row with its problem attached (the row itself when there is none). */
  decorate(session: SessionDto): SessionDto {
    const problem = this.problems.get(session.id)
    return problem ? { ...session, problem } : session
  }
}

/** A session repository whose rows carry the problems of a `SessionProblems`; every write goes to the inner repository. */
export class ProblemAwareSessions implements SessionRepository {
  constructor(
    private readonly inner: SessionRepository,
    private readonly problems: SessionProblems
  ) {}

  private one(session: SessionDto | null): SessionDto | null {
    return session ? this.problems.decorate(session) : null
  }

  list(desktopId?: Id): SessionDto[] {
    return this.inner.list(desktopId).map((s) => this.problems.decorate(s))
  }
  get(id: Id): SessionDto | null {
    return this.one(this.inner.get(id))
  }
  getByAcpSessionId(agentId: Id, acpSessionId: string): SessionDto | null {
    return this.one(this.inner.getByAcpSessionId(agentId, acpSessionId))
  }
  listByDesktop(desktopId: Id): SessionDto[] {
    return this.inner.listByDesktop(desktopId).map((s) => this.problems.decorate(s))
  }
  create(input: NewSession): SessionDto {
    return this.problems.decorate(this.inner.create(input))
  }
  rename(id: Id, title: string): void {
    this.inner.rename(id, title)
  }
  setStatus(id: Id, status: SessionStatus): void {
    this.inner.setStatus(id, status)
  }
  setAcpSessionId(id: Id, acpSessionId: string | null): void {
    this.inner.setAcpSessionId(id, acpSessionId)
  }
  setCurrentMode(id: Id, modeId: string | null): void {
    this.inner.setCurrentMode(id, modeId)
  }
  setCurrentModel(id: Id, modelId: string | null): void {
    this.inner.setCurrentModel(id, modelId)
  }
  replaceModes(id: Id, modes: SessionModeDto[]): void {
    this.inner.replaceModes(id, modes)
  }
  replaceModels(id: Id, models: SessionModelDto[]): void {
    this.inner.replaceModels(id, models)
  }
  replaceCommands(id: Id, commands: AvailableCommandDto[]): void {
    this.inner.replaceCommands(id, commands)
  }
  setUsage(id: Id, contextUsed: number, contextSize: number): void {
    this.inner.setUsage(id, contextUsed, contextSize)
  }
  touch(id: Id): void {
    this.inner.touch(id)
  }
  remove(id: Id): boolean {
    this.problems.clear(id)
    return this.inner.remove(id)
  }
}
