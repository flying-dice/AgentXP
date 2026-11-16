/** Pure helpers of Sticky Notes: colours, geometry and plan notes. */
import type { Bounds, StickyColor, StickyNoteDto } from '@shared/desktop'
import type { TaskDto } from '@shared/models'

export const STICKY_COLORS: readonly StickyColor[] = ['yellow', 'blue', 'green', 'pink', 'purple', 'white']

export const NOTE_THEME: Record<StickyColor, { paper: string; bar: string; border: string; label: string }> = {
  yellow: { paper: '#fff7a8', bar: '#f2e36a', border: '#bfae3c', label: 'Yellow' },
  blue: { paper: '#c4e3f7', bar: '#8fc7ec', border: '#5a97bf', label: 'Blue' },
  green: { paper: '#cdeeb5', bar: '#9ed67e', border: '#6aa04a', label: 'Green' },
  pink: { paper: '#fbc6dd', bar: '#f092bb', border: '#bf5f8a', label: 'Pink' },
  purple: { paper: '#dccbf2', bar: '#b99ae0', border: '#8264b0', label: 'Purple' },
  white: { paper: '#fbfbfb', bar: '#dcdcdc', border: '#9a9a9a', label: 'White' }
}

export const MIN_NOTE = { width: 140, height: 100 }

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

/** A note dragged by (dx, dy): at least its bar stays inside the area. */
export function moveNote(start: Bounds, dx: number, dy: number, area: { width: number; height: number }): Bounds {
  return {
    ...start,
    x: Math.round(clamp(start.x + dx, 40 - start.width, area.width - 40)),
    y: Math.round(clamp(start.y + dy, 0, Math.max(0, area.height - 24)))
  }
}

export function resizeNote(start: Bounds, dx: number, dy: number): Bounds {
  return { ...start, width: Math.round(Math.max(MIN_NOTE.width, start.width + dx)), height: Math.round(Math.max(MIN_NOTE.height, start.height + dy)) }
}

/** The tasks of a plan note in plan order with their checked state. */
export function planItems(tasks: readonly TaskDto[]): { id: number; text: string; done: boolean; active: boolean }[] {
  return [...tasks]
    .sort((a, b) => a.position - b.position)
    .map((t) => ({ id: t.id, text: t.content, done: t.status === 'completed', active: t.status === 'in_progress' }))
}

/** One line for the manager list. */
export function noteTitle(note: Pick<StickyNoteDto, 'text' | 'planSessionId'>, chatTitle?: string): string {
  if (note.planSessionId !== null) return `Plan: ${chatTitle ?? `chat ${note.planSessionId}`}`
  const first = note.text.split('\n').find((l) => l.trim() !== '')?.trim()
  return first ? (first.length > 48 ? `${first.slice(0, 47)}…` : first) : '(empty note)'
}
