import type { Agent7Api } from '@shared/ipc'
import type { FolderDto, Id } from '@shared/models'

/** The registered workspace folders, kept current by the `folders.changed` event. */
export class FoldersStore {
  items = $state.raw<FolderDto[]>([])
  private readonly api: Agent7Api

  constructor(api: Agent7Api) {
    this.api = api
  }

  byId(id: Id | null | undefined): FolderDto | null {
    return id == null ? null : (this.items.find((f) => f.id === id) ?? null)
  }

  async load(): Promise<void> {
    this.items = await this.api.folders.list()
  }

  /** Subscribes to changes; returns the unsubscribe function. */
  start(): () => void {
    return this.api.on('folders.changed', (folders) => {
      this.items = folders
    })
  }

  /** Shows the native picker; null when cancelled. */
  async pick(): Promise<FolderDto | null> {
    const folder = await this.api.folders.pick()
    if (folder) await this.load()
    return folder
  }

  async remove(id: Id): Promise<void> {
    await this.api.folders.remove(id)
    await this.load()
  }
}
