/**
 * What an app tells its chat pane. An app calls `useAppContext(host, () => win.id, () => ({ openFile, selection, ... }))` once
 * during initialisation; the shell calls the provider when a prompt is sent from the window's pane (and for the suggestion
 * chips) and adds it to the desktop context as `appContext`, next to the window id, the app and the title.
 */
import type { Id } from '@shared/models'
import type { DesktopHost } from '../types'

export type AppContextProvider = () => Record<string, unknown> | null | undefined

/** Registers `provider` for the window while the app is mounted. Keep it cheap and free of side effects: it runs on demand. */
export function useAppContext(host: DesktopHost, windowId: () => Id, provider: AppContextProvider): void {
  $effect(() => {
    const id = windowId()
    host.setContext(id, provider)
    return () => host.setContext(id, null)
  })
}

/** A selection as the agent should see it: the text cut to `max` characters, with the line range when known. */
export function selectionContext(text: string, range?: { startLine: number; endLine: number } | null, max = 4000): { selection: string; range?: { startLine: number; endLine: number } } | Record<string, never> {
  if (!text.trim()) return {}
  return { selection: text.length > max ? `${text.slice(0, max)}...` : text, ...(range ? { range } : {}) }
}
