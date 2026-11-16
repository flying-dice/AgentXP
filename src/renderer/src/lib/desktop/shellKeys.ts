import type { AppKind } from '@shared/desktop'

/** Apps whose File menu lists "New chat  Ctrl+N". The other apps keep Ctrl+N for their own "New" (Notepad, WordPad, Paint). */
export const NEW_CHAT_KEY_APPS: readonly AppKind[] = ['code', 'explorer', 'chat']

/** Does Ctrl+N start a new chat? On the desktop (no window has the focus) and in Code, Explorer and Chat. */
export const ctrlNStartsChat = (focusedApp: AppKind | null | undefined): boolean => focusedApp == null || NEW_CHAT_KEY_APPS.includes(focusedApp)

/** Is this keydown Ctrl+N (and no other modifier)? */
export const isCtrlN = (event: Pick<KeyboardEvent, 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey' | 'key'>): boolean =>
  event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey && event.key.toLowerCase() === 'n'
