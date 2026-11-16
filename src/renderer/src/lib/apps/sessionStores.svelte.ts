/**
 * Session stores of one desktop. Every app that needs the live state of a chat (Chat, Explorer,
 * Code, Terminal, Agent Manager) goes through here, so each chat has exactly one AG-UI store.
 * On a desktop page the stores come from the shell's `PermissionInbox` (the Action Center answers
 * through the very same store); elsewhere (stories) the apps keep their own.
 *
 * Every store gets a context provider, so each run carries the desktop state as AG-UI context.
 */
import { SvelteMap } from 'svelte/reactivity'
import { untrack } from 'svelte'
import type { Context } from '@ag-ui/core'
import { DESKTOP_CONTEXT_DESCRIPTION } from '@shared/desktop'
import type { Id } from '@shared/models'
import { SessionAgentStore } from '../agui/SessionAgentStore.svelte'
import { getDesktopContext } from '../desktop/context'
import type { PermissionInbox } from '../desktop/PermissionInbox.svelte'
import type { DesktopHost } from './types'

export interface SessionStores {
  /** The store of an open chat, or undefined. Reactive: safe inside `$derived`. */
  peek(id: Id): SessionAgentStore | undefined
  /** Opens (creates and connects) a store. Call from effects and handlers, never from `$derived`. */
  open(id: Id): SessionAgentStore
}

const contextOf = (host: DesktopHost): Context[] => [{ description: DESKTOP_CONTEXT_DESCRIPTION, value: JSON.stringify(host.state) }]

function withContext(host: DesktopHost, store: SessionAgentStore): SessionAgentStore {
  store.contextProvider ??= () => contextOf(host)
  return store
}

class LocalStores implements SessionStores {
  private readonly stores = new SvelteMap<Id, SessionAgentStore>()
  private readonly host: DesktopHost

  constructor(host: DesktopHost) {
    this.host = host
  }

  peek(id: Id): SessionAgentStore | undefined {
    return this.stores.get(id)
  }

  open(id: Id): SessionAgentStore {
    let store = this.stores.get(id)
    if (!store) {
      store = withContext(this.host, new SessionAgentStore(id, this.host.api.agui))
      this.stores.set(id, store)
      void store.connect()
    }
    return store
  }
}

class InboxStores implements SessionStores {
  private readonly inbox: PermissionInbox
  private readonly host: DesktopHost

  constructor(host: DesktopHost, inbox: PermissionInbox) {
    this.host = host
    this.inbox = inbox
  }

  peek(id: Id): SessionAgentStore | undefined {
    return this.inbox.stores.get(id) as SessionAgentStore | undefined
  }

  open(id: Id): SessionAgentStore {
    return withContext(this.host, this.inbox.storeFor(id) as SessionAgentStore)
  }
}

const locals = new WeakMap<DesktopHost, LocalStores>()

/** Call during component initialisation (it reads the desktop context). */
export function useSessionStores(host: DesktopHost): SessionStores {
  try {
    return new InboxStores(host, getDesktopContext().inbox)
  } catch {
    let local = locals.get(host)
    if (!local) locals.set(host, (local = new LocalStores(host)))
    return local
  }
}

/** Ids of the chats that have a window on the desktop (minimised ones included). */
export function chatSessionIds(host: DesktopHost): Id[] {
  const ids: Id[] = []
  for (const w of host.state.windows) if (w.view.app === 'chat' && w.view.sessionId > 0 && !ids.includes(w.view.sessionId)) ids.push(w.view.sessionId)
  return ids
}

/** The stores of every chat window of the desktop (opened on demand). Call during component initialisation. */
export function useDesktopStores(host: DesktopHost): { readonly list: SessionAgentStore[]; readonly stores: SessionStores } {
  const stores = useSessionStores(host)
  $effect(() => {
    for (const id of chatSessionIds(host)) untrack(() => stores.open(id))
  })
  const list = $derived(chatSessionIds(host).flatMap((id) => stores.peek(id) ?? []))
  return {
    get list() {
      return list
    },
    stores
  }
}
