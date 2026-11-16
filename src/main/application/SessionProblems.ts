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
  /** Failures in a row per chat: a restart or a start that worked clears the problem but not this, only a completed turn does. */
  private readonly failures = new Map<Id, number>()

  get(sessionId: Id): SessionProblemDto | null {
    return this.problems.get(sessionId) ?? null
  }

  /** Records a failure; the problem carries how many times in a row this chat failed (`failures`). */
  set(sessionId: Id, problem: SessionProblemDto): void {
    // One crash is reported twice (the connection closes, then the running turn fails): while the problem is still open it counts once.
    const open = this.problems.get(sessionId)
    const again = open?.kind === problem.kind && problem.kind === 'agent-stopped'
    const failures = again ? (open?.failures ?? 1) : (this.failures.get(sessionId) ?? 0) + 1
    this.failures.set(sessionId, failures)
    this.problems.set(sessionId, { ...problem, failures })
  }

  /** Takes the problem away (a restart is about to try again); the count of failures in a row stays. */
  clear(sessionId: Id): void {
    this.problems.delete(sessionId)
  }

  /** A turn completed without a failure (not merely a start): no problem, and the next failure is the first again. */
  recovered(sessionId: Id): void {
    this.problems.delete(sessionId)
    this.failures.delete(sessionId)
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
  setAgent(id: Id, agentId: Id): void {
    this.inner.setAgent(id, agentId)
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
    this.problems.recovered(id)
    return this.inner.remove(id)
  }
}
