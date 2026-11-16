/** One-time hints of the shell (a balloon the first time). The "already shown" flag lives in the browser's storage. */

const ICON_HINT_KEY = 'agent7.hint.desktop-icons'

export const ICON_HINT = { title: 'Welcome to your desktop', text: 'Double-click an icon to open it.' } as const

type HintStorage = Pick<Storage, 'getItem' | 'setItem'>

/** True the first time (and remembers it), false afterwards. A storage that fails counts as "already shown": no nagging. */
export function takeIconHint(storage: HintStorage | null): boolean {
  if (!storage) return false
  try {
    if (storage.getItem(ICON_HINT_KEY)) return false
    storage.setItem(ICON_HINT_KEY, '1')
    return true
  } catch {
    return false
  }
}
