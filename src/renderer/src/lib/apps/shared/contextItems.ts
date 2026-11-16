/**
 * Pure builders of the context menu items that several apps share: the "Ask chat about this" group, the text
 * editing operations of a textarea and the line range of a selection. Test ids are `<app>-ctx-<action>`.
 */
import type { AskChatRequest } from '@shared/desktop'
import type { MenuItemDef } from '../../kit/molecules/MenuItem'
import type { EditOps } from '../../kit/molecules/standardMenu'

export interface AskChatItemsOptions {
  /** Explain this and Send selection need text. */
  hasSelection: boolean
  /** Builds and sends the request of the picked kind (usually `host.askChat({ app, windowId, kind, ... })`). */
  ask: (kind: AskChatRequest['kind']) => void
  /** Send selection to chat: "Send output to chat" in Terminal. */
  sendLabel?: string
}

/** Separator, Explain this, Ask chat..., Send selection to chat. */
export function askChatItems(app: string, { hasSelection, ask, sendLabel = 'Send &selection to chat' }: AskChatItemsOptions): MenuItemDef[] {
  return [
    { separator: true },
    { id: `${app}-ctx-explain`, testid: `${app}-ctx-explain`, label: '&Explain this', icon: 'session', disabled: !hasSelection, action: () => ask('explain') },
    { id: `${app}-ctx-ask`, testid: `${app}-ctx-ask`, label: 'Ask &chat...', icon: 'session', action: () => ask('ask') },
    { id: `${app}-ctx-send`, testid: `${app}-ctx-send`, label: sendLabel, icon: 'session', disabled: !hasSelection, action: () => ask('send') }
  ]
}

/** The 1-based line range a selection covers (a selection that ends right after a newline stops on the line before). */
export function selectionLines(text: string, start: number, end: number): { startLine: number; endLine: number } {
  const lo = Math.min(start, end)
  let hi = Math.max(start, end)
  if (hi > lo && text[hi - 1] === '\n') hi -= 1
  const lineAt = (offset: number): number => text.slice(0, offset).split('\n').length
  return { startLine: lineAt(lo), endLine: lineAt(hi) }
}

/** Edit operations of a textarea; they act on the live selection and keep the browser's own undo history. */
export function textareaOps(get: () => HTMLTextAreaElement | null): Required<EditOps> {
  const run = (command: string): void => {
    const area = get()
    if (!area) return
    area.focus()
    document.execCommand(command)
  }
  return {
    undo: () => run('undo'),
    cut: () => run('cut'),
    copy: () => run('copy'),
    delete: () => run('delete'),
    selectAll: () => {
      const area = get()
      area?.focus()
      area?.select()
    },
    paste: () => {
      const area = get()
      if (!area) return
      area.focus()
      void navigator.clipboard.readText().then((text) => {
        if (!text) return
        area.setRangeText(text, area.selectionStart, area.selectionEnd, 'end')
        area.dispatchEvent(new Event('input', { bubbles: true }))
      }, () => {})
    }
  }
}

/** Copies text to the clipboard; failures (no focus, no permission) are ignored. */
export const copyText = (text: string): void => void navigator.clipboard?.writeText(text).catch(() => {})

/** The text as a Markdown quote: every line behind `> `, then a blank line for the reply. */
export const quoteText = (text: string): string => `${text.trim().split(/\r?\n/).map((line) => (line ? `> ${line}` : '>')).join('\n')}\n\n`

export interface TranscriptMenuTarget {
  /** The text of the message under the pointer ('' outside a message). */
  message: string
  /** The first code block of that message. */
  code: string
  quote: (text: string) => void
  copy: (text: string) => void
}

/** Chat transcript: Copy message, Copy code, Quote in reply. */
export function transcriptItems({ message, code, quote, copy }: TranscriptMenuTarget): MenuItemDef[] {
  return [
    { id: 'chat-ctx-copy-message', testid: 'chat-ctx-copy-message', label: 'Copy &message', icon: 'copy', disabled: message === '', action: () => copy(message) },
    { id: 'chat-ctx-copy-code', testid: 'chat-ctx-copy-code', label: 'Copy c&ode', icon: 'file-code', disabled: code === '', action: () => copy(code) },
    { separator: true },
    { id: 'chat-ctx-quote', testid: 'chat-ctx-quote', label: '&Quote in reply', icon: 'session', disabled: message === '', action: () => quote(message) }
  ]
}
