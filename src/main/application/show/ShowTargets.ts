import { APP_DISPLAY_NAMES, type AppView, type AppWindowState, type DesktopState, type OpenWindowInput } from '@shared/desktop'
import type { BoardDto } from '@shared/kanban'
import type { FileChangeDto, Id } from '@shared/models'
import { baseName } from '@shared/notices'
import type { ReviewCommentDto } from '@shared/review'
import { showFileLabel, type PageBoxDto, type ShowSpot, type ShowTarget } from '@shared/show'
import type { VPath } from '@shared/vfs'
import { AppError } from '../errors'

/** Who shows and where: the session of the agent and its desktop. */
export interface ShowContext {
  desktopId: Id
  sessionId: Id
}

/** A target that exists, with its paths resolved and its words for the operator. */
export interface CheckedTarget {
  target: ShowTarget
  /** "auth.ts:40-62", "the comment on auth.ts:12", "card 'Login bug'". */
  label: string
}

export interface ShowTargetsDeps {
  desktops: {
    state(desktopId: Id): DesktopState
    presentWindow(sessionId: Id, input: OpenWindowInput & { windowId?: Id }, focus: boolean): Promise<AppWindowState>
    updateView(windowId: Id, view: AppView): void
  }
  /** Resolves a path of the agent (relative to its working directory) to a VPath. */
  paths: { resolve(context: ShowContext, input?: string): VPath }
  /** Whether a path is a file (null: it does not exist). */
  files: { stat(desktopId: Id, path: VPath): Promise<{ kind: 'file' | 'directory' } | null> }
  changes: { list(sessionId: Id): FileChangeDto[] }
  comments: { getComment(id: Id): ReviewCommentDto | null }
  boards: { find(desktopId: Id, ref: number | string): BoardDto }
  /** Asks an app window (Agent Diagrams selects and checks a shape with `show`). */
  requests: { request(desktopId: Id, windowId: Id, method: string, params: unknown, timeoutMs?: number): Promise<unknown> }
  /** The Browser page: what a ref is, and its box once scrolled into view. */
  browser: {
    elementOf(windowId: Id, ref: number): Promise<{ role: string; name: string } | undefined>
    locate(windowId: Id, ref: number): Promise<PageBoxDto>
  }
}

const sameFile = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

/**
 * The targets of `show`: `check` proves a target is there (a stale one is an error and nothing opens) and names it;
 * `land` opens or raises its window and goes to the exact spot, and returns that spot for the agent cursor.
 */
export class ShowTargets {
  constructor(private readonly deps: ShowTargetsDeps) {}

  async check(context: ShowContext, target: ShowTarget): Promise<CheckedTarget> {
    switch (target.kind) {
      case 'file': {
        const path = this.deps.paths.resolve(context, target.path)
        const entry = await this.deps.files.stat(context.desktopId, path)
        if (!entry) throw new AppError(`There is no file ${path}. Nothing was shown.`)
        if (entry.kind !== 'file') throw new AppError(`${path} is a folder, not a file. Nothing was shown.`)
        const lines = target.lines ? ([Math.min(...target.lines), Math.max(...target.lines)] as [number, number]) : undefined
        return { target: { kind: 'file', path, ...(lines ? { lines } : {}) }, label: showFileLabel(path, lines) }
      }
      case 'change': {
        const change = this.changeOf(context, target)
        return { target: { kind: 'change', path: change.path, changeId: change.id }, label: `the change of ${baseName(change.path)}` }
      }
      case 'review-comment': {
        const comment = this.commentOf(context, target.id)
        return { target, label: `the comment on ${baseName(comment.path)}:${comment.lineStart}` }
      }
      case 'card': {
        const { board, card } = this.cardOf(context, target.boardId, target.cardId)
        return { target: { kind: 'card', boardId: board.id, cardId: card.id }, label: `card '${card.title}'` }
      }
      case 'diagram-shape': {
        const window = this.windowOf(context, 'diagrams')
        const answer = (await this.deps.requests.request(context.desktopId, window.id, 'show', { id: target.id, check: true })) as { label?: unknown } | null
        return { target, label: typeof answer?.label === 'string' && answer.label ? answer.label : `the shape ${target.id}` }
      }
      case 'page-element': {
        const window = this.windowOf(context, 'browser')
        const element = await this.deps.browser.elementOf(window.id, target.ref)
        if (!element) throw new AppError(`Element [${target.ref}] is not known on this page. Call browser_read (or browser_find) again to get current refs. Nothing was shown.`)
        return { target, label: element.name ? `the ${element.role} '${element.name}'` : `the ${element.role || 'element'} [${target.ref}]` }
      }
      case 'window':
        return { target, label: `the ${APP_DISPLAY_NAMES[target.app]} window` }
    }
  }

  /** Opens or raises the target's window (with the focus when the operator asked) and goes to the spot. */
  async land(context: ShowContext, checked: CheckedTarget, focus: boolean): Promise<ShowSpot> {
    const { desktopId, sessionId } = context
    const { desktops } = this.deps
    const target = checked.target
    switch (target.kind) {
      case 'file': {
        const window = await desktops.presentWindow(sessionId, { desktopId, app: 'code', path: target.path }, focus)
        const view = this.viewOf(desktopId, window.id, 'code')
        const lines = target.lines ?? null
        desktops.updateView(window.id, {
          ...view,
          tabs: view.tabs.some((t) => sameFile(t, target.path)) ? view.tabs : [...view.tabs, target.path],
          activePath: target.path,
          selection: lines ? { startLine: lines[0], endLine: lines[1] } : null,
          // Exactly the lines: the Code window highlights the range it is told and scrolls it into view.
          visibleLines: lines
        })
        return { kind: 'lines', windowId: window.id, path: target.path, lines }
      }
      case 'change': {
        const change = this.changeOf(context, target)
        const window = await desktops.presentWindow(sessionId, { desktopId, app: 'code', path: change.path }, focus)
        const view = this.viewOf(desktopId, window.id, 'code')
        desktops.updateView(window.id, {
          ...view,
          tabs: view.tabs.some((t) => sameFile(t, change.path)) ? view.tabs : [...view.tabs, change.path],
          activePath: change.path,
          selectedChangeId: change.id
        })
        return { kind: 'change', windowId: window.id, changeId: change.id }
      }
      case 'review-comment': {
        const comment = this.commentOf(context, target.id)
        const open = this.reviewWindowOf(context, comment)
        const window = await desktops.presentWindow(sessionId, { desktopId, app: 'code-review', sessionId: comment.sessionId, windowId: open.id }, focus)
        const view = this.viewOf(desktopId, window.id, 'code-review')
        desktops.updateView(window.id, { ...view, selectedCommentId: comment.id })
        return { kind: 'comment', windowId: window.id, commentId: comment.id }
      }
      case 'card': {
        const { board, card } = this.cardOf(context, target.boardId, target.cardId)
        const window = await desktops.presentWindow(sessionId, { desktopId, app: 'kanban' }, focus)
        desktops.updateView(window.id, { app: 'kanban', boardId: board.id, selectedCardId: card.id })
        return { kind: 'card', windowId: window.id, cardId: card.id }
      }
      case 'diagram-shape': {
        const open = this.windowOf(context, 'diagrams')
        await this.deps.requests.request(desktopId, open.id, 'show', { id: target.id })
        const window = await desktops.presentWindow(sessionId, { desktopId, app: 'diagrams', windowId: open.id }, focus)
        return { kind: 'shape', windowId: window.id, shapeId: target.id }
      }
      case 'page-element': {
        const open = this.windowOf(context, 'browser')
        const window = await desktops.presentWindow(sessionId, { desktopId, app: 'browser', windowId: open.id }, focus)
        const box = await this.deps.browser.locate(window.id, target.ref)
        return { kind: 'page-box', windowId: window.id, box }
      }
      case 'window': {
        const open = desktops.state(desktopId).windows.findLast((w) => w.app === target.app)
        const window = await desktops.presentWindow(sessionId, { desktopId, app: target.app, ...(open ? { windowId: open.id } : {}) }, focus)
        return { kind: 'window', windowId: window.id }
      }
    }
  }

  // ---- lookups ----------------------------------------------------------------------------------

  private changeOf(context: ShowContext, target: Extract<ShowTarget, { kind: 'change' }>): FileChangeDto {
    const changes = this.deps.changes.list(context.sessionId)
    if (target.changeId !== undefined) {
      const byId = changes.find((c) => c.id === target.changeId)
      if (!byId) throw new AppError(`There is no recorded change ${target.changeId} in this chat. Nothing was shown.`)
      return byId
    }
    if (target.path) {
      const path = this.deps.paths.resolve(context, target.path)
      const byPath = changes.findLast((c) => sameFile(c.path, path))
      if (!byPath) throw new AppError(`There is no recorded change for ${path} in this chat. Nothing was shown.`)
      return byPath
    }
    const latest = changes.at(-1)
    if (!latest) throw new AppError('This chat has no recorded changes yet. Nothing was shown.')
    return latest
  }

  private commentOf(context: ShowContext, id: Id): ReviewCommentDto {
    const comment = this.deps.comments.getComment(id)
    if (!comment) throw new AppError(`There is no review comment ${id}. Nothing was shown.`)
    this.reviewWindowOf(context, comment)
    return comment
  }

  private reviewWindowOf(context: ShowContext, comment: ReviewCommentDto): AppWindowState {
    const window = this.deps.desktops.state(context.desktopId).windows.find((w) => w.view.app === 'code-review' && w.view.sessionId === comment.sessionId)
    if (!window) throw new AppError(`The Code Review window of comment ${comment.id} is closed (its comments went with it). Nothing was shown.`)
    return window
  }

  private cardOf(context: ShowContext, boardRef: Id | string, cardId: Id): { board: BoardDto; card: BoardDto['columns'][number]['cards'][number] } {
    const board = this.deps.boards.find(context.desktopId, boardRef)
    const card = board.columns.flatMap((c) => c.cards).find((c) => c.id === cardId)
    if (!card) throw new AppError(`Board '${board.name}' has no card ${cardId}. Call board_get for the current cards. Nothing was shown.`)
    return { board, card }
  }

  private windowOf(context: ShowContext, app: 'diagrams' | 'browser'): AppWindowState {
    const state = this.deps.desktops.state(context.desktopId)
    const window = state.windows.find((w) => w.app === app && w.id === state.focusedWindowId) ?? state.windows.findLast((w) => w.app === app)
    if (!window) throw new AppError(`The ${APP_DISPLAY_NAMES[app]} window is closed. Nothing was shown.`)
    return window
  }

  private viewOf<K extends 'code' | 'code-review'>(desktopId: Id, windowId: Id, app: K): Extract<AppView, { app: K }> {
    const view = this.deps.desktops.state(desktopId).windows.find((w) => w.id === windowId)?.view
    if (view?.app !== app) throw new AppError(`Window ${windowId} is not a ${APP_DISPLAY_NAMES[app]} window.`)
    return view as Extract<AppView, { app: K }>
  }
}
