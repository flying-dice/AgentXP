import type { Agent7Api } from '@shared/ipc'
import type { Id, SessionDto } from '@shared/models'

/** All sessions, kept current by `session.changed` / `session.removed`. */
export class SessionsStore {
  items = $state.raw<SessionDto[]>([])
  private readonly api: Agent7Api['sessions']

  constructor(api: Agent7Api['sessions']) {
    this.api = api
  }

  byId(id: Id | null | undefined): SessionDto | null {
    return id == null ? null : (this.items.find((s) => s.id === id) ?? null)
  }

  forFolder(folderId: Id): SessionDto[] {
    return this.items.filter((s) => s.folderId === folderId)
  }

  async load(): Promise<void> {
    this.items = await this.api.list()
  }

  upsert(session: SessionDto): void {
    const at = this.items.findIndex((s) => s.id === session.id)
    this.items = at < 0 ? [...this.items, session] : this.items.map((s) => (s.id === session.id ? session : s))
  }

  drop(id: Id): void {
    this.items = this.items.filter((s) => s.id !== id)
  }

  /** Subscribes to changes; `onremoved` runs after a session disappeared. Returns the unsubscribe function. */
  start(api: Agent7Api, onremoved?: (id: Id) => void): () => void {
    const offChanged = api.on('session.changed', (session) => this.upsert(session))
    const offRemoved = api.on('session.removed', ({ id }) => {
      this.drop(id)
      onremoved?.(id)
    })
    return () => {
      offChanged()
      offRemoved()
    }
  }

  async create(folderId: Id, agentId?: Id): Promise<SessionDto> {
    const session = await this.api.create(folderId, agentId)
    this.upsert(session)
    return session
  }

  async rename(id: Id, title: string): Promise<void> {
    await this.api.rename(id, title)
    const current = this.byId(id)
    if (current) this.upsert({ ...current, title })
  }

  async remove(id: Id): Promise<void> {
    await this.api.remove(id)
    this.drop(id)
  }
}
