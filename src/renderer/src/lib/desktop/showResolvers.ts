/**
 * Where a show or a Browser action is on screen (`docs/AGENT_PRESENCE.md`, section 8): the spot main sends
 * (`ShowSpot`) is resolved to a rectangle in page coordinates, for the agent cursor and the note callout. The DOM part
 * finds the element inside the window frame (`[data-window-id]`); the geometry is pure and tested.
 */
import type { PageBoxDto, ShowSpot } from '@shared/show'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

const rectOf = (r: { left: number; top: number; width: number; height: number }): Rect => ({ x: r.left, y: r.top, width: r.width, height: r.height })

/** The smallest rectangle around all of them (null for none). */
export function unionRect(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null
  const left = Math.min(...rects.map((r) => r.x))
  const top = Math.min(...rects.map((r) => r.y))
  const right = Math.max(...rects.map((r) => r.x + r.width))
  const bottom = Math.max(...rects.map((r) => r.y + r.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** The part of `rect` inside `bounds`; null when they do not overlap. */
export function clipRect(rect: Rect, bounds: Rect): Rect | null {
  const left = Math.max(rect.x, bounds.x)
  const top = Math.max(rect.y, bounds.y)
  const right = Math.min(rect.x + rect.width, bounds.x + bounds.width)
  const bottom = Math.min(rect.y + rect.height, bounds.y + bounds.height)
  if (right <= left || bottom <= top) return null
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** A Browser box (CSS pixels of the page) on screen: offset by the page area of the window, kept inside it. */
export function pageBoxRect(page: Rect, box: PageBoxDto): Rect | null {
  return clipRect({ x: page.x + box.x, y: page.y + box.y, width: box.width, height: box.height }, page)
}

/**
 * Where the tip of the agent cursor lands on a target: a little inside its top-left part, so the arrow points at the
 * start of the lines, the card or the button instead of covering its middle.
 */
export function cursorPoint(target: Rect): Point {
  return { x: Math.round(target.x + Math.min(24, target.width / 2)), y: Math.round(target.y + Math.min(12, target.height / 2)) }
}

export type CalloutSide = 'right' | 'left' | 'below' | 'above'

export interface CalloutPlacement {
  x: number
  y: number
  side: CalloutSide
  /** Where the tail points along the callout's edge (px from its top for right/left, from its left for below/above). */
  tail: number
}

const GAP = 14
const MARGIN = 6

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(value, Math.max(min, max)))

/**
 * Places the note callout beside the target, inside `area` (the desktop above the taskbar): to the right when there is
 * room, else the left, else below, else above; always fully inside, also near an edge, in a maximized window or when the
 * target is bigger than the room left. The tail points at the target.
 */
export function placeCallout(target: Rect, size: { width: number; height: number }, area: Rect): CalloutPlacement {
  const right = area.x + area.width - MARGIN
  const bottom = area.y + area.height - MARGIN
  const left = area.x + MARGIN
  const top = area.y + MARGIN
  const midY = target.y + Math.min(target.height, 40) / 2
  const midX = target.x + Math.min(target.width, 80) / 2
  const fitsRight = target.x + target.width + GAP + size.width <= right
  const fitsLeft = target.x - GAP - size.width >= left
  const fitsBelow = target.y + target.height + GAP + size.height <= bottom
  const fitsAbove = target.y - GAP - size.height >= top
  const side: CalloutSide = fitsRight ? 'right' : fitsLeft ? 'left' : fitsBelow ? 'below' : fitsAbove ? 'above' : 'right'
  let x: number
  let y: number
  if (side === 'right' || side === 'left') {
    x = side === 'right' ? target.x + target.width + GAP : target.x - GAP - size.width
    y = midY - 24
  } else {
    x = midX - 24
    y = side === 'below' ? target.y + target.height + GAP : target.y - GAP - size.height
  }
  // Inside the area whatever happened (a target that fills the screen: the callout sits over its right part).
  x = clamp(x, left, right - size.width)
  y = clamp(y, top, bottom - size.height)
  const tail = side === 'right' || side === 'left' ? clamp(midY - y, 12, size.height - 12) : clamp(midX - x, 12, size.width - 12)
  return { x: Math.round(x), y: Math.round(y), side, tail: Math.round(tail) }
}

/** The start of a glide: the agent's last position, else the middle of its chat (window or pane), else the target itself. */
export function glideStart(last: Point | null, chat: Rect | null, target: Point): Point {
  if (last) return last
  if (chat) return { x: Math.round(chat.x + chat.width / 2), y: Math.round(chat.y + chat.height / 2) }
  return target
}

// ---- DOM ----------------------------------------------------------------------------------------

const escapeAttr = (value: string | number): string => String(value).replace(/["\\]/g, '\\$&')

/** The frame of an app window (not its chat pane, which carries the same `data-window-id`). */
export function windowFrame(root: ParentNode, windowId: number): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-testid^="window-"][data-window-id="${escapeAttr(windowId)}"]`)
}

const visibleRect = (el: Element | null | undefined): Rect | null => {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 ? rectOf(r) : null
}

/**
 * The rectangle of a spot, clipped to its window, or null while it is not on screen yet (the window is still opening,
 * the file is loading, the comment is not scrolled in): the caller tries again on the next frame.
 */
export function resolveSpot(root: ParentNode, spot: ShowSpot): Rect | null {
  const frame = windowFrame(root, spot.windowId)
  const frameRect = visibleRect(frame)
  if (!frame || !frameRect) return null
  const inFrame = (rect: Rect | null): Rect | null => (rect ? clipRect(rect, frameRect) : null)
  switch (spot.kind) {
    case 'window':
      return frameRect
    case 'lines': {
      const editor = frame.querySelector('[data-testid="code-editor"]')
      if (!editor || (editor.getAttribute('data-path') ?? '').toLowerCase() !== spot.path.toLowerCase()) return null
      if (!spot.lines) return inFrame(visibleRect(editor))
      const [first, last] = spot.lines
      const rows = [first, last].map((n) => visibleRect(editor.querySelector(`[data-testid="code-line"][data-line="${n}"]`))).filter((r): r is Rect => r !== null)
      const lines = unionRect(rows)
      const view = visibleRect(editor)
      return lines && view ? inFrame(clipRect(lines, view)) : null
    }
    case 'change': {
      const changes = frame.querySelector('[data-testid="code-changes"]')
      const row = changes?.querySelector(`[data-row-id="${escapeAttr(spot.changeId)}"]`) ?? changes?.querySelector('[aria-selected="true"]')
      return inFrame(visibleRect(row) ?? visibleRect(changes) ?? visibleRect(frame.querySelector('[data-testid="code-editor"]')))
    }
    case 'comment':
      return inFrame(
        visibleRect(frame.querySelector(`[data-testid="review-thread"][data-comment-id="${escapeAttr(spot.commentId)}"]`)) ??
          visibleRect(frame.querySelector(`[data-testid="review-comment-row"][data-comment-id="${escapeAttr(spot.commentId)}"]`))
      )
    case 'card':
      return inFrame(visibleRect(frame.querySelector(`[data-testid="kanban-card"][data-card-id="${escapeAttr(spot.cardId)}"]`)))
    case 'shape':
      return inFrame(visibleRect(frame.querySelector(`[data-shape-id="${escapeAttr(spot.shapeId)}"]`) ?? frame.querySelector(`[data-connector-id="${escapeAttr(spot.shapeId)}"]`)))
    case 'page-box': {
      const page = visibleRect(frame.querySelector('[data-show-page]'))
      return page ? pageBoxRect(page, spot.box) : null
    }
  }
}

/** The chat a session talks in, on screen: its Chat window, else the chat pane of the window it belongs to. */
export function chatRect(root: ParentNode, sessionId: number, windows: readonly { id: number; view: { app: string; sessionId?: number | null }; asideSessionId?: number | null; windowState: string }[]): Rect | null {
  const chat = windows.find((w) => w.view.app === 'chat' && w.view.sessionId === sessionId && w.windowState !== 'minimized')
  if (chat) return visibleRect(windowFrame(root, chat.id))
  const host = windows.find((w) => w.asideSessionId === sessionId && w.windowState !== 'minimized')
  // A team room member: its row in the Team Chat window.
  if (!host) return visibleRect(root.querySelector(`[data-testid="team-chat-member"][data-session-id="${escapeAttr(sessionId)}"]`))
  return visibleRect(root.querySelector(`[data-testid="chat-pane"][data-window-id="${escapeAttr(host.id)}"]`)) ?? visibleRect(windowFrame(root, host.id))
}
