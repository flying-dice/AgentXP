import { writable, type Readable } from 'svelte/store'
import { MESSAGE_BOX_BUTTONS, type DialogResult, type MessageBoxButtons } from '../molecules/DialogButtons'
import type { MessageIconKind } from '../molecules/MessageIcon'

export interface MessageBoxOptions {
  text: string
  /** Title bar text. */
  caption?: string
  buttons?: MessageBoxButtons
  icon?: MessageIconKind | 'none'
  /** Index of the default (Enter) button. */
  defaultButton?: number
}

export interface PendingMessageBox {
  id: number
  options: MessageBoxOptions
}

/** Queue of message boxes awaited by callers; `<MessageBoxHost />` shows the first one. */
export class MessageBoxService {
  private nextId = 1
  private readonly resolvers = new Map<number, (result: DialogResult) => void>()
  private items: PendingMessageBox[] = []
  private readonly store = writable<PendingMessageBox[]>([])

  readonly queue: Readable<PendingMessageBox[]> = { subscribe: this.store.subscribe }

  show(options: MessageBoxOptions): Promise<DialogResult> {
    return new Promise((resolve) => {
      const id = this.nextId++
      this.resolvers.set(id, resolve)
      this.items = [...this.items, { id, options }]
      this.store.set(this.items)
    })
  }

  /** Called by the host when the user picks a button (or Esc). */
  settle(id: number, result: DialogResult): void {
    const resolve = this.resolvers.get(id)
    if (!resolve) return
    this.resolvers.delete(id)
    this.items = this.items.filter((item) => item.id !== id)
    this.store.set(this.items)
    resolve(result)
  }
}

export const messageBoxes = new MessageBoxService()

export const showMessageBox = (options: MessageBoxOptions): Promise<DialogResult> => messageBoxes.show(options)

export const resultsFor = (buttons: MessageBoxButtons = 'OK'): DialogResult[] => MESSAGE_BOX_BUTTONS[buttons]
