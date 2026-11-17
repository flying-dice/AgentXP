import type { AgentXPApi } from '@shared/ipc'

/** What the refresh needs of a session store: whether a run is streaming and how to load the saved state again. */
export interface RefreshableStore {
  readonly running: boolean
  connect(): Promise<void>
}

/**
 * A revert changes the saved changes of a chat. A chat that is not running receives no pushed update, so every open Changes list
 * would keep the old rows. This loads the saved state of the idle stores again when a revert is announced (UX-79).
 * Returns the function that stops listening.
 */
export function refreshOnRevert(api: Pick<AgentXPApi, 'on'>, desktopId: number, stores: () => readonly RefreshableStore[]): () => void {
  return api.on('recycle.changed', (event) => {
    if (event.desktopId !== desktopId) return
    for (const store of stores()) if (!store.running) void store.connect()
  })
}
