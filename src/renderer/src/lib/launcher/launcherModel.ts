/** Pure model of the launcher: state labels, ordering, the drives line, "last used" text and name validation. */
import type { DesktopSummaryDto } from '@shared/vfs'

export type StateTone = 'running' | 'approval' | 'idle' | 'error'

/** The state text of a row: Working, Needs your approval (n), The agent could not start, or Idle. */
export function stateLabel(d: Pick<DesktopSummaryDto, 'runState' | 'pendingApprovals'>): string {
  switch (d.runState) {
    case 'working':
      return 'Working'
    case 'awaiting_approval':
      return d.pendingApprovals > 0 ? `Needs your approval (${d.pendingApprovals})` : 'Needs your approval'
    case 'error':
      return 'The agent could not start'
    case 'idle':
      return 'Idle'
  }
}

/** The launcher looks for the agent program of each desktop this often while it is open (milliseconds). */
export const AGENT_CHECK_MS = 30_000

/** Second paragraph of the empty launcher: what the product does. */
export const EMPTY_LAUNCHER_HELP = 'What you can do: plug in a project folder, ask the agent to read or change it, and approve each change yourself.'

/** Title of the launcher's operating system window (it is not the title of a desktop window). */
export const LAUNCHER_WINDOW_TITLE = 'Agent7 Desktop Connection'

/** Title of a desktop's operating system window: the desktop's own name. */
export const desktopWindowTitle = (desktopTitle: string): string => `${desktopTitle.trim() || 'Desktop'} - Agent7`

/** Tooltip of the error state: where to change the agent. */
export const ERROR_HINT = 'Open the desktop, then Control Center > Agents, to change the command.'

/** Status text of a new desktop whose window did not open: what to press next. */
export const READY_TEXT = 'Ready. Click Connect to open it.'

/** The cause of an agent problem in a few words: the stored message without its "The agent could not start." lead. */
export const shortCause = (message: string | null | undefined): string => (message ?? '').replace(/^The agent could not start\.\s*/, '').trim() || 'the agent could not start.'

/**
 * What a row shows for the state: an icon for the two states that need the user, the words, and a tooltip.
 * `ready` marks a desktop that was just created and is not open yet (it says what to press).
 */
export function rowStatus(
  d: Pick<DesktopSummaryDto, 'runState' | 'pendingApprovals'> & { lastError?: string | null; connected?: boolean },
  ready = false
): { label: string; tone: StateTone; icon: 'shield' | 'error' | null; strong: boolean; hint: string } {
  const tone = stateTone(d)
  if (tone === 'idle' && ready && !d.connected) return { label: READY_TEXT, tone, icon: null, strong: false, hint: '' }
  return {
    label: tone === 'error' ? `Agent problem: ${shortCause(d.lastError)}` : stateLabel(d),
    tone,
    icon: tone === 'approval' ? 'shield' : tone === 'error' ? 'error' : null,
    strong: tone === 'approval' || tone === 'error',
    hint: tone === 'error' ? ERROR_HINT : ''
  }
}

/** The row to select when the launcher opens: the first row that needs the user (approval, then an agent problem), else the most recent one. */
export function initialSelection<T extends Pick<DesktopSummaryDto, 'id' | 'runState' | 'lastUsedAt' | 'title'>>(list: readonly T[]): number | null {
  return sortDesktops(list)[0]?.id ?? null
}

export const stateTone = (d: Pick<DesktopSummaryDto, 'runState'>): StateTone =>
  d.runState === 'working' ? 'running' : d.runState === 'awaiting_approval' ? 'approval' : d.runState === 'error' ? 'error' : 'idle'

/** How urgent a row is for the user: 0 waits for an approval, 1 has an agent problem, 2 needs nothing. */
export const attentionRank = (d: Pick<DesktopSummaryDto, 'runState'>): number => (d.runState === 'awaiting_approval' ? 0 : d.runState === 'error' ? 1 : 2)

/** Rows that need the user first (approval, then agent problem), then most recently used first; ties by title. */
export function sortDesktops<T extends Pick<DesktopSummaryDto, 'runState' | 'lastUsedAt' | 'title'>>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => attentionRank(a) - attentionRank(b) || b.lastUsedAt.localeCompare(a.lastUsedAt) || a.title.localeCompare(b.title))
}

/** "E: claude-code-win, F: dotfiles" (only plugged-in projects; C: is always there). */
export function drivesLine(drives: DesktopSummaryDto['drives']): string {
  const usb = drives.filter((d) => d.kind === 'removable').sort((a, b) => a.letter.localeCompare(b.letter))
  return usb.length === 0 ? 'No projects plugged in' : usb.map((d) => `${d.letter}: ${d.label}`).join(', ')
}

const plural = (n: number, unit: string): string => `${n} ${unit}${n === 1 ? '' : 's'} ago`

/** "Just now", "5 minutes ago", "2 hours ago", "3 days ago", else the date. */
export function lastUsedText(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const minutes = Math.floor((now.getTime() - then) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return plural(minutes, 'minute')
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return plural(hours, 'hour')
  const days = Math.floor(hours / 24)
  if (days < 7) return plural(days, 'day')
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** An error message for a desktop name, or null when it is fine. `existing` excludes the desktop being renamed. */
export function validateDesktopName(name: string, existing: readonly string[]): string | null {
  const trimmed = name.trim()
  if (trimmed === '') return 'Type a name for the desktop.'
  if (trimmed.length > 60) return 'The name can have at most 60 characters.'
  if (isTaken(trimmed, existing)) return `A desktop named '${trimmed}' already exists. Each desktop needs its own name so that you can tell them apart.`
  return null
}

const isTaken = (name: string, existing: readonly string[]): boolean => existing.some((n) => n.trim().toLowerCase() === name.trim().toLowerCase())

/** `Fix login redirect (2)`, then `(3)`, ...: the first name based on `name` that no desktop uses. */
export function suggestDesktopName(name: string, existing: readonly string[]): string {
  const base = name.trim().replace(/\s*\(\d+\)$/, '')
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})`
    if (!isTaken(candidate, existing)) return candidate
  }
}

/** The name is taken: the numbered suggestion to offer, else null. */
export const nameSuggestion = (name: string, existing: readonly string[]): string | null => (name.trim() !== '' && isTaken(name, existing) ? suggestDesktopName(name, existing) : null)

/** `Fix login redirect - docs-site`: the name plus the project folder, when that name is free. */
export function projectSuggestion(name: string, project: string | undefined, existing: readonly string[]): string | null {
  const base = name.trim().replace(/\s*\(\d+\)$/, '')
  if (!project?.trim() || base === '' || !isTaken(name, existing)) return null
  const candidate = `${base} - ${project.trim()}`
  return candidate.length <= 60 && !isTaken(candidate, existing) ? candidate : null
}

/** The warning shown before a desktop is deleted. */
export const DELETE_WARNING =
  'Deletes this desktop: its chats, notes and logs. Your project folders stay where they are.'

export type LauncherCommand = 'new' | 'connect' | 'rename' | 'delete'

/** The access keys of the launcher buttons: Alt+N, Alt+C, Alt+R, Alt+D (the letters underlined on the buttons). */
export function accessKeyCommand(key: string): LauncherCommand | null {
  switch (key.toLowerCase()) {
    case 'n':
      return 'new'
    case 'c':
      return 'connect'
    case 'r':
      return 'rename'
    case 'd':
      return 'delete'
    default:
      return null
  }
}

/** Tooltip of the Connect button: what it does and its key. */
export const connectTip = (connected: boolean): string => (connected ? 'Bring the desktop to the front (Alt+C)' : 'Open the selected desktop (Alt+C)')

/** Caption of the Connect button: a connected desktop is brought forward, not opened again. */
export const connectLabel = (connected: boolean): string => (connected ? 'Show desktop' : '&Connect')
