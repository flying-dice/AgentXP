import { writable, type Readable } from 'svelte/store'
import { MESSAGE_BOX_BUTTONS, type DialogResult, type MessageBoxButtons } from '../molecules/DialogButtons'
import type { MessageIconKind } from '../molecules/MessageIcon'

/** A button with its own words instead of a standard result ("Open Agents"); its `id` is what the box resolves with. */
export interface MessageBoxAction {
  id: string
  label: string
}

export interface MessageBoxOptions {
  text: string
  /** Title bar text. */
  caption?: string
  buttons?: MessageBoxButtons
  icon?: MessageIconKind | 'none'
  /** Index of the default (Enter) button. */
  defaultButton?: number
  /**
   * Buttons with their own words, in place of `buttons`. The box resolves with the `id` of the one picked; Esc picks the
   * last one (the way out, "Close"). Test ids are `message-box-action-<id>`.
   */
  actions?: readonly MessageBoxAction[]
}

export interface PendingMessageBox {
  id: number
  options: MessageBoxOptions
}

/** Queue of message boxes awaited by callers; `<MessageBoxHost />` shows the first one. */
export class MessageBoxService {
  private nextId = 1
  private readonly resolvers = new Map<number, (result: string) => void>()
  private items: PendingMessageBox[] = []
  private readonly store = writable<PendingMessageBox[]>([])

  readonly queue: Readable<PendingMessageBox[]> = { subscribe: this.store.subscribe }

  /** Resolves with the `id` of the picked action when `options.actions` is given, else with the standard result. */
  show(options: MessageBoxOptions & { actions: readonly MessageBoxAction[] }): Promise<string>
  show(options: MessageBoxOptions): Promise<DialogResult>
  show(options: MessageBoxOptions): Promise<string> {
    return new Promise((resolve) => {
      const id = this.nextId++
      this.resolvers.set(id, resolve)
      this.items = [...this.items, { id, options }]
      this.store.set(this.items)
    })
  }

  /** Called by the host when the user picks a button (or Esc). */
  settle(id: number, result: string): void {
    const resolve = this.resolvers.get(id)
    if (!resolve) return
    this.resolvers.delete(id)
    this.items = this.items.filter((item) => item.id !== id)
    this.store.set(this.items)
    resolve(result)
  }
}

export const messageBoxes = new MessageBoxService()

export function showMessageBox(options: MessageBoxOptions & { actions: readonly MessageBoxAction[] }): Promise<string>
export function showMessageBox(options: MessageBoxOptions): Promise<DialogResult>
export function showMessageBox(options: MessageBoxOptions): Promise<string> {
  return messageBoxes.show(options as MessageBoxOptions & { actions: readonly MessageBoxAction[] })
}

export const resultsFor = (buttons: MessageBoxButtons = 'OK'): DialogResult[] => MESSAGE_BOX_BUTTONS[buttons]
