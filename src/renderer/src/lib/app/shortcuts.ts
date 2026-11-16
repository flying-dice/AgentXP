/** Application commands reachable from menus, the tool strip and keyboard shortcuts. */
export type CommandId =
  | 'session.new'
  | 'folder.open'
  | 'transcript.save'
  | 'app.exit'
  | 'edit.undo'
  | 'edit.copyLast'
  | 'edit.clearTranscript'
  | 'view.sessions'
  | 'view.files'
  | 'view.changes'
  | 'view.tasks'
  | 'view.properties'
  | 'session.stop'
  | 'session.compact'
  | 'tools.options'
  | 'help.help'
  | 'help.shortcuts'
  | 'help.about'

export interface Shortcut {
  command: CommandId
  /** `KeyboardEvent.key`, lower case. */
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  /** Shown in menus and the shortcuts dialog, e.g. `Ctrl+Shift+C`. */
  label: string
  description: string
  /** The OS handles this one (Alt+F4); listed but never matched here. */
  native?: boolean
  /** Leave the key alone while a text field has focus (native undo). */
  skipInTextFields?: boolean
}

export const SHORTCUTS: readonly Shortcut[] = [
  { command: 'session.new', key: 'n', ctrl: true, label: 'Ctrl+N', description: 'New session' },
  { command: 'folder.open', key: 'o', ctrl: true, label: 'Ctrl+O', description: 'Open a folder' },
  { command: 'transcript.save', key: 's', ctrl: true, label: 'Ctrl+S', description: 'Save the transcript' },
  { command: 'app.exit', key: 'f4', alt: true, label: 'Alt+F4', description: 'Exit', native: true },
  { command: 'edit.undo', key: 'z', ctrl: true, label: 'Ctrl+Z', description: 'Undo the last edit of the agent', skipInTextFields: true },
  { command: 'edit.copyLast', key: 'c', ctrl: true, shift: true, label: 'Ctrl+Shift+C', description: 'Copy the last response' },
  { command: 'view.sessions', key: '1', ctrl: true, label: 'Ctrl+1', description: 'Show Sessions' },
  { command: 'view.files', key: '2', ctrl: true, label: 'Ctrl+2', description: 'Show Files' },
  { command: 'view.changes', key: '3', ctrl: true, label: 'Ctrl+3', description: 'Show Changes' },
  { command: 'view.tasks', key: '4', ctrl: true, label: 'Ctrl+4', description: 'Show Tasks' },
  { command: 'view.properties', key: '5', ctrl: true, label: 'Ctrl+5', description: 'Show Properties' },
  { command: 'session.stop', key: 'escape', label: 'Esc', description: 'Stop the running turn' },
  { command: 'tools.options', key: ',', ctrl: true, label: 'Ctrl+,', description: 'Options' },
  { command: 'help.help', key: 'f1', label: 'F1', description: 'Open the help' }
]

export const shortcutLabel = (command: CommandId): string => SHORTCUTS.find((s) => s.command === command)?.label ?? ''

export interface KeyLike {
  key: string
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey?: boolean
}

const matches = (s: Shortcut, e: KeyLike): boolean =>
  !s.native &&
  s.key === e.key.toLowerCase() &&
  !!s.ctrl === (e.ctrlKey || !!e.metaKey) &&
  !!s.shift === e.shiftKey &&
  !!s.alt === e.altKey

export function matchShortcut(event: KeyLike, list: readonly Shortcut[] = SHORTCUTS): Shortcut | null {
  return list.find((s) => matches(s, event)) ?? null
}

const isTextField = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

/** A modal dialog or message box is open: commands must not reach the window behind it. */
const modalOpen = (): boolean => !!document.querySelector('[aria-modal="true"]')

/** Installs the global key handler; returns the uninstall function. */
export function installShortcuts(run: (command: CommandId) => void, target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window): () => void {
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) return
    const shortcut = matchShortcut(event)
    if (!shortcut) return
    if (shortcut.skipInTextFields && isTextField(event.target)) return
    if (modalOpen()) return
    event.preventDefault()
    run(shortcut.command)
  }
  target.addEventListener('keydown', onKeydown as EventListener)
  return () => target.removeEventListener('keydown', onKeydown as EventListener)
}
