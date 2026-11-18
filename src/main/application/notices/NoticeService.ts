import type { AppKind, AppWindowState, DesktopState } from '@shared/desktop'
import type { AgentIdentity } from '@shared/identity'
import type { CardChange } from '@shared/kanban'
import type { FileChangeDto, Id, TerminalDto } from '@shared/models'
import { baseName, plural, type NoticeAction, type NoticeDto, type NoticeKind } from '@shared/notices'
import type { AppEventMessage } from '../FanOutEventPublisher'
import type { EventPublisher } from '../ports'
import type { TurnOutcome } from '../SessionService'

export interface NoticeServiceDeps {
  sessions: { get(id: Id): { desktopId?: Id | null } | null }
  /** The session's file changes as they are now (what a turn changed is the difference at its end). */
  changes: { list(sessionId: Id): FileChangeDto[] }
  /** A review comment (its file is named in the notice). */
  comments: { getComment(id: Id): { path: string } | null }
  /** Who the agent of a session is (`agentIdentity`). */
  identity(sessionId: Id): AgentIdentity
  desktops: { state(desktopId: Id): DesktopState; foregroundSessionId(desktopId: Id): Id | null }
  /** Sessions the operator watches besides the foreground chat (the members of the Team Chat room that has the focus). */
  watching?: (desktopId: Id, sessionId: Id) => boolean
  events: EventPublisher
  /** Clock (tests); defaults to the real one. */
  now?: () => Date
}

/** The output apps whose agent tools leave something in the window, and the words of their notice. */
const OUTPUT_APPS: Record<string, { app: AppKind; title: string; did: string; label: string }> = {
  diagrams: { app: 'diagrams', title: 'Diagram updated', did: 'updated the diagram', label: 'Open diagram' },
  paint: { app: 'paint', title: 'Picture updated', did: 'drew in Paint', label: 'Open Paint' },
  wordpad: { app: 'wordpad', title: 'Document updated', did: 'wrote in WordPad', label: 'Open WordPad' }
}

/** The agent tools that are Output in an output app (reads, saves and exports are not). */
const OUTPUT_TOOLS: Record<string, keyof typeof OUTPUT_APPS> = {
  diagram_new: 'diagrams',
  diagram_add: 'diagrams',
  diagram_update: 'diagrams',
  diagram_delete: 'diagrams',
  diagram_arrange: 'diagrams',
  diagram_layout: 'diagrams',
  paint_draw: 'paint',
  paint_clear: 'paint',
  paint_resize: 'paint',
  wordpad_write: 'wordpad'
}

/** What one turn of one session left behind, gathered while it runs. */
interface TurnLog {
  /** The session's changes when the turn started: id -> text, so a change made during the turn stands out. */
  before: Map<Id, string | null>
  latestChanges: FileChangeDto[] | null
  runs: Map<Id, TerminalDto>
  /** Comments added, per review session (the Code Review window they are in). */
  comments: Map<Id, Id[]>
  /** Cards changed, per board, in order (a card once, with its last change). */
  cards: Map<Id, Map<Id, CardChange>>
  outputs: Set<keyof typeof OUTPUT_APPS>
}

const TEST_COMMAND = /\b(test|tests|vitest|jest|pytest|mocha|spec)\b/i
const SHORT_COMMAND = 32

/** "ran tests (passed)", "ran npm run build (failed)", "ran 3 commands (1 failed)"; null when nothing ran. */
export function describeRuns(runs: readonly TerminalDto[]): string | null {
  if (runs.length === 0) return null
  const finished = (t: TerminalDto): boolean => t.exitCode !== null || t.signal !== null
  const failed = (t: TerminalDto): boolean => finished(t) && t.exitCode !== 0
  if (runs.length === 1) {
    const run = runs[0]!
    const line = [run.command, ...run.args].join(' ').trim()
    const label = TEST_COMMAND.test(line) ? 'tests' : line.length > SHORT_COMMAND ? `${line.slice(0, SHORT_COMMAND - 1).trimEnd()}…` : line
    return `ran ${label}${finished(run) ? ` (${failed(run) ? 'failed' : 'passed'})` : ''}`
  }
  const failures = runs.filter(failed).length
  const result = failures > 0 ? ` (${failures} failed)` : runs.every(finished) ? ' (all passed)' : ''
  return `ran ${plural(runs.length, 'command')}${result}`
}

/** "Builder moved card 'Login bug' to Done", "Builder changed 3 cards". */
export function describeCards(name: string, cards: readonly CardChange[]): string {
  if (cards.length !== 1) return `${name} changed ${plural(cards.length, 'card')}`
  const card = cards[0]!
  switch (card.kind) {
    case 'moved':
      return `${name} moved card '${card.title}'${card.column ? ` to ${card.column}` : ''}`
    case 'added':
      return `${name} added card '${card.title}'${card.column ? ` to ${card.column}` : ''}`
    case 'deleted':
      return `${name} deleted card '${card.title}'`
    default:
      return `${name} changed card '${card.title}'`
  }
}

/** The first line of an error, short enough for a balloon. */
const shortError = (text: string): string => {
  const line = text.split('\n')[0]!.trim()
  return line.length > 80 ? `${line.slice(0, 79).trimEnd()}…` : line
}

/**
 * Notices of agent work the operator was not watching (`docs/AGENT_PRESENCE.md`, section 6). While a turn runs it
 * gathers what the turn left behind (file changes, commands, review comments, cards, output in Diagrams, Paint and
 * WordPad); when the turn ends it publishes `desktop.notice` to the session's desktop:
 *
 * - one notice per kind per turn, in outcome words, each with exactly one action that lands on the result;
 * - none for the foreground chat (the operator is watching it), and none for output whose window has the focus (the
 *   window shows it live, with a change cue);
 * - a turn summary ("Builder finished: changed 6 files, ran tests (passed)") for every turn of a chat the operator was
 *   not watching, unless the turn only left output that has its own notice. Its action is **Review changes** when the
 *   turn changed files and ended well, else **Open chat**.
 *
 * Everything is told at the end of the turn: a long turn shows its output live in open windows meanwhile.
 */
export class NoticeService {
  private readonly turns = new Map<Id, TurnLog>()
  private seq = 0

  constructor(private readonly deps: NoticeServiceDeps) {}

  // ---- the turn --------------------------------------------------------------------------------

  turnStarted(sessionId: Id): void {
    const before = new Map(this.deps.changes.list(sessionId).map((c) => [c.id, c.currentText] as const))
    this.turns.set(sessionId, { before, latestChanges: null, runs: new Map(), comments: new Map(), cards: new Map(), outputs: new Set() })
  }

  turnEnded(sessionId: Id, outcome: TurnOutcome): void {
    const log = this.turns.get(sessionId)
    this.turns.delete(sessionId)
    if (!log) return
    const desktopId = this.deps.sessions.get(sessionId)?.desktopId
    if (desktopId == null) return
    if (this.isWatched(desktopId, sessionId)) return
    let state: DesktopState
    try {
      state = this.deps.desktops.state(desktopId)
    } catch {
      return
    }
    const identity = this.deps.identity(sessionId)
    const outputs = this.outputNotices(state, sessionId, identity, log)
    const summary = this.summaryNotice(sessionId, identity, log, outcome, outputs.length > 0)
    for (const notice of summary ? [...outputs, summary] : outputs) this.deps.events.publish('desktop.notice', { ...notice, desktopId, at: (this.deps.now?.() ?? new Date()).toISOString() })
  }

  // ---- what the turn leaves behind --------------------------------------------------------------

  /** The app events the notices are made of (subscribed to the publisher). */
  onEvent(message: AppEventMessage): void {
    switch (message.name) {
      case 'changes.changed': {
        const log = this.turns.get(message.payload.sessionId)
        if (log) log.latestChanges = message.payload.changes
        return
      }
      case 'terminal.changed': {
        const log = this.turns.get(message.payload.sessionId)
        log?.runs.set(message.payload.id, message.payload)
        return
      }
      case 'review.changed': {
        const { by, commentIds, sessionId } = message.payload
        const log = by == null ? undefined : this.turns.get(by)
        if (!log || !commentIds?.length) return
        const known = log.comments.get(sessionId) ?? []
        log.comments.set(sessionId, [...known, ...commentIds.filter((id) => !known.includes(id))])
        return
      }
      case 'kanban.changed': {
        const { by, boardId, cards } = message.payload
        const log = by == null ? undefined : this.turns.get(by)
        if (!log || boardId === undefined || !cards?.length) return
        const board = log.cards.get(boardId) ?? new Map<Id, CardChange>()
        for (const card of cards) {
          const earlier = board.get(card.cardId)
          // A card the turn added stays "added" when it is moved afterwards; it is a new card to the operator.
          board.set(card.cardId, earlier?.kind === 'added' && card.kind !== 'deleted' ? { ...card, kind: 'added' } : card)
        }
        log.cards.set(boardId, board)
        return
      }
      default:
        return
    }
  }

  /** An agent tool finished (the tool service's log): drawing or writing in an output app is output. */
  toolFinished(sessionId: Id, tool: string, failed: boolean): void {
    const app = OUTPUT_TOOLS[tool]
    const log = this.turns.get(sessionId)
    if (!app || !log || failed) return
    log.outputs.add(app)
  }

  // ---- notices ----------------------------------------------------------------------------------

  private isWatched(desktopId: Id, sessionId: Id): boolean {
    if (this.deps.desktops.foregroundSessionId(desktopId) === sessionId) return true
    return this.deps.watching?.(desktopId, sessionId) ?? false
  }

  private notice(kind: NoticeKind, sessionId: Id, identity: AgentIdentity, title: string, text: string, action: Omit<NoticeAction, 'id'>): Omit<NoticeDto, 'desktopId' | 'at'> {
    const id = `notice-${++this.seq}`
    return { id, kind, title, text, identity, sessionId, actions: [{ ...action, id: `${id}-action` }] }
  }

  private outputNotices(state: DesktopState, sessionId: Id, identity: AgentIdentity, log: TurnLog): Omit<NoticeDto, 'desktopId' | 'at'>[] {
    const focused = state.windows.find((w) => w.id === state.focusedWindowId && w.windowState !== 'minimized') ?? null
    const shownLive = (match: (w: AppWindowState) => boolean): boolean => focused !== null && match(focused)
    const notices: Omit<NoticeDto, 'desktopId' | 'at'>[] = []
    for (const [reviewSessionId, ids] of log.comments) {
      if (shownLive((w) => w.view.app === 'code-review' && w.view.sessionId === reviewSessionId)) continue
      const files = [...new Set(ids.map((id) => this.deps.comments.getComment(id)?.path).filter((p): p is string => !!p))]
      const where = files.length === 1 ? ` on ${baseName(files[0]!)}` : files.length > 1 ? ` on ${plural(files.length, 'file')}` : ''
      notices.push(this.notice('review', sessionId, identity, 'New review comments', `${identity.name} left ${plural(ids.length, 'comment')}${where}`, { label: 'Open review', target: { kind: 'review', sessionId: reviewSessionId, commentId: ids[0] } }))
    }
    for (const [boardId, board] of log.cards) {
      if (shownLive((w) => w.view.app === 'kanban' && (w.view.boardId === boardId || w.view.boardId === null))) continue
      const cards = [...board.values()]
      const select = cards.find((c) => c.kind !== 'deleted')
      notices.push(this.notice('board', sessionId, identity, 'Board changed', describeCards(identity.name, cards), { label: 'Open board', target: { kind: 'board', boardId, ...(select ? { cardId: select.cardId } : {}) } }))
    }
    for (const key of log.outputs) {
      const words = OUTPUT_APPS[key]!
      if (shownLive((w) => w.app === words.app)) continue
      const open = state.windows.findLast((w) => w.app === words.app)
      notices.push(this.notice('output', sessionId, identity, words.title, `${identity.name} ${words.did}`, { label: words.label, target: { kind: 'window', app: words.app, ...(open ? { windowId: open.id } : {}) } }))
    }
    return notices
  }

  /** The files the turn changed: rows that are new since it started or whose text moved on. */
  private changedFiles(sessionId: Id, log: TurnLog): FileChangeDto[] {
    const now = log.latestChanges ?? this.deps.changes.list(sessionId)
    return now.filter((c) => !log.before.has(c.id) || log.before.get(c.id) !== c.currentText)
  }

  private summaryNotice(sessionId: Id, identity: AgentIdentity, log: TurnLog, outcome: TurnOutcome, toldOutput: boolean): Omit<NoticeDto, 'desktopId' | 'at'> | null {
    // Stop and Pause are the operator's own doing: nothing to tell.
    if (outcome.stopReason === 'cancelled') return null
    const files = this.changedFiles(sessionId, log)
    const runs = describeRuns([...log.runs.values()])
    const parts = [...(files.length > 0 ? [`changed ${plural(files.length, 'file')}`] : []), ...(runs ? [runs] : [])]
    const name = identity.name
    const open = { label: 'Open chat', target: { kind: 'chat' as const, sessionId } }
    const after = parts.length > 0 ? ` It ${parts.join(', ')}.` : ''
    if (outcome.error !== undefined) return this.notice('summary', sessionId, identity, 'Chat stopped', `${name} stopped with an error: ${shortError(outcome.error)}.${after}`, open)
    if (outcome.stopReason === 'max_tokens' || outcome.stopReason === 'max_turn_requests' || outcome.stopReason === 'refusal') {
      const why = outcome.stopReason === 'refusal' ? 'refused to go on' : outcome.stopReason === 'max_tokens' ? 'stopped: it reached its token limit' : 'stopped: too many steps in one turn'
      return this.notice('summary', sessionId, identity, 'Chat stopped', `${name} ${why}.${after}`, open)
    }
    // A turn that only left output with its own notice (a reviewer's comments, cards) needs no second balloon.
    if (toldOutput && parts.length === 0) return null
    const text = `${name} finished${parts.length > 0 ? `: ${parts.join(', ')}` : ''}`
    const action = files.length > 0 ? { label: 'Review changes', target: { kind: 'changes' as const, sessionId, path: files[0]!.path } } : open
    return this.notice('summary', sessionId, identity, 'Chat finished', text, action)
  }
}
