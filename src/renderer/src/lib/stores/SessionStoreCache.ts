import type { Id } from '@shared/models'
import { SessionAgentStore } from '../agui/SessionAgentStore.svelte'

/** Creates one `SessionAgentStore` per session on demand and disposes it when the session goes away. */
export class SessionStoreCache {
  private readonly stores = new Map<Id, SessionAgentStore>()
  private readonly create: (id: Id) => SessionAgentStore

  constructor(create: (id: Id) => SessionAgentStore = (id) => new SessionAgentStore(id)) {
    this.create = create
  }

  /** The store of a session; a new one connects (loads transcript and state) right away. */
  open(id: Id): SessionAgentStore {
    let store = this.stores.get(id)
    if (!store) {
      store = this.create(id)
      this.stores.set(id, store)
      void store.connect()
    }
    return store
  }

  has(id: Id): boolean {
    return this.stores.has(id)
  }

  /** The stores opened so far. */
  values(): SessionAgentStore[] {
    return [...this.stores.values()]
  }

  forget(id: Id): void {
    this.stores.get(id)?.dispose()
    this.stores.delete(id)
  }

  disposeAll(): void {
    for (const id of [...this.stores.keys()]) this.forget(id)
  }
}
