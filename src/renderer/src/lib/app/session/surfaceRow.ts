import type { A2uiServerMessage, A2uiSurfaceTarget } from '@shared/a2ui'
import { surfaceTitle } from '@shared/a2ui/messages'
import { SURFACE_FALLBACK_TITLE, windowTitle } from '@shared/desktop-views'
import type { SurfaceActivity } from '../../agui/activities'
import type { IconName } from '../../kit/atoms/icons'

/** What the chat row of a surface shows. `state` is Open/Closed for sidebar tabs and windows; inline surfaces are always open. */
export interface SurfaceRowModel {
  surfaceId: string
  title: string
  target: A2uiSurfaceTarget
  state: 'open' | 'closed'
  stateLabel: 'Open' | 'Closed'
  /** "Board: Open": the title and the state in one reading, so the state is never next to a button of the same word. */
  stateText: string
  /** What the surface is for, in a word: a form (it has fields to fill in) or a panel (it only shows things). */
  purpose: 'form' | 'panel'
  /** "The agent opened a form: Your name." */
  intro: string
  /** Where it is, said plainly: "It is in the window 'Your name - from the agent'." Empty for an inline surface (it is in the chat). */
  where: string
  /** The caption of the button that shows the surface: "Open" for a closed one, "Show" for one that is already open. */
  openLabel: 'Open' | 'Show'
  icon: IconName
  /** Inline surfaces have nothing to open or close: they are in the transcript. */
  hasOpenClose: boolean
  /** Open (re)opens, Show brings the open surface to the front; it is never disabled. */
  canOpen: boolean
  canClose: boolean
  /** The places the surface can be moved to (every place but its own). */
  moveTargets: A2uiSurfaceTarget[]
}

export const TARGET_LABELS: Record<A2uiSurfaceTarget, string> = { inline: 'Inline', sidebar: 'Sidebar', window: 'Window' }

const ICONS: Record<A2uiSurfaceTarget, IconName> = { inline: 'properties', sidebar: 'tasks', window: 'computer' }

/** The caption the agent gave the surface (`createSurface.theme.title`), or null. */
export function surfaceCaption(messages: readonly A2uiServerMessage[]): string | null {
  for (const m of messages) if ('createSurface' in m) return surfaceTitle(m.createSurface)
  return null
}

/** The title of a surface in rows and tabs: its caption, else a generic name. */
export const surfaceDisplayTitle = (messages: readonly A2uiServerMessage[]): string => surfaceCaption(messages) ?? SURFACE_FALLBACK_TITLE

/** Components that take what the person types or chooses; a surface with one is a form. */
const INPUT_COMPONENTS = new Set(['TextBox', 'ComboBox', 'CheckBox', 'CheckedListBox', 'RadioButtonGroup', 'NumericUpDown', 'DateTimePicker', 'TrackBar', 'ListBox', 'MonthCalendar'])

/** A form when any of its components takes input, else a panel. */
export function surfacePurpose(messages: readonly A2uiServerMessage[]): 'form' | 'panel' {
  for (const m of messages) {
    if ('updateComponents' in m && m.updateComponents.components.some((c) => INPUT_COMPONENTS.has(c.component))) return 'form'
  }
  return 'panel'
}

/** The model of a surface's chat row. `windowOpen` says whether the surface's window exists right now. */
export function surfaceRowModel(surface: Pick<SurfaceActivity, 'surfaceId' | 'target' | 'hidden' | 'messages'>, windowOpen: boolean): SurfaceRowModel {
  const { target } = surface
  const open = target === 'inline' || (target === 'sidebar' ? !surface.hidden : windowOpen)
  const title = surfaceDisplayTitle(surface.messages)
  const purpose = surfacePurpose(surface.messages)
  const place = target === 'window' ? `window '${windowTitle({ app: 'surface', surfaceId: surface.surfaceId, sessionId: 0, title })}'` : `sidebar '${title}'`
  return {
    surfaceId: surface.surfaceId,
    title,
    target,
    state: open ? 'open' : 'closed',
    stateLabel: open ? 'Open' : 'Closed',
    stateText: `${title}: ${open ? 'Open' : 'Closed'}`,
    purpose,
    intro: `The agent opened a ${purpose}: ${title}.`,
    where: target === 'inline' ? '' : open ? `It is in the ${place}.` : `It is closed. It was in the ${place}.`,
    openLabel: open ? 'Show' : 'Open',
    icon: ICONS[target],
    hasOpenClose: target !== 'inline',
    canOpen: true,
    canClose: open,
    moveTargets: (['inline', 'sidebar', 'window'] as const).filter((t) => t !== target)
  }
}

/** What the chat window offers a surface row (implemented by the Chat app; stories use `noSurfaceControls`). */
export interface SurfaceControls {
  windowOpen(surface: SurfaceActivity): boolean
  open(surface: SurfaceActivity): void
  close(surface: SurfaceActivity): void
  remove(surface: SurfaceActivity): void
  move(surface: SurfaceActivity, target: A2uiSurfaceTarget): void
}

export const noSurfaceControls: SurfaceControls = { windowOpen: () => false, open() {}, close() {}, remove() {}, move() {} }
