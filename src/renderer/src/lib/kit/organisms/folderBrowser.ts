import { writable, type Readable } from 'svelte/store'
import type { FolderBrowserPurpose, FolderBrowserSource } from './FolderBrowserDialog'

export interface FolderBrowserRequest {
  purpose: FolderBrowserPurpose
  source: FolderBrowserSource
}

export interface PendingFolderBrowser {
  id: number
  request: FolderBrowserRequest
}

/** Queue of Browse For Folder dialogs awaited by callers; `<FolderBrowserHost />` shows the first one. */
export class FolderBrowserService {
  private nextId = 1
  private readonly resolvers = new Map<number, (path: string | null) => void>()
  private items: PendingFolderBrowser[] = []
  private readonly store = writable<PendingFolderBrowser[]>([])

  readonly queue: Readable<PendingFolderBrowser[]> = { subscribe: this.store.subscribe }

  /** Resolves the chosen folder path, or null when the user cancels. */
  show(request: FolderBrowserRequest): Promise<string | null> {
    return new Promise((resolve) => {
      const id = this.nextId++
      this.resolvers.set(id, resolve)
      this.items = [...this.items, { id, request }]
      this.store.set(this.items)
    })
  }

  /** Called by the host when the user presses OK (a path) or Cancel (null). */
  settle(id: number, path: string | null): void {
    const resolve = this.resolvers.get(id)
    if (!resolve) return
    this.resolvers.delete(id)
    this.items = this.items.filter((item) => item.id !== id)
    this.store.set(this.items)
    resolve(path)
  }
}

export const folderBrowsers = new FolderBrowserService()

export const showFolderBrowser = (request: FolderBrowserRequest): Promise<string | null> => folderBrowsers.show(request)
