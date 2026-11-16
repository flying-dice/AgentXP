/** Pure model of the launcher: state labels, ordering, the drives line, "last used" text and name validation. */
import type { DesktopSummaryDto } from '@shared/vfs'

export type StateTone = 'running' | 'approval' | 'idle' | 'error'

/** The state text of a row: Running, Needs your approval (n), Idle or Error. */
export function stateLabel(d: Pick<DesktopSummaryDto, 'runState' | 'pendingApprovals'>): string {
  switch (d.runState) {
    case 'working':
      return 'Running'
    case 'awaiting_approval':
      return d.pendingApprovals > 0 ? `Needs your approval (${d.pendingApprovals})` : 'Needs your approval'
    case 'error':
      return 'Error'
    case 'idle':
      return 'Idle'
  }
}

export const stateTone = (d: Pick<DesktopSummaryDto, 'runState'>): StateTone =>
  d.runState === 'working' ? 'running' : d.runState === 'awaiting_approval' ? 'approval' : d.runState === 'error' ? 'error' : 'idle'

/** Most recently used first; ties by title. */
export function sortDesktops<T extends Pick<DesktopSummaryDto, 'lastUsedAt' | 'title'>>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt) || a.title.localeCompare(b.title))
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
  if (existing.some((n) => n.trim().toLowerCase() === trimmed.toLowerCase())) return `A desktop named '${trimmed}' already exists.`
  return null
}

/** The warning shown before a desktop is deleted. */
export const DELETE_WARNING = 'Deleting this desktop removes its C: drive, chats, notes and logs. Plugged-in projects are only ejected.'
