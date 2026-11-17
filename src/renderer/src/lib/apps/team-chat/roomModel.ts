import { activityLabel, mentionHandle, type RoomMemberDto } from '@shared/teams'

/** The letter in a member's avatar. */
export const initialOf = (name: string): string => [...name.trim()][0]?.toUpperCase() ?? '?'

/** The text of a mention of a member: `@Name`, with spaces taken out so it is one word. */
export const mentionOf = (name: string): string => `@${name.replace(/\s+/g, '')}`

/** Adds a mention of `name` to the end of what the user is typing (once), with a space after it. */
export function insertMention(text: string, name: string): string {
  const mention = mentionOf(name)
  const has = text.split(/\s+/).some((w) => mentionHandle(w.replace(/^@/, '')) === mentionHandle(name) && w.startsWith('@'))
  if (has) return text
  const sep = text === '' || /\s$/.test(text) ? '' : ' '
  return `${text}${sep}${mention} `
}

/** The line under the messages: who is working ("Coder is thinking…", "Coder and Reviewer are thinking…"), or ''. */
export function workingLine(members: readonly RoomMemberDto[]): string {
  const busy = members.filter((m) => m.activity !== 'idle' && m.activity !== 'error')
  if (busy.length === 0) return ''
  const label = (m: RoomMemberDto): string => activityLabel(m.activity, m.queued) ?? ''
  if (busy.length === 1) return `${busy[0].name} is ${label(busy[0])}`
  const names = busy.map((m) => m.name)
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)} are working`
}

/** Messages are at the end of the room when the scroll position is within a few pixels of the bottom. */
export const nearBottom = (el: { scrollTop: number; clientHeight: number; scrollHeight: number }, slack = 40): boolean => el.scrollHeight - el.scrollTop - el.clientHeight <= slack

/** A time of day for a message ("14:05"). */
export const timeOf = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
