/** One-time hints of the shell (a balloon the first time). The "already shown" flag lives in the browser's storage. */

const ICON_HINT_KEY = 'agentxp.hint.desktop-icons'

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

const PROJECT_HINT_KEY = 'agentxp.hint.plug-in-project'

/** The first-run balloon of a desktop without a project (UX-164): it names Computer, where Plug in a project is. */
export const PROJECT_HINT = {
  title: 'No project yet',
  text: 'Plug in a project to let the agent work on it: open Computer, then Plug in a project.',
  action: 'Open Computer'
} as const

/** True the first time for this desktop (and remembers it). Same rules as `takeIconHint`, one flag for each desktop. */
export function takeProjectHint(storage: HintStorage | null, desktopId: number): boolean {
  if (!storage) return false
  try {
    const key = `${PROJECT_HINT_KEY}.${desktopId}`
    if (storage.getItem(key)) return false
    storage.setItem(key, '1')
    return true
  } catch {
    return false
  }
}
