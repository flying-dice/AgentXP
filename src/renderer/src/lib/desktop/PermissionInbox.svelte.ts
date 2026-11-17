import type { Id } from '@shared/models'
import type { SessionStoreLike } from '../app/session/SessionStoreLike'
import { approvalFromInterrupt, type PendingApproval } from './approval'

/** The part of a session store the desktop shell needs (`SessionAgentStore` and the story fake both fit). */
export type InboxStore = Pick<SessionStoreLike, 'state' | 'pendingInterrupt' | 'running' | 'resolveInterrupt' | 'send'>

/**
 * The chats of one desktop and their pending permission requests, for the Action Center.
 *
 * It tracks one AG-UI session store per chat. The apps and the inbox get their stores from the same
 * place (`sessionStoresOf(host)` in lib/apps), so a Chat window and the Action Center answer through the
 * very same store. `register` lets a story supply a fake store.
 */
export class PermissionInbox {
  private entries = $state.raw<ReadonlyMap<Id, InboxStore>>(new Map())
  private readonly create: (sessionId: Id) => InboxStore
  /** The team chat room a session is a member of (its title), or null: names the room in the approvals. */
  private readonly roomOf: (sessionId: Id) => string | null

  /** Pending approvals across the desktop's chats, newest chat first. */
  readonly pending = $derived<PendingApproval[]>(
    [...this.entries]
      .reverse()
      .map(([sessionId, store]) => approvalFromInterrupt(sessionId, store.pendingInterrupt, store.state, this.roomOf(sessionId)))
      .filter((a): a is PendingApproval => a !== null)
  )

  /** `create` returns the (already connecting) store of a chat; the desktop passes the host's shared store cache. */
  constructor(create: (sessionId: Id) => InboxStore, roomOf: (sessionId: Id) => string | null = () => null) {
    this.create = create
    this.roomOf = roomOf
  }

  /** Ids of the chats the inbox knows. */
  get sessionIds(): Id[] {
    return [...this.entries.keys()]
  }

  /** All stores, for the activity feed and the context meter. */
  get stores(): ReadonlyMap<Id, InboxStore> {
    return this.entries
  }

  has(sessionId: Id): boolean {
    return this.entries.has(sessionId)
  }

  /** The store of a chat; created and connected on first use. */
  storeFor(sessionId: Id): InboxStore {
    const existing = this.entries.get(sessionId)
    if (existing) return existing
    const store = this.create(sessionId)
    this.entries = new Map(this.entries).set(sessionId, store)
    return store
  }

  /** Uses `store` for the chat (replaces an earlier one). The caller owns its lifecycle. */
  register(sessionId: Id, store: InboxStore): void {
    this.entries = new Map(this.entries).set(sessionId, store)
  }

  /** Forgets a chat (its session was deleted). */
  unregister(sessionId: Id): void {
    if (!this.entries.has(sessionId)) return
    const next = new Map(this.entries)
    next.delete(sessionId)
    this.entries = next
  }

  /** Answers a request through the owning chat's store: an option id, or null to cancel the turn. */
  async answer(approval: PendingApproval, optionId: string | null): Promise<void> {
    await this.entries.get(approval.sessionId)?.resolveInterrupt(optionId, approval.interruptId)
  }
}
