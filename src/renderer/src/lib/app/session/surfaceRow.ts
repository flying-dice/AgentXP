import type { A2uiServerMessage, A2uiSurfaceTarget } from '@shared/a2ui'
import { surfaceTitle } from '@shared/a2ui/messages'
import { SURFACE_FALLBACK_TITLE } from '@shared/desktop-views'
import type { SurfaceActivity } from '../../agui/activities'
import type { IconName } from '../../kit/atoms/icons'

/** What the chat row of a surface shows. `state` is Open/Closed for sidebar tabs and windows; inline surfaces are always open. */
export interface SurfaceRowModel {
  surfaceId: string
  title: string
  target: A2uiSurfaceTarget
  state: 'open' | 'closed'
  stateLabel: 'Open' | 'Closed'
  icon: IconName
  /** Inline surfaces have nothing to open or close: they are in the transcript. */
  hasOpenClose: boolean
  /** Open (re)opens or focuses; it is never disabled for a window (focus), but is for a sidebar tab already shown. */
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

/** The model of a surface's chat row. `windowOpen` says whether the surface's window exists right now. */
export function surfaceRowModel(surface: Pick<SurfaceActivity, 'surfaceId' | 'target' | 'hidden' | 'messages'>, windowOpen: boolean): SurfaceRowModel {
  const { target } = surface
  const open = target === 'inline' || (target === 'sidebar' ? !surface.hidden : windowOpen)
  return {
    surfaceId: surface.surfaceId,
    title: surfaceDisplayTitle(surface.messages),
    target,
    state: open ? 'open' : 'closed',
    stateLabel: open ? 'Open' : 'Closed',
    icon: ICONS[target],
    hasOpenClose: target !== 'inline',
    canOpen: target === 'window' || !open,
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
